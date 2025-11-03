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
    const { idea } = await req.json();
    
    if (!idea || idea.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: 'Ideia muito curta (mínimo 10 caracteres)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const systemPrompt = `Você é um especialista em classificação de produtos digitais. Analise o CORE BUSINESS (fonte principal de receita), ignore features secundárias.

**CATEGORIAS:**
- education: Cursos, LMS, ensino
- marketplace: E-commerce, lojas
- content: Redes sociais, streaming
- productivity: Tarefas, notas, projetos
- health: Fitness, telemedicina
- finance: Bancos, investimentos, controle financeiro
- delivery: APENAS delivery de restaurantes/comida
- crm_business: CRM, B2B, gestão empresarial
- real_estate: Imóveis, aluguéis
- utilities: Dashboards, calculadoras, compliance
- ai_automation: Produto principal É a IA (chatbots, agentes)
- other: Logística B2B, frotas, transporte de mercadorias

**REGRAS:**
1. "Delivery" = SÓ restaurantes (iFood, Rappi). Logística → other
2. IA como feature (ex: "CRM com IA") → categorize pelo core (crm_business)
3. IA como produto (ex: "Chatbot") → ai_automation
4. Finanças/CRM > automação genérica

**EXEMPLOS RÁPIDOS:**
- "SimplifiQA automação financeira" → finance (core = finanças)
- "CRM para delivery de sanduíches" → delivery (core = restaurante)
- "Contratos B2B com IA" → crm_business (core = gestão B2B)
- "Chatbot atendimento" → ai_automation (IA é o produto)
- "Frotas de caminhões" → other (logística B2B)

Retorne JSON: {"category":"...", "confidence":0.0-1.0, "reasoning":"...", "suggested_tags":["..."]}`;

    const userPrompt = `Classifique esta ideia:

${idea.trim()}

Responda APENAS com JSON válido (sem texto extra):
{"category":"...", "confidence":0.0-1.0, "reasoning":"...", "suggested_tags":["..."]}`;

    console.log('🤖 Chamando OpenAI para categorização...');

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
        response_format: { type: "json_object" },
        max_completion_tokens: 800
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CATEGORIZE] OpenAI error:', response.status, errorText);
      
      // FALLBACK: Categorização por regex
      const fallbackCategory = detectCategoryFallback(idea);
      console.warn('⚠️ Usando fallback regex, categoria:', fallbackCategory);
      
      return new Response(
        JSON.stringify({
          category: fallbackCategory,
          confidence: 0.5,
          reasoning: 'Classificação automática (fallback por erro na API)',
          suggested_tags: [],
          fallback: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    // Log resposta completa para debug
    if (!content) {
      console.error('[CATEGORIZE] No content in response, full data:', JSON.stringify(data));
      const fallbackCategory = detectCategoryFallback(idea);
      
      return new Response(
        JSON.stringify({
          category: fallbackCategory,
          confidence: 0.5,
          reasoning: 'Classificação automática (fallback - sem resposta do modelo)',
          suggested_tags: [],
          fallback: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = JSON.parse(content);
    
    // Log custos (mesmo padrão do generate-prd)
    const usage = data.usage;
    const promptTokens = usage?.prompt_tokens || 0;
    const completionTokens = usage?.completion_tokens || 0;
    const totalTokens = promptTokens + completionTokens;
    
    // GPT-5-mini pricing (OpenAI Official): $0.15/1M input, $0.60/1M output
    const inputCost = promptTokens * 0.00000015;  // $0.15 per 1M tokens
    const outputCost = completionTokens * 0.0000006; // $0.60 per 1M tokens
    const totalCost = inputCost + outputCost;
    
    console.log(`💰 Categorização: $${totalCost.toFixed(6)} | Tokens: ${totalTokens} (${promptTokens} in + ${completionTokens} out)`);
    console.log(`📂 Categoria detectada: ${result.category} (confiança: ${result.confidence})`);
    
    return new Response(
      JSON.stringify({
        ...result,
        fallback: false,
        classified_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in categorize-idea:', error);
    
    // Fallback em caso de erro crítico
    return new Response(
      JSON.stringify({
        category: 'other',
        confidence: 0.3,
        reasoning: 'Erro na categorização automática',
        suggested_tags: [],
        fallback: true,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Função fallback com regex melhorada (ordem: específico → genérico)
function detectCategoryFallback(idea: string): string {
  const lower = idea.toLowerCase();
  
  // 1. DELIVERY: APENAS delivery de comida (muito específico)
  if (/(ifood|uber eats|rappi|99food|delivery.*comida|delivery.*restaurante|pedir.*comida|pedido.*restaurante|app.*restaurante)/i.test(lower)) {
    return 'delivery';
  }
  
  // 2. REAL ESTATE: imóveis
  if (/\b(im[óo]vel|imobili[áa]rio|casa|apartamento|aluguel|propriedade|real estate|constru[çc].*civil)/i.test(lower)) {
    return 'real_estate';
  }
  
  // 3. EDUCAÇÃO: cursos, escolas, LMS
  if (/\b(educa[çc]|curso|aula|ensino|aprendiz|ead|universidade|escola|professor|lms|tutoria|acad[êe]mic)/i.test(lower)) {
    return 'education';
  }
  
  // 4. SAÚDE: fitness, medicina, nutrição
  if (/\b(sa[úu]de|fitness|exerc[íi]cio|nutri[çc]|bem-estar|telemedicina|cl[íi]nica|treino|m[ée]dico|paciente|consulta)/i.test(lower)) {
    return 'health';
  }
  
  // 5. CONTEÚDO: redes sociais, streaming, mídia
  if (/\b(streaming|m[íi]dia|v[íi]deo|[áa]udio|rede social|comunidade|post|feed|conte[úu]do|influencer|creator)/i.test(lower)) {
    return 'content';
  }
  
  // 6. FINANÇAS: sempre ANTES de "automação" (pegar "automação financeira" → finance)
  if (/\b(finan[çc]|banco|investimento|gasto|or[çc]amento|fatura|pagamento|cr[ée]dito|contabil|empr[ée]stimo|saldo|transa[çc])/i.test(lower)) {
    return 'finance';
  }
  
  // 7. CRM/BUSINESS: ferramentas B2B, gestão empresarial (ANTES de automação)
  if (/\b(crm|cliente.*empresa|vendas.*b2b|lead|erp|gest[ãa]o empresarial|rh|contrato.*empresa|neg[óo]cio.*b2b|forecast)/i.test(lower)) {
    return 'crm_business';
  }
  
  // 8. MARKETPLACE: e-commerce, lojas
  if (/\b(marketplace|e-commerce|loja.*online|venda.*produto|compra.*produto|shopping|carrinho|cat[áa]logo|produto.*venda)/i.test(lower)) {
    return 'marketplace';
  }
  
  // 9. PRODUTIVIDADE: tarefas, projetos, notas
  if (/\b(tarefa|produtividade|todo|agenda|organiz|nota.*pessoal|lembrete|projeto|kanban|colabora[çc]|gest[ãa]o.*tempo)/i.test(lower)) {
    return 'productivity';
  }
  
  // 10. UTILITIES: compliance, dashboards genéricos, calculadoras
  if (/\b(lgpd|gdpr|compliance|conformidade|dashboard.*gen[ée]rico|calculadora|conversor|utilit[áa]rio|ferramenta.*web|painel.*controle)/i.test(lower)) {
    return 'utilities';
  }
  
  // 11. AI_AUTOMATION: SÓ se IA for o produto principal (chatbot, agente, triagem)
  // Evitar match genérico de "automação" (já pegou finanças/CRM acima)
  if (/\b(agente.*ia|chatbot|bot.*atendimento|automa[çc].*triagem|ia.*atendimento|assistente.*virtual|resposta.*autom.*ia)/i.test(lower)) {
    return 'ai_automation';
  }
  
  // 12. OTHER: transportadoras, logística B2B, frotas (NÃO é delivery de comida)
  if (/\b(frota|caminh[ãa]o|transportadora|log[íi]stica.*carga|rastreamento.*ve[íi]culo|entrega.*mercadoria)/i.test(lower)) {
    return 'other';
  }
  
  return 'other';
}
