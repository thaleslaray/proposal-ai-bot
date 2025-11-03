import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { original_idea } = await req.json();
    
    if (!original_idea || typeof original_idea !== 'string') {
      throw new Error('original_idea é obrigatório');
    }
    
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    console.log('🎯 Gerando título e descrição para:', original_idea.substring(0, 100));

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: `Você é um especialista em criar metadados para produtos digitais.

Retorne um JSON válido com:
{
  "title": "Título do produto (máx 40 caracteres, sem emojis)",
  "description": "Benefício principal ou problema resolvido (máx 120 caracteres)"
}

REGRAS PARA DESCRIÇÃO:
- Evite verbos genéricos: "facilita", "permite", "ajuda", "possibilita"
- Use verbos de ação específicos e diretos
- Foque no resultado concreto ou benefício principal
- Seja específico sobre o valor entregue

Exemplos:
Input: "app para gerenciar finanças pessoais"
Output: {
  "title": "Dashboard Financeiro Pessoal",
  "description": "Controle completo de receitas, despesas e investimentos com relatórios visuais em tempo real."
}

Input: "plataforma de cursos online"
Output: {
  "title": "Plataforma de Cursos Online",
  "description": "Crie, venda e acompanhe o progresso de alunos com gamificação e certificados integrados."
}

Input: "app de delivery de comida"
Output: {
  "title": "App de Delivery Express",
  "description": "Peça comida de restaurantes locais com entrega em até 30 minutos e cashback."
}

Input: "sistema de gestão de tarefas"
Output: {
  "title": "Sistema de Gestão de Projetos",
  "description": "Organize projetos com Kanban, Gantt e relatórios automáticos de produtividade."
}` 
          },
          { 
            role: "user", 
            content: `Extraia título e descrição deste produto:\n\n"${original_idea.substring(0, 300)}"`
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[INTERNAL] OpenAI API error:', response.status, errorText);
      
      return new Response(
        JSON.stringify({ 
          error: 'Não foi possível gerar os metadados. Usando fallback.',
          fallback: true 
        }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    console.log('🔍 [DEBUG] Resposta OpenAI:', JSON.stringify(data, null, 2));

    if (!rawContent || rawContent.trim() === '') {
      console.error('⚠️ OpenAI retornou resposta vazia');
      return new Response(
        JSON.stringify({ 
          error: 'Resposta vazia da OpenAI',
          fallback: true 
        }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse JSON response
    let metadata;
    try {
      metadata = JSON.parse(rawContent);
    } catch (e) {
      console.error('⚠️ Erro ao parsear JSON:', e);
      return new Response(
        JSON.stringify({ 
          error: 'Formato de resposta inválido',
          fallback: true 
        }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    let { title, description } = metadata;

    // Validar e truncar se necessário
    if (!title || title.trim() === '') {
      console.error('⚠️ Título vazio no JSON');
      return new Response(
        JSON.stringify({ 
          error: 'Título vazio',
          fallback: true 
        }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    title = title.trim().replace(/^["']|["']$/g, '');
    if (title.length > 40) {
      title = title.substring(0, 37) + '...';
    }

    description = description?.trim() || '';
    if (description.length > 120) {
      description = description.substring(0, 117) + '...';
    }

    console.log('✅ Metadados gerados:', { title, description });

    return new Response(
      JSON.stringify({ title, description }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
    
  } catch (error) {
    console.error("❌ Erro em extract-prd-metadata:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        fallback: true
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
