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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Verificar se é admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Apenas admins podem executar ações em lote' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const { event_slug, action, data } = await req.json();

    console.log('🔧 Ação em lote:', { event_slug, action });

    switch (action) {
      case 'start_event_now': {
        // Iniciar evento manualmente
        const now = new Date().toISOString();
        
        await supabase
          .from('events')
          .update({ 
            start_date: now,
            is_active: true 
          })
          .eq('slug', event_slug);

        return new Response(
          JSON.stringify({ success: true, message: 'Evento iniciado manualmente!' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'reset_counters': {
        // Resetar contadores de participantes
        await supabase
          .from('event_participants')
          .update({ prds_created: 0, points: 0 })
          .eq('event_slug', event_slug);

        return new Response(
          JSON.stringify({ success: true, message: 'Contadores resetados' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'send_notification': {
        // Enviar notificação para todos participantes
        const { data: participants } = await supabase
          .from('event_participants')
          .select('user_id')
          .eq('event_slug', event_slug);

        if (participants && participants.length > 0) {
          const notifications = participants.map(p => ({
            user_id: p.user_id,
            type: 'event_announcement',
            title: data.title,
            body: data.body,
            metadata: { event_slug }
          }));

          await supabase.from('notifications').insert(notifications);

          return new Response(
            JSON.stringify({ success: true, message: `Notificação enviada para ${participants.length} participantes` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Nenhum participante encontrado' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'export_data': {
        // Exportar dados do evento em CSV
        const { data: participants } = await supabase
          .from('event_participants')
          .select(`
            user_id,
            prds_created,
            points,
            registered_at,
            profiles!inner(name, email, phone)
          `)
          .eq('event_slug', event_slug)
          .order('points', { ascending: false });

        if (!participants || participants.length === 0) {
          return new Response(
            JSON.stringify({ success: true, csv: '', message: 'Nenhum participante encontrado' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const csvHeader = 'Nome,Email,Telefone,PRDs Criados,Pontos,Data de Inscrição\n';
        const csvRows = participants.map((p: any) => 
          `"${p.profiles.name}","${p.profiles.email || ''}","${p.profiles.phone || ''}",${p.prds_created},${p.points},"${p.registered_at}"`
        ).join('\n');

        const csv = csvHeader + csvRows;

        return new Response(
          JSON.stringify({ success: true, csv }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'end_event': {
        // Encerrar evento
        await supabase
          .from('events')
          .update({ is_active: false })
          .eq('slug', event_slug);

        // Enviar notificação de encerramento
        const { data: participants } = await supabase
          .from('event_participants')
          .select('user_id')
          .eq('event_slug', event_slug);

        if (participants && participants.length > 0) {
          const notifications = participants.map(p => ({
            user_id: p.user_id,
            type: 'event_ended',
            title: '🏁 Evento Encerrado',
            body: 'Obrigado por participar! Seus limites voltaram ao normal.',
            metadata: { event_slug }
          }));

          await supabase.from('notifications').insert(notifications);
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Evento encerrado' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'end_event_with_options': {
        // Encerrar evento com opções de visibilidade
        const { visibility, unpublish_date } = data;
        
        const updateData: any = {
          is_active: false,
          event_visibility: visibility
        };
        
        if (visibility === 'scheduled_removal' && unpublish_date) {
          updateData.unpublish_date = unpublish_date;
        }
        
        await supabase
          .from('events')
          .update(updateData)
          .eq('slug', event_slug);

        // Notificação personalizada baseada na visibilidade
        const notificationBody = visibility === 'hidden' 
          ? 'Evento encerrado e removido da página pública.'
          : 'Evento encerrado. Confira o ranking final!';

        const { data: participants } = await supabase
          .from('event_participants')
          .select('user_id')
          .eq('event_slug', event_slug);

        if (participants && participants.length > 0) {
          const notifications = participants.map(p => ({
            user_id: p.user_id,
            type: 'event_ended',
            title: '🏁 Evento Encerrado',
            body: notificationBody,
            metadata: { event_slug, visibility }
          }));

          await supabase.from('notifications').insert(notifications);
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Evento encerrado com sucesso!' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Ação desconhecida' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }

  } catch (error: any) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Erro desconhecido' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
