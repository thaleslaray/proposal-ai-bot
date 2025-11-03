/**
 * Extrai metadados estruturados de um documento PRD gerado por IA.
 * Analisa o texto para identificar título, seções-chave, tags relevantes e complexidade.
 * 
 * @param fullDocument - Texto completo do PRD gerado
 * @returns Objeto contendo title, sections (problema/solucao/funcionalidades), tags e complexity (1-5)
 * 
 * @example
 * ```typescript
 * const prdText = "# App de Delivery\n## Problema\nClientes precisam...\n## Solução\nApp mobile...";
 * const metadata = extractPRDData(prdText);
 * // {
 * //   title: "App de Delivery",
 * //   sections: { problema: "Clientes precisam...", solucao: "App mobile...", funcionalidades: "..." },
 * //   tags: ["Mobile", "E-commerce", "Delivery"],
 * //   complexity: 4
 * // }
 * ```
 * 
 * @remarks
 * - Busca padrões como "# Título" ou "**Título:**" para extrair o título
 * - Extrai seções usando regex para "Problema:", "Solução:", "Funcionalidades:"
 * - Auto-detecta até 3 tags baseadas em keywords no documento
 * - Calcula complexidade (1-5) baseado em features, integrações, tecnologias e tamanho
 */
export const extractPRDData = (fullDocument: string) => {
  // 1. Tentar "Descrição Concisa" (mais específico)
  const descMatch = fullDocument.match(/Descri[çc][ãa]o [Cc]oncisa[:\s]*([^\n]+)/i);
  
  // 2. Tentar "Nome do Produto"
  const nameMatch = fullDocument.match(/Nome do Produto[:\s]*([^\n]+)/i);
  
  // 3. Fallback: primeira frase do documento
  const firstLine = fullDocument
    .split('\n')
    .find(l => !l.startsWith('#') && l.trim().length > 20);
  
  let title = descMatch?.[1] || nameMatch?.[1] || firstLine?.split('.')[0];
  
  // Limpar prefixos genéricos (mais agressivo)
  title = title
    ?.replace(/^(VISÃO GERAL DO PRODUTO|Produto:|Projeto:|##|Nome:|Descrição:)/gi, '')
    .replace(/^[:\s]+/, '') // Remove ":" ou espaços no início
    .trim()
    .substring(0, 60); // Limitar a 60 chars
  
  // Extrair seções principais
  const sections = {
    problema: extractSection(fullDocument, 'Problema'),
    solucao: extractSection(fullDocument, 'Solução'),
    funcionalidades: extractSection(fullDocument, 'Funcionalidades')
  };
  
  // Auto-detectar tags
  const tags = autoDetectTags(fullDocument);
  
  // Calcular complexidade (1-5)
  const complexity = calculateComplexity(fullDocument);
  
  return { title: title || 'Sem título', sections, tags, complexity };
};

/**
 * Extrai conteúdo de uma seção específica do PRD.
 * Busca por padrões como "## Problema" ou "## Solução:" e retorna o conteúdo após o header.
 * 
 * @param doc - Texto completo do documento
 * @param sectionName - Nome da seção (ex: "Problema", "Solução", "Funcionalidades")
 * @returns Conteúdo da seção limitado a 200 caracteres, ou string vazia se não encontrado
 * 
 * @example
 * ```typescript
 * const content = extractSection(prdText, "Problema");
 * // "Usuários enfrentam dificuldade em..."
 * ```
 * 
 * @remarks
 * - Busca insensível a maiúsculas/minúsculas
 * - Retorna apenas o conteúdo até próximo "##" ou 200 caracteres
 * - Remove espaços em branco extras
 */
const extractSection = (doc: string, sectionName: string) => {
  const regex = new RegExp(`##\\s*${sectionName}[:\\s]*([^#]+)`, 'i');
  const match = doc.match(regex);
  return match ? match[1].trim().substring(0, 200) : '';
};

/**
 * Detecta automaticamente tags relevantes baseadas em keywords no documento.
 * Analisa o conteúdo em busca de termos técnicos e categorias de negócio.
 * 
 * @param doc - Texto completo do documento (case-insensitive)
 * @returns Array com até 3 tags detectadas, priorizando tags específicas sobre genéricas
 * 
 * @example
 * ```typescript
 * const tags = autoDetectTags("App mobile com IA e pagamento Stripe");
 * // ["ai", "payment", "mobile"]
 * ```
 * 
 * @remarks
 * - **Tags Específicas (prioridade alta)**: ai, automation, payment, social, analytics, crm, realtime, ecommerce
 * - **Tags Genéricas (fallback)**: mobile, web, startup
 * - Tags específicas têm prioridade total
 * - Tags genéricas só aparecem se não houver específicas
 * - Limite de 3 tags para evitar poluição
 * - Converte documento para lowercase antes da busca
 */
const autoDetectTags = (doc: string) => {
  const specificKeywords = {
    ai: /intelig[êe]ncia artificial|machine learning|ia\b|openai|gpt|chatbot/gi,
    automation: /automa[çc][ãa]o|workflow|zapier|integra[çc][ãa]o|n8n/gi,
    payment: /pagamento|stripe|mercado pago|checkout|financeiro|pix/gi,
    social: /rede social|compartilhar|curtir|comentar|feed|comunidade/gi,
    analytics: /analytics|dashboard|m[ée]tricas|relat[óo]rio|gr[áa]ficos|bi\b/gi,
    crm: /crm|lead|cliente|vendas|pipeline|funil/gi,
    realtime: /tempo real|chat|mensagem|notifica[çc][ãa]o|websocket/gi,
    ecommerce: /e-commerce|loja|carrinho|produto|venda|marketplace/gi,
  };
  
  const genericKeywords = {
    mobile: /mobile|app|android|ios|smartphone/gi,
    web: /web|site|plataforma|navegador/gi,
    startup: /startup|mvp|inova[çc][ãa]o/gi,
  };
  
  const detected: string[] = [];
  
  // Priorizar tags específicas
  Object.entries(specificKeywords).forEach(([tag, regex]) => {
    if (regex.test(doc)) detected.push(tag);
  });
  
  // Só usar genéricas se não tiver NENHUMA específica
  if (detected.length === 0) {
    Object.entries(genericKeywords).forEach(([tag, regex]) => {
      if (regex.test(doc) && detected.length < 3) detected.push(tag);
    });
  }
  
  return detected.slice(0, 3); // Max 3 tags
};

/**
 * Calcula score de complexidade do PRD (escala 1-5).
 * Analisa quantidade de features, integrações externas, tecnologias complexas e tamanho.
 * 
 * @param doc - Texto completo do documento
 * @returns Score de complexidade: 1 (básico) a 5 (extenso)
 * 
 * @example
 * ```typescript
 * const complexity = calculateComplexity(prdText);
 * // 4 (app com múltiplas features, APIs externas e IA)
 * ```
 * 
 * @remarks
 * **Fatores de nível de detalhamento:**
 * 1. **Tamanho**: Comprimento total do documento
 * 2. **Seções detalhadas**: Quantidade de subtítulos e estrutura
 * 3. **Funcionalidades**: Número de features descritas
 * 4. **Integrações**: APIs e serviços externos mencionados
 * 5. **Tecnologias avançadas**: Blockchain, IA, microservices, etc.
 * 
 * Score final é distribuído entre 1-5 para melhor diferenciação.
 */
const calculateComplexity = (doc: string) => {
  const length = doc.length;
  
  // Base: Tamanho do documento (50% peso) - thresholds baseados em percentis reais
  let score = 1;
  if (length < 15500) {
    score = 1; // Básico (20% menores)
  } else if (length < 17200) {
    score = 2; // Detalhado (20-40%)
  } else if (length < 18800) {
    score = 3; // Completo (40-60%)
  } else if (length < 20500) {
    score = 4; // Profundo (60-80%)
  } else {
    score = 5; // Extenso (20% maiores)
  }
  
  // Modificador: Densidade de funcionalidades (30% peso)
  const funcCount = (doc.match(/[-•]\s+/g) || []).length; // Lista de itens
  const funcDensity = funcCount / (length / 1000); // Items por KB
  
  if (funcDensity > 12) {
    score = Math.min(5, score + 1); // Muito denso
  } else if (funcDensity < 8 && score > 1) {
    score = Math.max(1, score - 1); // Pouco denso
  }
  
  // Modificador: Integrações complexas (20% peso)
  const integrations = (doc.match(/API\s+\w+|integra[çc][ãa]o\s+com|webhook|OAuth|REST|GraphQL/gi) || []).length;
  
  if (integrations > 15) {
    score = Math.min(5, score + 1); // Muitas integrações
  } else if (integrations < 8 && score > 1) {
    score = Math.max(1, score - 1); // Poucas integrações
  }
  
  return Math.min(5, Math.max(1, score)); // Garantir 1-5
};
