import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.14";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Configuração do Supabase inválida" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { dryRun = false, category = null, limit = 20, offset = 0 } = await req.json().catch(() => ({}));

    console.log(`🔄 Iniciando re-categorização (dryRun: ${dryRun}, filter: ${category || 'all'}, limit: ${limit}, offset: ${offset})`);

    // 1. Buscar PRDs públicos
    let query = supabase
      .from('document_history')
      .select('id, idea_preview, description, category')
      .eq('is_public', true)
      .range(offset, offset + limit - 1);

    if (category) {
      query = query.eq('category', category);
    }

    const { data: prds, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Erro ao buscar PRDs: ${fetchError.message}`);
    }

    if (!prds || prds.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'Nenhum PRD encontrado para re-categorizar',
          total: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📂 ${prds.length} PRDs encontrados`);

    const results = {
      total: prds.length,
      processed: 0,
      modified: 0,
      failed: 0,
      changes: {} as Record<string, number>, // Ex: { "delivery → ai_automation": 3 }
      errors: [] as string[],
      dryRun
    };

    // 2. Processar cada PRD
    for (const prd of prds) {
      try {
        // Construir contexto rico: idea_preview + descrição completa
        const fullContext = `${prd.idea_preview || ''}\n\n${prd.description || ''}`.trim();
        
        if (!fullContext || fullContext.length < 20) {
          console.warn(`⚠️ PRD ${prd.id}: contexto insuficiente, pulando`);
          results.failed++;
          continue;
        }

        console.log(`📝 PRD ${prd.id}: enviando ${fullContext.length} caracteres de contexto`);

        // Chamar categorize-idea com contexto completo
        const categorizeResponse = await supabase.functions.invoke('categorize-idea', {
          body: { idea: fullContext }
        });

        if (categorizeResponse.error) {
          throw new Error(categorizeResponse.error.message);
        }

        const { category: newCategory, confidence } = categorizeResponse.data;

        // Se categoria mudou
        if (newCategory !== prd.category) {
          const changeKey = `${prd.category} → ${newCategory}`;
          results.changes[changeKey] = (results.changes[changeKey] || 0) + 1;
          results.modified++;

          console.log(`✏️ PRD ${prd.id}: ${changeKey} (confiança: ${confidence})`);

          // Atualizar no banco (se não for dry run)
          if (!dryRun) {
            const { error: updateError } = await supabase
              .from('document_history')
              .update({ category: newCategory })
              .eq('id', prd.id);

            if (updateError) {
              throw new Error(`Erro ao atualizar: ${updateError.message}`);
            }
          }
        } else {
          console.log(`✅ PRD ${prd.id}: categoria já correta (${prd.category})`);
        }

        results.processed++;

      } catch (error) {
        console.error(`❌ Erro ao processar PRD ${prd.id}:`, error);
        results.failed++;
        results.errors.push(`PRD ${prd.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 3. Retornar relatório
    const report = {
      ...results,
      message: dryRun 
        ? '🔍 Simulação concluída (nenhuma mudança foi salva)'
        : '✅ Re-categorização concluída',
      summary: {
        unchanged: results.processed - results.modified,
        changed: results.modified,
        failed: results.failed
      }
    };

    console.log('📊 Relatório final:', report);

    return new Response(
      JSON.stringify(report),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro crítico:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
