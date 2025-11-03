import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation
const validateIdea = (idea: string): { valid: boolean; error?: string } => {
  if (typeof idea !== 'string') {
    return { valid: false, error: 'Ideia deve ser texto' };
  }
  
  const trimmed = idea.trim();
  
  if (trimmed.length < 10) {
    return { valid: false, error: 'Ideia muito curta. Mínimo 10 caracteres.' };
  }
  
  if (trimmed.length > 10000) {
    return { valid: false, error: 'Ideia muito longa. Máximo 10000 caracteres.' };
  }
  
  return { valid: true };
};

// Extract preview from generated document
const extractDescriptionPreview = (document: string): string => {
  // Tentar "Descrição Concisa" primeiro
  const descMatch = document.match(/Descri[çc][ãa]o [Cc]oncisa[:\s]*([^\n]+)/i);
  if (descMatch?.[1]) {
    let preview = descMatch[1].trim();
    // Limitar a 80 caracteres
    if (preview.length > 80) {
      preview = preview.substring(0, 77) + '...';
    }
    return preview;
  }
  
  // Tentar "Nome do Produto"
  const nameMatch = document.match(/Nome do Produto[:\s]*([^\n]+)/i);
  if (nameMatch?.[1]) {
    let preview = nameMatch[1].trim();
    if (preview.length > 80) {
      preview = preview.substring(0, 77) + '...';
    }
    return preview;
  }
  
  // Fallback: primeira frase do documento (até ponto final)
  const firstSentence = document
    .replace(/^#+\s*/gm, '') // Remove headers
    .split('\n')
    .find(line => line.trim().length > 20 && !line.match(/^(Problema|Solução|Funcionalidade)/i))
    ?.split('.')[0];
  
  if (firstSentence) {
    let preview = firstSentence.trim();
    if (preview.length > 80) {
      preview = preview.substring(0, 77) + '...';
    }
    return preview;
  }
  
  return 'Documento sem descrição';
};

// Registrar ação de PRD em evento ativo
async function registerEventAction(
  userId: string, 
  documentId: string, 
  documentLength: number,
  supabase: any
) {
  try {
    // 1. Verificar se usuário está em evento ativo
    const { data: participation } = await supabase
      .from('event_participants')
      .select('event_slug, events!inner(is_active, end_date)')
      .eq('user_id', userId)
      .eq('events.is_active', true)
      .gte('events.end_date', new Date().toISOString())
      .maybeSingle();
    
    if (!participation) {
      console.log('👤 Usuário não está em evento ativo');
      return;
    }
    
    const eventSlug = participation.event_slug;
    console.log(`🎯 Registrando PRD no evento: ${eventSlug}`);
    
    // 2. Calcular pontos (1 ponto por 1KB, máximo 100 pontos)
    const points = Math.min(Math.floor(documentLength / 1000), 100);
    
    // 3. Registrar ação em event_actions
    const { error: actionError } = await supabase
      .from('event_actions')
      .insert({
        event_slug: eventSlug,
        user_id: userId,
        prd_id: documentId,
        action_type: 'create_prd',
        points_earned: points
      });
    
    if (actionError) {
      console.error('❌ Erro ao registrar ação de evento:', actionError);
      return;
    }
    
    // 4. Atualizar contador e pontos do participante
    const { error: statsError } = await supabase.rpc(
      'increment_event_stats',
      {
        p_user_id: userId,
        p_event_slug: eventSlug,
        p_points: points
      }
    );
    
    if (statsError) {
      console.error('❌ Erro ao atualizar stats do evento:', statsError);
    } else {
      console.log(`🎉 Evento ${eventSlug}: +1 PRD, +${points} pontos`);
    }
  } catch (error) {
    console.error('❌ Erro em registerEventAction:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { idea, category, category_metadata } = body;
    
    // Validate input
    const validation = validateIdea(idea);
    if (!validation.valid) {
      console.log('Validation failed:', validation.error);
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const trimmedIdea = idea.trim();
    console.log('Generating PRD for validated idea');

    // RATE LIMITING
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.75.0');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let userId: string | null = null;

    // Tentar extrair user_id do header (opcional)
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id || null;
      } catch (e) {
        console.log('⚠️ Failed to get user, continuing as anonymous');
      }
    }

    // Perfil já foi criado pela edge function de autenticação (verify-whatsapp-otp)
    // Não é mais necessário criar perfil aqui

    // Rate limiting baseado em role
    if (userId) {
      console.log('🔐 Verificando role do usuário:', userId);
      
      // Verificar se é admin
      const { data: isAdminData, error: adminError } = await supabase.rpc('has_role', {
        _user_id: userId,
        _role: 'admin'
      });
      
      if (adminError) {
        console.error('❌ Erro ao verificar role admin:', adminError);
      }
      
      const isAdmin = isAdminData === true;
      
      // Verificar se é student
      const { data: isStudentData, error: studentError } = await supabase.rpc('has_role', {
        _user_id: userId,
        _role: 'student'
      });
      
      if (studentError) {
        console.error('❌ Erro ao verificar role student:', studentError);
      }
      
      const isStudent = isStudentData === true;
      
      // Verificar se é lifetime
      const { data: isLifetimeData, error: lifetimeError } = await supabase.rpc('has_role', {
        _user_id: userId,
        _role: 'lifetime'
      });
      
      if (lifetimeError) {
        console.error('❌ Erro ao verificar role lifetime:', lifetimeError);
      }
      
      const isLifetime = isLifetimeData === true;
      
      console.log(`👤 Roles do usuário - Admin: ${isAdmin}, Lifetime: ${isLifetime}, Student: ${isStudent}`);
      
      // Rate limiting dinâmico baseado em configuração
      console.log('🔐 Verificando limite de PRD para usuário:', userId);
      
      // Buscar limite do usuário via função
      const { data: limitData, error: limitError } = await supabase.rpc('get_prd_limit', {
        _user_id: userId
      });
      
      if (limitError) {
        console.error('❌ Erro ao buscar limite:', limitError);
      }
      
      const dailyLimit = (limitData as number) ?? 1;
      console.log(`📊 Limite diário do usuário: ${dailyLimit === -1 ? 'ILIMITADO' : dailyLimit}`);
      
      // ========================================
      // RATE LIMITING: Verificar limite ANTES (sem incrementar ainda)
      // ========================================
      const { data: currentUsage, error: usageCheckError } = await supabase
        .from('prd_usage_tracking')
        .select('usage_count, usage_date')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (usageCheckError) {
        console.error('❌ Erro ao verificar uso:', usageCheckError);
      }
      
      // Resetar se mudou de dia
      const today = new Date().toISOString().split('T')[0];
      const usageDate = currentUsage?.usage_date;
      const currentCount = (usageDate === today) ? (currentUsage?.usage_count || 0) : 0;
      
      console.log(`📊 Uso atual: ${currentCount}/${dailyLimit === -1 ? 'ILIMITADO' : dailyLimit}`);
      
      // Verificar se atingiu limite (apenas se não for ilimitado)
      if (dailyLimit !== -1 && currentCount >= dailyLimit) {
        const resetTime = new Date();
        resetTime.setDate(resetTime.getDate() + 1);
        resetTime.setHours(0, 0, 0, 0);
        
        console.log(`🚫 Limite atingido: ${currentCount}/${dailyLimit}`);
        
        return new Response(
          JSON.stringify({ 
            error: `⏱️ Limite diário atingido (${currentCount}/${dailyLimit} PRDs). Faça upgrade para ter mais gerações!`,
            resetTime: resetTime.toISOString(),
            limit: dailyLimit,
            currentUsage: currentCount
          }),
          { 
            status: 429, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      console.log(`✅ Rate limit OK: ${currentCount}/${dailyLimit === -1 ? 'ILIMITADO' : dailyLimit}`);
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const systemPrompt = `Você é um especialista em Product Requirements Documents (PRD) e design de produtos digitais. Sua tarefa é analisar ideias de aplicações web e criar documentos de requisitos abrangentes e detalhados.

IMPORTANTE: 
- Gere um PRD completo e autocontido
- Termine o documento IMEDIATAMENTE após "Visão de longo prazo (Fase 3)" do Roadmap
- NÃO adicione seções de Conclusão, Resumo ou Fechamento
- NÃO ofereça serviços adicionais ou sugestões extras no final
- NÃO pergunte se o usuário quer mais alguma coisa
- Mantenha um tom profissional e definitivo até o fim`;

    const userPrompt = `Estou criando uma nova aplicação web e preciso de requisitos abrangentes baseados na ideia abaixo:

${trimmedIdea}

Por favor:

1. Extraia os requisitos funcionais essenciais e as histórias de usuário
2. Organize as ideias em páginas/seções lógicas com uma hierarquia clara
3. Detalhe as animações mencionadas com detalhes técnicos de implementação
4. Sugira padrões de interação premiados que combinem com a vibe descrita
5. Inclua bibliotecas e técnicas de animação específicas (Framer Motion, GSAP, etc.)

Estruture o PRD da seguinte forma:

## Visão Geral do Produto
- Descrição concisa
- Público-alvo
- Proposta de valor única

## Requisitos Funcionais
- Liste todos os requisitos principais
- Priorize usando MoSCoW (Must have, Should have, Could have, Won't have)

## Histórias de Usuário
- Formato: Como [tipo de usuário], eu quero [ação] para [benefício]

## Estrutura de Páginas/Seções
- Hierarquia de navegação
- Wireframes em texto para cada página principal

## Design e Interações
- Paleta de cores sugerida
- Tipografia
- Animações e microinterações
- Bibliotecas recomendadas

## Considerações Técnicas
- Stack tecnológica sugerida
- Integrações necessárias
- Requisitos de performance

## Roadmap Sugerido
- MVP (Fase 1)
- Melhorias futuras (Fase 2)
- Visão de longo prazo (Fase 3)`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_completion_tokens: 16000,
      }),
    });

    if (!response.ok) {
      // Log detailed error server-side only
      const errorText = await response.text();
      console.error('[INTERNAL] OpenAI API error:', response.status, errorText);
      
      // Return generic error to client
      return new Response(
        JSON.stringify({ 
          error: 'Não foi possível gerar o PRD. Tente novamente em alguns instantes.' 
        }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await response.json();
    console.log('OpenAI API full response:', JSON.stringify(data, null, 2));
    console.log('Response structure - choices:', data.choices);
    console.log('Response structure - first choice:', data.choices?.[0]);
    console.log('Response structure - message:', data.choices?.[0]?.message);
    
    const generatedText = data.choices?.[0]?.message?.content;

    if (!generatedText) {
      console.error('Failed to extract content. Full response:', JSON.stringify(data, null, 2));
      throw new Error(`No content in AI response. Response keys: ${Object.keys(data).join(', ')}`);
    }

    console.log('Documento gerado com sucesso');
    
    // Registrar uso com tokens e custo
    if (userId) {
      const usage = data.usage;
      const promptTokens = usage?.prompt_tokens || 0;
      const completionTokens = usage?.completion_tokens || 0;
      const totalTokens = usage?.total_tokens || (promptTokens + completionTokens);
      
      // GPT-5-mini pricing (OpenAI Official): $0.25/1M input, $2.00/1M output
      const inputCost = promptTokens * 0.00000025;  // $0.25 per 1M tokens
      const outputCost = completionTokens * 0.000002; // $2.00 per 1M tokens
      const totalCost = inputCost + outputCost;
      
      console.log(`💰 Custo calculado: $${totalCost.toFixed(6)} (${totalTokens} tokens)`);
      
      const { error: usageError } = await supabase
        .from('api_usage')
        .insert({
          user_id: userId,
          endpoint: 'generate-prd',
          tokens_used: totalTokens,
          cost_usd: totalCost || 0, // Garantir que nunca seja null
          metadata: {
            model: 'gpt-5-mini',
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens
          }
        });
      
      if (usageError) {
        console.error('❌ Erro ao registrar uso na api_usage:', usageError);
      } else {
        console.log('✅ Uso registrado na api_usage com custos');
      }
    }

    // Auto-detectar categoria com keywords mais específicos
    const detectCategory = (text: string): string => {
      const lowerText = text.toLowerCase();
      
      // Ordem importa: mais específico primeiro
      if (/delivery|comida|restaurante|ifood|food|pedido|entrega|refeição|bebida|cardápio/.test(lowerText)) return 'delivery';
      if (/saúde|médico|clínica|telemedicina|hospital|paciente|consulta|exame|prontuário/.test(lowerText)) return 'health';
      if (/educação|aula|escola|curso|professor|aluno|universidade|treinamento|learning|ead/.test(lowerText)) return 'education';
      if (/marketplace|e-commerce|loja|venda|compra|shopping|produto|carrinho/.test(lowerText)) return 'marketplace';
      if (/imóvel|casa|apartamento|aluguel|imobiliária|propriedade|corretor/.test(lowerText)) return 'real_estate';
      if (/financeiro|investimento|banco|pagamento|dinheiro|carteira|crypto|moeda/.test(lowerText)) return 'finance';
      if (/jogo|game|streaming|entretenimento|música|vídeo|diversão|conteúdo/.test(lowerText)) return 'entertainment';
      if (/b2b|empresa|negócio|crm|saas|agência|corporativo|gestão|erp/.test(lowerText)) return 'b2b';
      
      return 'other';
    };

    // Auto-detectar tags
    const detectTags = (text: string): string[] => {
      const tags: string[] = [];
      const lowerText = text.toLowerCase();
      
      if (/mobile|app|android|ios|smartphone/.test(lowerText)) tags.push('mobile');
      if (/web|site|plataforma|dashboard/.test(lowerText)) tags.push('web');
      if (/startup|mvp|inovação/.test(lowerText)) tags.push('startup');
      if (/saas|software.*serviço|assinatura/.test(lowerText)) tags.push('saas');
      if (/ia|inteligência artificial|machine learning/.test(lowerText)) tags.push('ai');
      
      return tags.slice(0, 3);
    };

    // Salvar no histórico de documentos
    if (userId) {
      try {
        // Usar categoria pré-classificada ou fallback
        const finalCategory = category || detectCategory(trimmedIdea);
        const tags = category_metadata?.suggested_tags || detectTags(trimmedIdea);
        
        // Gerar título sintético com OpenAI
        let syntheticTitle = trimmedIdea.substring(0, 150);
        
        try {
          console.log('🎨 Gerando título sintético com OpenAI...');
          
          const titleResponse = await supabase.functions.invoke('extract-prd-metadata', {
            body: { original_idea: trimmedIdea }
          });
          
          if (titleResponse.data?.title && !titleResponse.error) {
            syntheticTitle = titleResponse.data.title;
            console.log('✅ Título sintético gerado:', syntheticTitle);
          } else {
            console.warn('⚠️ Falha ao gerar título, usando fallback:', titleResponse.error);
            syntheticTitle = trimmedIdea.substring(0, 100) || 'Documento sem título';
          }
        } catch (titleError) {
          console.error('❌ Erro ao gerar título sintético:', titleError);
          syntheticTitle = trimmedIdea.substring(0, 100) || 'Documento sem título';
        }
        
        const { data: insertedDoc, error: historyError } = await supabase
          .from('document_history')
          .insert({
            user_id: userId,
            idea_preview: syntheticTitle || trimmedIdea.substring(0, 100) || 'Documento gerado',
            full_document: generatedText,
            document_length: generatedText.length,
            is_public: true,
            category: finalCategory,
            tags: tags,
            category_metadata: category_metadata || {} // NOVO
          })
          .select('id')
          .single();

        if (historyError) {
          console.error('⚠️ Erro ao salvar histórico:', historyError);
        } else {
          console.log('📝 Documento salvo no histórico (público, categoria:', category, ', tags:', tags, ')');
          
          // 🎯 Registrar ação em evento (se participando)
          if (insertedDoc?.id) {
            await registerEventAction(userId, insertedDoc.id, generatedText.length, supabase);
          }
          
          // ✅ INCREMENTAR CONTADOR APENAS APÓS SALVAR COM SUCESSO
          // Buscar limite atual do usuário
          const { data: currentLimitData } = await supabase.rpc('get_prd_limit', {
            _user_id: userId
          });
          const userLimit = (currentLimitData as number) ?? 1;
          
          const { data: usageData, error: usageIncrementError } = await supabase.rpc('check_and_increment_prd_usage', {
            p_user_id: userId,
            p_daily_limit: userLimit
          });
          
          if (usageIncrementError) {
            console.error('⚠️ Erro ao incrementar contador (documento já foi salvo):', usageIncrementError);
          } else {
            console.log('✅ Contador de uso incrementado:', usageData?.[0]?.current_count);
          }
          
          // Calcular badges do usuário após salvar documento
          try {
            await supabase.rpc('calculate_user_badges', { target_user_id: userId });
            console.log('🏆 Badges calculados para o usuário');
          } catch (badgeError) {
            console.error('⚠️ Erro ao calcular badges:', badgeError);
          }
        }
      } catch (error) {
        console.error('⚠️ Erro inesperado ao salvar histórico:', error);
      }
    }

    // Enviar e-mail com o documento (não bloqueia a resposta)
    if (userId) {
      try {
        const { data: { user } } = await supabase.auth.getUser(
          req.headers.get('Authorization')?.replace('Bearer ', '') || ''
        );
        
        if (user?.email) {
          console.log('📧 Enviando documento por e-mail para:', user.email);
          
          // Chamar edge function de envio de e-mail
          supabase.functions.invoke('send-document-email', {
            body: {
              document: generatedText,
              userEmail: user.email,
              userName: user.user_metadata?.name || user.phone || undefined,
            },
          }).then(({ data, error }) => {
            if (error) {
              console.error('❌ Erro ao enviar e-mail:', error);
            } else {
              console.log('✅ E-mail enviado com sucesso:', data);
            }
          }).catch(err => {
            console.error('❌ Erro crítico no envio de e-mail:', err);
          });
        }
      } catch (emailError) {
        console.error('❌ Erro ao processar envio de e-mail:', emailError);
        // Não bloqueia a resposta principal
      }
    }

    return new Response(
      JSON.stringify({ generatedText }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in generate-prd function:', error);
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
