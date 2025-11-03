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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar se quem está chamando é admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin only' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Receber parâmetros
    const { target_user_id, target_phone, new_role } = await req.json();
    
    // Validar role
    const validRoles = ['free', 'student', 'lifetime', 'admin'];
    if (!new_role || !validRoles.includes(new_role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role. Must be: free, student, or admin' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let targetUserId = target_user_id;
    
    // Se não passou user_id, buscar por telefone
    if (!targetUserId && target_phone) {
      const { data: userData } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', target_phone.replace(/\D/g, ''))
        .single();
      
      if (!userData) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      targetUserId = userData.id;
    }

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: 'Must provide either target_user_id or target_phone' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // IMPORTANTE: Remover role antiga ANTES de inserir nova (garante apenas 1 role por usuário)
    const { error: deleteError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', targetUserId);

    if (deleteError) {
      console.error('⚠️ Error deleting old role:', deleteError);
    }

    // Inserir nova role
    const { error: insertError } = await supabase
      .from('user_roles')
      .insert({
        user_id: targetUserId,
        role: new_role
      });

    if (insertError) {
      throw insertError;
    }

    console.log(`✅ User ${targetUserId} role changed to ${new_role} by admin ${user.id}`);

    // Notificar o usuário via Realtime
    try {
      const roleNames = {
        free: 'Free',
        student: 'Aluno',
        lifetime: 'Vitalício',
        admin: 'Admin'
      };

      await supabase
        .from('notifications')
        .insert({
          user_id: targetUserId,
          type: 'role_change',
          title: '🎉 Seu acesso foi atualizado!',
          body: `Você agora é ${roleNames[new_role as keyof typeof roleNames]}! Suas novas permissões estão ativas.`,
          metadata: { new_role, changed_by: user.id }
        });
      
      console.log(`📧 Notificação enviada para ${targetUserId}`);
    } catch (notifError) {
      console.warn('⚠️ Falha ao enviar notificação:', notifError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `User role changed to ${new_role} successfully` 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
