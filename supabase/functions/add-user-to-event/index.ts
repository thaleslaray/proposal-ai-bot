import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autenticado');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Token inválido');
    }

    // Verificar se é admin
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roleData || roleData.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas admins podem adicionar usuários a eventos.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { user_ids, event_slug } = await req.json();

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'user_ids é obrigatório e deve ser um array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!event_slug) {
      return new Response(
        JSON.stringify({ error: 'event_slug é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📝 Adicionando usuários ao evento:', { user_ids, event_slug, admin: user.id });

    // Verificar se o evento existe e está ativo
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select('slug, name, is_active')
      .eq('slug', event_slug)
      .single();

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ error: 'Evento não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!event.is_active) {
      return new Response(
        JSON.stringify({ error: 'Evento não está ativo' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar quais usuários já estão no evento
    const { data: existingParticipants } = await supabaseClient
      .from('event_participants')
      .select('user_id')
      .eq('event_slug', event_slug)
      .in('user_id', user_ids);

    const existingIds = new Set(existingParticipants?.map(p => p.user_id) || []);
    const newUserIds = user_ids.filter(id => !existingIds.has(id));
    const skippedCount = user_ids.length - newUserIds.length;

    console.log('📊 Status:', { 
      total: user_ids.length, 
      new: newUserIds.length, 
      skipped: skippedCount 
    });

    let addedCount = 0;
    const errors: string[] = [];

    // Adicionar apenas os novos usuários
    if (newUserIds.length > 0) {
      const participantsToInsert = newUserIds.map(userId => ({
        user_id: userId,
        event_slug: event_slug,
        prds_created: 0,
        points: 0
      }));

      const { data: inserted, error: insertError } = await supabaseClient
        .from('event_participants')
        .insert(participantsToInsert)
        .select();

      if (insertError) {
        console.error('❌ Erro ao inserir participantes:', insertError);
        errors.push(`Erro ao adicionar: ${insertError.message}`);
      } else {
        addedCount = inserted?.length || 0;
        console.log('✅ Participantes adicionados:', addedCount);

        // Enviar notificações para os usuários adicionados
        for (const userId of newUserIds) {
          try {
            await supabaseClient.from('notifications').insert({
              user_id: userId,
              type: 'event_registration',
              title: `Você foi adicionado ao evento: ${event.name}`,
              body: `Um administrador adicionou você ao evento "${event.name}". Boa sorte!`,
              metadata: { event_slug, event_name: event.name }
            });
          } catch (notifError) {
            console.error('⚠️ Erro ao enviar notificação:', notifError);
          }
        }
      }
    }

    const message = [];
    if (addedCount > 0) {
      message.push(`${addedCount} usuário${addedCount > 1 ? 's adicionados' : ' adicionado'}`);
    }
    if (skippedCount > 0) {
      message.push(`${skippedCount} já estava${skippedCount > 1 ? 'm' : ''} no evento`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        added: addedCount,
        skipped: skippedCount,
        message: message.join(', '),
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
