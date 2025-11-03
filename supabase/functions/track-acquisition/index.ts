import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Edge Function: track-acquisition
 * 
 * Salva ou atualiza dados de aquisição (UTM params) para usuários existentes.
 * Permite rastrear re-engajamento e novas campanhas após cadastro inicial.
 * 
 * Body:
 * - user_id: UUID do usuário
 * - utm_params: { utm_source?, utm_medium?, utm_campaign?, utm_term?, utm_content?, ref_code?, referrer?, landing_page?, fbclid?, gclid? }
 * 
 * Lógica:
 * - Se não existe registro: insere novo
 * - Se existe e UTM é diferente: atualiza (nova campanha)
 * - Se existe e UTM é igual: ignora (não duplica)
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id, utm_params } = await req.json();

    if (!user_id || !utm_params) {
      return new Response(
        JSON.stringify({ error: 'user_id e utm_params são obrigatórios' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('📊 Rastreando aquisição:', { user_id, utm_params });

    // Verificar se já existe registro de aquisição
    const { data: existing, error: fetchError } = await supabase
      .from('user_acquisition')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    if (fetchError) {
      console.error('❌ Erro ao buscar aquisição existente:', fetchError);
      throw fetchError;
    }

    // Se não existe, criar novo registro
    if (!existing) {
      const { error: insertError } = await supabase
        .from('user_acquisition')
        .insert({
          user_id,
          utm_source: utm_params.utm_source || null,
          utm_medium: utm_params.utm_medium || null,
          utm_campaign: utm_params.utm_campaign || null,
          utm_term: utm_params.utm_term || null,
          utm_content: utm_params.utm_content || null,
          ref_code: utm_params.ref_code || null,
          referrer: utm_params.referrer || null,
          landing_page: utm_params.landing_page || null,
        });

      if (insertError) {
        console.error('❌ Erro ao inserir aquisição:', insertError);
        throw insertError;
      }

      console.log('✅ Aquisição registrada para usuário existente');
      return new Response(
        JSON.stringify({ success: true, action: 'created' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se existe mas UTM é diferente (nova campanha), atualizar
    const isDifferent = 
      existing.utm_source !== utm_params.utm_source ||
      existing.utm_campaign !== utm_params.utm_campaign;

    if (isDifferent) {
      const { error: updateError } = await supabase
        .from('user_acquisition')
        .update({
          utm_source: utm_params.utm_source || existing.utm_source,
          utm_medium: utm_params.utm_medium || existing.utm_medium,
          utm_campaign: utm_params.utm_campaign || existing.utm_campaign,
          utm_term: utm_params.utm_term || existing.utm_term,
          utm_content: utm_params.utm_content || existing.utm_content,
          ref_code: utm_params.ref_code || existing.ref_code,
          referrer: utm_params.referrer || existing.referrer,
          landing_page: utm_params.landing_page || existing.landing_page,
        })
        .eq('user_id', user_id);

      if (updateError) {
        console.error('❌ Erro ao atualizar aquisição:', updateError);
        throw updateError;
      }

      console.log('✅ Aquisição atualizada (nova campanha detectada)');
      return new Response(
        JSON.stringify({ success: true, action: 'updated' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('ℹ️ Aquisição já existe e é idêntica, nenhuma ação necessária');
    return new Response(
      JSON.stringify({ success: true, action: 'skipped' }),
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
