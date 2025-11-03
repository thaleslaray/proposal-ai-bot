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

interface AcquisitionRecord {
  id: string;
  user_id: string;
  user_name: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  ref_code: string | null;
  referrer: string | null;
  landing_page: string | null;
  created_at: string;
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

    console.log('Admin verified, fetching acquisition data...');

    // Parse request body para filtros de data
    const body = await req.json().catch(() => ({}));
    const daysAgo = body.days_ago || 30;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    
    console.log('📅 Buscando dados de aquisição:', { daysAgo, startDate: startDate.toISOString() });

    // Buscar dados de aquisição
    const { data: acquisitionData, error: acqError } = await supabaseClient
      .from('user_acquisition')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (acqError) {
      console.error('Erro ao buscar aquisição:', acqError);
      throw acqError;
    }

    const acquisitionUserIds = Array.from(new Set((acquisitionData || []).map(r => r.user_id)));
    
    console.log(`📊 ${acquisitionData?.length || 0} registros encontrados, ${acquisitionUserIds.length} usuários únicos`);

    // Buscar nomes dos usuários
    const { data: profilesData, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, name')
      .in('id', acquisitionUserIds);

    if (profilesError) {
      console.error('Erro ao buscar profiles:', profilesError);
    }
    
    const profileMap = new Map((profilesData || []).map(p => [p.id, p.name]));
    
    // Montar registros com nomes normalizados
    const records: AcquisitionRecord[] = (acquisitionData || []).map(record => {
      const rawName = profileMap.get(record.user_id) || 'Anônimo';
      const normalized = normalizeDisplayName(rawName);
      
      console.log(`🔍 Nome: "${rawName}" → "${normalized}"`);
      
      return {
        id: record.id,
        user_id: record.user_id,
        user_name: normalized,
        utm_source: record.utm_source,
        utm_medium: record.utm_medium,
        utm_campaign: record.utm_campaign,
        utm_term: record.utm_term,
        utm_content: record.utm_content,
        ref_code: record.ref_code,
        referrer: record.referrer,
        landing_page: record.landing_page,
        created_at: record.created_at,
      };
    });

    console.log(`✅ Retornando ${records.length} registros com nomes normalizados`);
    console.log('📦 Primeiros 3 registros:', JSON.stringify(records.slice(0, 3), null, 2));

    return new Response(
      JSON.stringify({ records }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in get-admin-acquisition:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
