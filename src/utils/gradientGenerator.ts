/**
 * Mapeamento de cores de gradiente por categoria de PRD.
 * Cada categoria tem 2 cores [início, fim] para criar gradientes visuais consistentes.
 */
export const CATEGORY_COLORS = {
  delivery: ['#FF6B6B', '#FF8E53'], // Vermelho-laranja
  b2b: ['#4ECDC4', '#44A08D'],      // Teal-verde
  education: ['#667EEA', '#764BA2'], // Roxo
  health: ['#FA709A', '#FEE140'],    // Rosa-amarelo
  marketplace: ['#F093FB', '#F5576C'], // Rosa
  entertainment: ['#4FACFE', '#00F2FE'], // Azul
  real_estate: ['#43E97B', '#38F9D7'], // Verde
  finance: ['#FA8BFF', '#2BD2FF'],   // Rosa-azul
  other: ['#8E9EAB', '#EEF2F3']      // Cinza
};

/**
 * Gera gradiente CSS determinístico baseado em ID e categoria.
 * Usa hash do ID para criar variações de ângulo, mantendo cores da categoria.
 * 
 * @param id - UUID do documento (para gerar variação)
 * @param category - Categoria do PRD (ex: "delivery", "b2b", "education")
 * @returns String CSS com linear-gradient pronto para uso
 * 
 * @example
 * ```typescript
 * const gradient = getGradientFromSeed('uuid-123', 'delivery');
 * // "linear-gradient(78deg, #FF6B6B, #FF8E53)"
 * 
 * // Uso em JSX
 * <div style={{ background: gradient }} />
 * ```
 * 
 * @remarks
 * - Ângulo varia de 45° a 135° baseado no hash do ID
 * - Mesmo ID + categoria sempre gera o mesmo gradiente
 * - Fallback para CATEGORY_COLORS.other se categoria desconhecida
 */
export const getGradientFromSeed = (id: string, category: string) => {
  const colors = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.other;
  
  // Hash do ID para gerar variação
  const hash = id.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);
  
  const angle = 45 + (hash % 90); // 45-135deg
  
  return `linear-gradient(${angle}deg, ${colors[0]}, ${colors[1]})`;
};
