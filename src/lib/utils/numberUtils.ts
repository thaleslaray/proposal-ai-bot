/**
 * Number Utilities - Funções utilitárias para formatação de números
 * Todas as funções são locale-aware (pt-BR)
 */
export const numberUtils = {
  /**
   * Formata um número como moeda
   * @param value - Valor numérico
   * @param currency - Código da moeda (padrão: 'BRL')
   */
  formatCurrency: (value: number, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency
    }).format(value);
  },
  
  /**
   * Formata um número de forma compacta (ex: 1.2K, 3.5M)
   * @param value - Valor numérico
   */
  formatCompact: (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      notation: 'compact',
      compactDisplay: 'short'
    }).format(value);
  },
  
  /**
   * Formata um número como porcentagem
   * @param value - Valor numérico (ex: 0.75 = 75%)
   * @param decimals - Número de casas decimais
   */
  formatPercentage: (value: number, decimals: number = 0) => {
    return `${value.toFixed(decimals)}%`;
  },

  /**
   * Formata um número com separadores de milhar
   * @param value - Valor numérico
   * @param decimals - Número de casas decimais
   */
  formatNumber: (value: number, decimals: number = 0) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  },

  /**
   * Abrevia números grandes (ex: 1000 → 1K, 1000000 → 1M)
   * @param value - Valor numérico
   */
  abbreviate: (value: number): string => {
    if (value < 1000) return value.toString();
    if (value < 1000000) return `${(value / 1000).toFixed(1)}K`;
    if (value < 1000000000) return `${(value / 1000000).toFixed(1)}M`;
    return `${(value / 1000000000).toFixed(1)}B`;
  }
};
