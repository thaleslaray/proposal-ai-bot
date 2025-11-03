/**
 * Logger condicional que só registra logs em ambiente de desenvolvimento.
 *
 * Em produção, os logs são suprimidos para:
 * - Melhorar performance
 * - Reduzir exposição de informações sensíveis
 * - Limpar o console do usuário
 *
 * @example
 * ```typescript
 * import { logger } from '@/lib/logger';
 *
 * logger.log('Usuário logado:', user);
 * logger.error('Erro ao carregar dados');
 * logger.warn('Cache expirado');
 * ```
 */

const isDev = import.meta.env.DEV;

/**
 * Logger principal - somente em desenvolvimento
 */
export const logger = {
  /**
   * Log de informação geral (somente dev)
   */
  log: (...args: any[]) => {
    if (isDev) console.log(...args);
  },

  /**
   * Log de erro (somente dev)
   */
  error: (...args: any[]) => {
    if (isDev) console.error(...args);
  },

  /**
   * Log de aviso (somente dev)
   */
  warn: (...args: any[]) => {
    if (isDev) console.warn(...args);
  },

  /**
   * Log de informação (somente dev)
   */
  info: (...args: any[]) => {
    if (isDev) console.info(...args);
  },

  /**
   * Log de debug (somente dev)
   */
  debug: (...args: any[]) => {
    if (isDev) console.debug(...args);
  },

  /**
   * Log de tabela (somente dev)
   */
  table: (data: any) => {
    if (isDev) console.table(data);
  }
};

/**
 * Logger para erros críticos que devem sempre aparecer,
 * mesmo em produção (ex: erros de rede, falhas de autenticação críticas)
 *
 * Use com moderação - apenas para erros que o time precisa ver em produção.
 */
export const criticalLogger = {
  error: (...args: any[]) => console.error('🔴 [CRITICAL]', ...args),
  warn: (...args: any[]) => console.warn('⚠️ [CRITICAL]', ...args),
};

/**
 * Verifica se está em ambiente de desenvolvimento
 */
export const isDevEnvironment = (): boolean => isDev;
