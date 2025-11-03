import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Authenticate the requesting user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify admin role
    const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      throw new Error('Apenas administradores podem deletar usuários');
    }

    // Get target user ID from request
    const { target_user_id } = await req.json();

    if (!target_user_id) {
      throw new Error('target_user_id é obrigatório');
    }

    // Prevent self-deletion
    if (target_user_id === user.id) {
      throw new Error('Você não pode deletar sua própria conta');
    }

    // Delete user (CASCADE will handle related records)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(
      target_user_id
    );

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      throw new Error(`Erro ao deletar usuário: ${deleteError.message}`);
    }

    console.log(`User ${target_user_id} deleted by admin ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Usuário deletado com sucesso'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Delete user error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro ao deletar usuário'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message === 'Unauthorized' ? 401 : 400
      }
    );
  }
});
