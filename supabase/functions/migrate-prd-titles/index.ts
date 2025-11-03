import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    // Verify admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error('❌ Invalid token:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: isAdmin, error: roleError } = await supabaseAuth.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      console.error('❌ Admin access denied for user:', user.id);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Admin verified:', user.id);

    const { force_remigrate } = await req.json().catch(() => ({}));
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log(`🔄 Iniciando migração de títulos... ${force_remigrate ? '(MODO FORÇADO - TODOS OS PRDs)' : ''}`);

    // Buscar TODOS os PRDs públicos
    const { data: allPrds, error: fetchError } = await supabase
      .from('document_history')
      .select('id, idea_preview, full_document, description')
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw new Error(`Erro ao buscar PRDs: ${fetchError.message}`);
    }

    // Se force_remigrate=true, migra TODOS. Senão, apenas os incompletos
    const prdsToMigrate = force_remigrate 
      ? (allPrds || [])
      : (allPrds?.filter(prd => 
          !prd.description || !prd.idea_preview || prd.idea_preview.length > 50
        ) || []);

    if (!prdsToMigrate || prdsToMigrate.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'Nenhum PRD precisa de migração',
          updated: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Encontrados ${prdsToMigrate.length} PRDs para migrar`);

    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    // Processar em lotes de 10 (rate limit safety)
    for (let i = 0; i < prdsToMigrate.length; i++) {
      const prd = prdsToMigrate[i];
      
      try {
        console.log(`[${i + 1}/${prdsToMigrate.length}] Processando PRD ${prd.id.substring(0, 8)}...`);

        // Usar idea_preview ou extrair do full_document se vazio
        const ideaForTitle = prd.idea_preview || prd.full_document?.substring(0, 500) || 'Sem título';

      // Invocar extract-prd-metadata para cada registro
      const { data: metadataData, error: metadataError } = await supabase.functions.invoke(
        'extract-prd-metadata',
        { body: { original_idea: ideaForTitle } }
      );

      if (metadataError) {
        throw new Error(metadataError.message);
      }

      const newTitle = metadataData?.title;
      const newDescription = metadataData?.description;

      if (!newTitle || metadataData?.fallback) {
        console.warn(`⚠️ Fallback para PRD ${prd.id.substring(0, 8)}`);
        failed++;
        errors.push(`${prd.id}: fallback`);
        continue;
      }

      // Atualizar idea_preview e description com metadados gerados
      const { error: updateError } = await supabase
        .from('document_history')
        .update({ 
          idea_preview: newTitle,
          description: newDescription 
        })
        .eq('id', prd.id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        console.log(`✅ [${i + 1}/${prdsToMigrate.length}] Atualizado: "${newTitle}" | "${newDescription?.substring(0, 40)}..."`);
        updated++;

        // Rate limit safety: delay de 100ms a cada 10 PRDs
        if ((i + 1) % 10 === 0) {
          console.log('⏸️ Aguardando 500ms (rate limit safety)...');
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (error) {
        console.error(`❌ Erro no PRD ${prd.id}:`, error);
        failed++;
        errors.push(`${prd.id}: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
      }
    }

    const result = {
      total: prdsToMigrate.length,
      updated,
      failed,
      success_rate: `${((updated / prdsToMigrate.length) * 100).toFixed(1)}%`,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log('🎯 Migração concluída:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("❌ Erro na migração:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
