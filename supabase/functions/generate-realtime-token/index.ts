import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // VERIFICAR AUTENTICAÇÃO
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('❌ No authorization header');
      return new Response(
        JSON.stringify({ 
          error: 'authentication_required',
          message: 'Você precisa estar logado para acessar o modo secreto'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verificar usuário
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.log('❌ Invalid token');
      return new Response(
        JSON.stringify({ 
          error: 'invalid_token',
          message: 'Token inválido. Faça login novamente.'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // VERIFICAR ROLE (student ou admin)
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['student', 'admin'])
      .single();

    if (roleError || !roleData) {
      console.log(`⚠️ User ${user.id} attempted to access secret mode without permission`);
      
      // Registrar tentativa negada
      await supabaseClient
        .from('api_usage')
        .insert({
          user_id: user.id,
          endpoint: 'realtime-token',
          success: false,
          metadata: { reason: 'forbidden', role_required: 'student' }
        });
      
      return new Response(
        JSON.stringify({ 
          error: 'forbidden',
          message: '🎓 Modo secreto exclusivo para alunos da Escola de Automação!',
          cta: 'Conheça nosso curso de I.A e desbloqueie este recurso.',
          cta_link: 'https://escoladeautomacao.com.br/'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ User ${user.id} has required role: ${roleData.role}`);

    // Log de acesso ao modo secreto
    await supabaseClient
      .from('api_usage')
      .insert({
        user_id: user.id,
        endpoint: 'realtime-token',
        success: true,
        metadata: { role: roleData.role }
      });

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    console.log('Requesting ephemeral token from OpenAI...');

    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "verse",
        instructions: `Você é um assistente conversacional que ajuda pessoas a desenvolverem suas ideias.

## REGRA CRÍTICA DE CONVERSAÇÃO
VOCÊ DEVE TER UMA CONVERSA NATURAL! NÃO é um formulário ou questionário rígido.

- Inicie cumprimentando e perguntando sobre a ideia
- ESCUTE o que o usuário diz e RESPONDA de forma relevante
- Se o usuário fizer uma PERGUNTA, RESPONDA a pergunta dele primeiro!
- Se o usuário mencionar algo específico (como "linear.app" ou "Trello"), RECONHEÇA e comente sobre isso
- Faça UMA pergunta por vez, de forma natural
- Seja amigável, curiosa e engajada
- NUNCA ignore o que o usuário acabou de dizer

## Exemplo de Conversa CORRETA
Usuário: "Você conhece o linear.app?"
Você: "Sim! Conheço o Linear, é uma ferramenta de gestão de projetos bem moderna e rápida. Você quer criar algo inspirado no Linear?"

Usuário: "Quero fazer tipo um Trello mas melhor"
Você: "Legal! Um Trello aprimorado. O que você acha que falta no Trello? O que você quer fazer diferente?"

## Informações a Coletar (naturalmente, durante a conversa)
Durante a conversa natural, colete:
1. O QUE: Qual é a ideia/produto/feature?
2. PARA QUEM: Quem vai usar?
3. POR QUE: Que problema resolve?
4. COMO: Funcionalidades principais?
5. DESIGN: Preferências visuais?

## IMPORTANTE: NÃO preencha a função com "chutes"
- Só chame "finalizar_resumo" quando tiver informações REAIS do usuário
- Se não tiver certeza, pergunte mais
- NUNCA invente ou assuma informações

## Quando Finalizar
Só chame a função quando tiver conversado o suficiente e coletado as 5 informações de forma natural.
Confirme: "Perfeito! Deixa eu organizar tudo que conversamos..."`,
        
        input_audio_transcription: {
          model: "whisper-1",
          language: "pt"
        },
        
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 1000,
          silence_duration_ms: 2000
        },
        
        tools: [
          {
            type: "function",
            name: "finalizar_resumo",
            description: "CALL THIS FUNCTION when you have collected ALL required information. Do NOT write summary as text.",
            parameters: {
              type: "object",
              properties: {
                o_que: { 
                  type: "string", 
                  description: "What is the product/feature idea (e.g. 'Um CRM para imóveis')" 
                },
                para_quem: { 
                  type: "string", 
                  description: "Target audience (e.g. 'Gestores e vendedores de imóveis')" 
                },
                por_que: { 
                  type: "string", 
                  description: "Why it matters / problem solved (e.g. 'Simplificar gestão de clientes')" 
                },
                como: { 
                  type: "string", 
                  description: "How it works / key features (e.g. 'Notificações automatizadas')" 
                },
                design: { 
                  type: "string", 
                  description: "Design preferences (e.g. 'Clean, cores claras')" 
                }
              },
              required: ["o_que", "para_quem", "por_que", "como", "design"],
              additionalProperties: false
            }
          }
        ],
        tool_choice: "auto"
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Session created successfully:", data);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
