import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-event-slug',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { event_slug, user_id, acquisition_metadata } = await req.json();

    console.log('📝 Registrando participante:', { event_slug, user_id, has_utm: !!acquisition_metadata });

    // Verificar se evento existe e está ativo
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('slug', event_slug)
      .eq('is_active', true)
      .single();

    if (eventError || !event) {
      console.error('❌ Evento não encontrado:', eventError);
      return new Response(
        JSON.stringify({ error: 'Evento não encontrado ou inativo' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Verificar se evento está dentro do período
    const now = new Date();
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);

    if (now < startDate || now > endDate) {
      console.error('❌ Evento fora do período:', { now, startDate, endDate });
      return new Response(
        JSON.stringify({ error: 'Evento fora do período de inscrição' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Registrar participante (ou ignorar se já existe)
    const { data: participant, error: participantError } = await supabase
      .from('event_participants')
      .upsert({
        event_slug,
        user_id,
        registered_at: new Date().toISOString(),
        acquisition_metadata: acquisition_metadata || null
      }, {
        onConflict: 'event_slug,user_id',
        ignoreDuplicates: true
      })
      .select()
      .single();

    if (participantError && participantError.code !== '23505') {
      console.error('❌ Erro ao registrar participante:', participantError);
      throw participantError;
    }

    console.log('✅ Participante registrado com sucesso');

    // Enviar notificação de boas-vindas
    try {
      await supabase.from('notifications').insert({
        user_id,
        type: 'event_registration',
        title: `🎉 Bem-vindo ao ${event.name}!`,
        body: event.custom_limit === -1
          ? 'Você tem PRDs ilimitados durante este evento!'
          : `Você tem ${event.custom_limit} PRDs disponíveis durante este evento!`,
        metadata: {
          event_slug,
          event_name: event.name,
          custom_limit: event.custom_limit
        }
      });
    } catch (notifError) {
      console.warn('⚠️ Erro ao enviar notificação:', notifError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        event,
        participant: participant || { event_slug, user_id }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro geral:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Erro desconhecido' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
