import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DocumentData {
  id: string;
  user_id: string;
  idea_preview: string;
  full_document: string;
  document_length: number;
  created_at: string;
  user_name: string;
  is_featured?: boolean;
  featured_at?: string | null;
  likes_count?: number;
  remixes_count?: number;
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

    console.log('Admin verified, fetching document history...');

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(body.limit || 20, 1000); // Max 1000
    const offset = body.offset || 0;
    const userId = body.user_id; // Filtro opcional por usuário
    const searchTerm = body.search_term; // Busca textual

    // Query otimizada (sem full_document inicialmente, buscar apenas metadados)
    let query = supabaseClient
      .from('document_history')
      .select('id, user_id, idea_preview, full_document, document_length, created_at, is_featured, featured_at, likes_count, remixes_count', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Aplicar filtro por usuário se fornecido
    if (userId) {
      query = query.eq('user_id', userId);
    }

    // Aplicar paginação
    query = query.range(offset, offset + limit - 1);

    const { data: documents, error: docsError, count } = await query;

    if (docsError) {
      console.error('Error fetching documents:', docsError);
      throw docsError;
    }

    console.log(`Found ${documents?.length || 0} documents`);

    // Buscar nomes dos usuários de uma vez (mais eficiente)
    const userIds = [...new Set(documents.map(doc => doc.user_id))];
    
    // Query base de profiles
    let profilesQuery = supabaseClient
      .from('profiles')
      .select('id, name, username')
      .in('id', userIds);

    // Se tem busca textual, filtrar por nome
    if (searchTerm && searchTerm.trim() !== '') {
      profilesQuery = profilesQuery.ilike('name', `%${searchTerm}%`);
    }

    const { data: profiles } = await profilesQuery;

    // Mapear nomes aos documentos e filtrar por busca textual
    let documentsWithNames: DocumentData[] = documents.map(doc => {
      const userProfile = profiles?.find(p => p.id === doc.user_id);
      return {
        ...doc,
        user_name: userProfile?.name || 'Sem nome',
        username: userProfile?.username || null
      };
    });

    // Filtrar por busca textual (idea_preview OU nome do usuário)
    if (searchTerm && searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase();
      documentsWithNames = documentsWithNames.filter(doc => 
        doc.idea_preview?.toLowerCase().includes(searchLower) ||
        doc.user_name?.toLowerCase().includes(searchLower)
      );
    }

    console.log(`Returning ${documentsWithNames.length} documents with user names`);

    return new Response(
      JSON.stringify({ 
        documents: documentsWithNames,
        total: count,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil((count || 0) / limit)
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in get-document-history:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});