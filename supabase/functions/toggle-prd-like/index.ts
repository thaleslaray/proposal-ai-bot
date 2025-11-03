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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { document_id } = await req.json();

    if (!document_id) {
      return new Response(
        JSON.stringify({ error: 'document_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se usuário está tentando curtir próprio PRD
    const { data: document, error: docError } = await supabase
      .from('document_history')
      .select('user_id')
      .eq('id', document_id)
      .single();

    if (docError) {
      console.error('Error fetching document:', docError);
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (document.user_id === user.id) {
      console.log('User attempted to like own PRD:', user.id, document_id);
      return new Response(
        JSON.stringify({ error: 'Você não pode curtir seu próprio PRD' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already liked
    const { data: existing, error: checkError } = await supabase
      .from('prd_likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('document_id', document_id)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking like:', checkError);
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let isLiked = false;

    if (existing) {
      // Unlike: Remove like e decrementa contador
      const { error: deleteError } = await supabase
        .from('prd_likes')
        .delete()
        .eq('id', existing.id);

      if (deleteError) {
        console.error('Error deleting like:', deleteError);
        return new Response(
          JSON.stringify({ error: 'Failed to unlike' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabase.rpc('decrement_likes', { doc_id: document_id });
      isLiked = false;
    } else {
      // Like: Usar UPSERT para evitar race condition e duplicatas
      const { error: insertError } = await supabase
        .from('prd_likes')
        .upsert(
          { user_id: user.id, document_id: document_id },
          { onConflict: 'user_id,document_id', ignoreDuplicates: true }
        );

      if (insertError) {
        // Se der erro e for duplicata (23505), considerar sucesso (race condition)
        if (insertError.code === '23505') {
          console.log('Like already exists (race condition), returning success');
          isLiked = true;
        } else {
          console.error('Error inserting like:', insertError);
          return new Response(
            JSON.stringify({ error: 'Failed to like' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        await supabase.rpc('increment_likes', { doc_id: document_id });
        isLiked = true;
      }
    }

    // Get updated likes count
    const { data: doc } = await supabase
      .from('document_history')
      .select('likes_count')
      .eq('id', document_id)
      .single();

    // Retornar resposta ANTES de enviar notificações (não bloquear)
    const response = new Response(
      JSON.stringify({ 
        success: true, 
        isLiked,
        likesCount: doc?.likes_count || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
    // Enviar notificações de forma assíncrona (não bloqueia resposta)
    if (isLiked) {
      (async () => {
        try {
          const { data: docData } = await supabase
            .from('document_history')
            .select('user_id, idea_preview')
            .eq('id', document_id)
            .single();
          
          if (docData && docData.user_id !== user.id) {
            // Notificação de like (direct insert - more efficient)
            await supabase
              .from('notifications')
              .insert({
                user_id: docData.user_id,
                type: 'like',
                title: '❤️ Novo Like!',
                body: `Seu PRD "${docData.idea_preview}" recebeu um novo like!`,
                metadata: { document_id, liker_id: user.id }
              });
            
            // Verificar marcos (milestones)
            const milestones = [10, 25, 50, 100];
            if (doc && milestones.includes(doc.likes_count)) {
              await supabase
                .from('notifications')
                .insert({
                  user_id: docData.user_id,
                  type: 'milestone',
                  title: `🎉 ${doc.likes_count} Likes!`,
                  body: `Seu PRD "${docData.idea_preview}" alcançou ${doc.likes_count} likes!`,
                  metadata: { document_id, likes_count: doc.likes_count }
                });
            }
          }
        } catch (error) {
          console.error('Error sending notifications:', error);
        }
      })();
    }

    return response;

  } catch (error) {
    console.error('Error in toggle-prd-like:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
