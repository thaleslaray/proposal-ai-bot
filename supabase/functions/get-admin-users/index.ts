import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para normalizar nomes (mesma lógica do frontend)
function normalizeDisplayName(fullName: string): string {
  if (!fullName || fullName.trim() === '' || fullName === 'Anônimo') {
    return fullName || 'Anônimo';
  }

  const words = fullName.trim().replace(/\s+/g, ' ').split(' ');
  
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
  }

  const firstName = words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
  const lastName = words[words.length - 1].charAt(0).toUpperCase() + words[words.length - 1].slice(1).toLowerCase();
  
  return `${firstName} ${lastName}`;
}

interface UserData {
  id: string;
  phone: string;
  name: string;
  email: string;
  role: string;
  docCount: number;
  productName: string | null;
  updated_at: string;
  utm_source: string | null;
  ref_code: string | null;
  created_at: string;
  last_doc_at: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || roleData?.role !== 'admin') {
      console.error('Not admin:', roleError);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin verified, fetching users...');

    // Parse request body para paginação e busca
    const body = await req.json().catch(() => ({}));
    const search = body.search?.toLowerCase().trim() || '';
    const limit = Math.min(body.limit || 20, 100);
    const offset = body.offset || 0;
    const eventSlug = body.event_slug || null;
    const sourceFilter = body.source_filter || null;
    const roleFilter = body.role_filter || null;
    
    console.log('🔍 Filtros recebidos no backend:', { 
      eventSlug,
      sourceFilter,
      roleFilter,
      search, 
      limit, 
      offset,
      rawBody: body 
    });

    // OTIMIZAÇÃO: Query única com JOINs para buscar tudo de uma vez
    // Usar LEFT JOINs para garantir que usuários sem roles/docs/cache apareçam
    const { data: combinedData, error: queryError } = await supabaseClient.rpc('get_users_with_details', {
      search_term: search,
      limit_count: limit,
      offset_count: offset,
      event_filter: eventSlug,
      source_filter: sourceFilter,
      role_filter: roleFilter
    });

    // Se a função RPC não existir, fallback para método anterior
    if (queryError?.code === '42883') {
      console.log('Function get_users_with_details not found, using auth.admin fallback');
      
      // Buscar usuários do auth
      const { data: { users: authUsers }, error: usersError } = await supabaseClient.auth.admin.listUsers({
        page: Math.floor(offset / limit) + 1,
        perPage: limit
      });

      if (usersError) throw usersError;

      const userIds = authUsers.map(u => u.id);

      // Fazer queries em paralelo
      const [profilesRes, rolesRes, docCountsRes, hotmartRes, acquisitionRes] = await Promise.all([
        supabaseClient.from('profiles').select('*').in('id', userIds),
        supabaseClient.from('user_roles').select('*').in('user_id', userIds),
        supabaseClient.from('document_history').select('user_id').in('user_id', userIds),
        supabaseClient.from('hotmart_validation_cache')
          .select('user_id, product_name')
          .in('user_id', userIds)
          .eq('has_access', true),
        supabaseClient.from('user_acquisition')
          .select('user_id, utm_source, ref_code, created_at')
          .in('user_id', userIds)
          .order('created_at', { ascending: false })
      ]);

      // Mapear dados
      const profileMap = new Map(profilesRes.data?.map(p => [p.id, p]) || []);
      const roleMap = new Map(rolesRes.data?.map(r => [r.user_id, r.role]) || []);
      const docCountMap = new Map<string, number>();
      docCountsRes.data?.forEach(d => docCountMap.set(d.user_id, (docCountMap.get(d.user_id) || 0) + 1));
      const productMap = new Map(hotmartRes.data?.map(h => [h.user_id, h.product_name]) || []);
      
      // Pegar primeiro registro de aquisição para cada usuário (mais recente)
      const acquisitionMap = new Map();
      acquisitionRes.data?.forEach(acq => {
        if (!acquisitionMap.has(acq.user_id)) {
          acquisitionMap.set(acq.user_id, { utm_source: acq.utm_source, ref_code: acq.ref_code });
        }
      });

      const users: UserData[] = authUsers
        .filter(authUser => {
          if (!search) return true;
          const profile = profileMap.get(authUser.id);
          return (
            profile?.name?.toLowerCase().includes(search) ||
            profile?.email?.toLowerCase().includes(search) ||
            authUser.email?.toLowerCase().includes(search) ||
            authUser.phone?.toLowerCase().includes(search)
          );
        })
        .map(authUser => {
          const profile = profileMap.get(authUser.id);
          const acquisition = acquisitionMap.get(authUser.id);
          return {
            id: authUser.id,
            phone: authUser.phone || profile?.phone || '',
            name: normalizeDisplayName(profile?.name || authUser.user_metadata?.name || ''),
            email: profile?.email || authUser.email || '',
            role: roleMap.get(authUser.id) || 'free',
            docCount: docCountMap.get(authUser.id) || 0,
            productName: productMap.get(authUser.id) || null,
            updated_at: authUser.updated_at || profile?.updated_at || authUser.created_at,
            utm_source: acquisition?.utm_source || null,
            ref_code: acquisition?.ref_code || null,
            created_at: authUser.created_at || new Date().toISOString(),
            last_doc_at: null,
          };
        });

      console.log(`Returning ${users.length} users (fallback method)`);

      return new Response(
        JSON.stringify({
          users,
          total: users.length,
          page: Math.floor(offset / limit) + 1,
          totalPages: Math.ceil(users.length / limit),
          isSearchResult: !!search
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (queryError) {
      console.error('Error fetching combined data:', queryError);
      throw queryError;
    }

    const users: UserData[] = (combinedData || []).map((row: any) => ({
      id: row.user_id,
      phone: row.phone || '',
      name: row.name || '',
      email: row.email || '',
      role: row.role || 'free',
      docCount: parseInt(row.doc_count || '0'),
      productName: row.product_name || null,
      updated_at: row.updated_at || new Date().toISOString(),
      utm_source: row.utm_source || null,
      ref_code: row.ref_code || null,
      created_at: row.created_at || new Date().toISOString(),
      last_doc_at: row.last_doc_at || null,
    }));

    console.log(`Returning ${users.length} users with complete data`);

    // Calcular paginação
    const totalUsers = users.length < limit ? offset + users.length : offset + limit + 1;
    
    return new Response(
      JSON.stringify({
        users,
        total: totalUsers,
        page: Math.floor(offset / limit) + 1,
        totalPages: users.length < limit ? Math.floor(offset / limit) + 1 : Math.floor(offset / limit) + 2,
        isSearchResult: !!search
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in get-admin-users:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});