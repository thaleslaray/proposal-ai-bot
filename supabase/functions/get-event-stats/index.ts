import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { event_slug } = await req.json();

    if (!event_slug) {
      return new Response(
        JSON.stringify({ error: 'event_slug é obrigatório' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('📊 Obtendo stats do evento:', event_slug);

    // Buscar dados do evento
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('slug', event_slug)
      .single();

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ error: 'Evento não encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Total de participantes
    const { count: totalParticipants } = await supabase
      .from('event_participants')
      .select('*', { count: 'exact', head: true })
      .eq('event_slug', event_slug);

    // Total de PRDs criados
    const { count: totalPRDs } = await supabase
      .from('event_actions')
      .select('*', { count: 'exact', head: true })
      .eq('event_slug', event_slug)
      .eq('action_type', 'create_prd');

    // PRDs na última hora
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: prdsLastHour } = await supabase
      .from('event_actions')
      .select('*', { count: 'exact', head: true })
      .eq('event_slug', event_slug)
      .eq('action_type', 'create_prd')
      .gte('created_at', oneHourAgo);

    // Top 10 Leaderboard
    const { data: leaderboard } = await supabase
      .from('event_participants')
      .select(`
        user_id,
        prds_created,
        points,
        profiles!inner(name, avatar_url, username)
      `)
      .eq('event_slug', event_slug)
      .order('points', { ascending: false })
      .order('prds_created', { ascending: false })
      .order('registered_at', { ascending: true })
      .limit(10);

    // Últimos PRDs criados (feed)
    const { data: recentPRDs, error: recentError } = await supabase
      .from('event_actions')
      .select(`
        id,
        action_type,
        created_at,
        points_earned,
        user_id,
        profiles!event_actions_user_id_fkey(name, avatar_url, username),
        document_history!event_actions_prd_id_fkey(id, description, idea_preview)
      `)
      .eq('event_slug', event_slug)
      .eq('action_type', 'create_prd')
      .order('created_at', { ascending: false })
      .limit(20);

    if (recentError) {
      console.error('❌ Erro ao buscar PRDs recentes:', recentError);
    }

    // Gráfico de atividades por hora (últimas 24h)
    const { data: hourlyActivity } = await supabase
      .from('event_actions')
      .select('created_at')
      .eq('event_slug', event_slug)
      .eq('action_type', 'create_prd')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true });

    // Agrupar por hora
    const hourlyGroups: Record<string, number> = {};
    hourlyActivity?.forEach(action => {
      const hour = new Date(action.created_at).toISOString().slice(0, 13);
      hourlyGroups[hour] = (hourlyGroups[hour] || 0) + 1;
    });

    const activityChart = Object.entries(hourlyGroups).map(([hour, count]) => ({
      hour,
      count
    }));

    console.log('✅ Stats obtidas com sucesso');

    return new Response(
      JSON.stringify({
        event,
        stats: {
          totalParticipants: totalParticipants || 0,
          totalPRDs: totalPRDs || 0,
          prdsLastHour: prdsLastHour || 0
        },
        leaderboard: leaderboard || [],
        recentPRDs: recentPRDs || [],
        activityChart
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Erro desconhecido' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
