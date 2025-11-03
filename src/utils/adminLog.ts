import { isDebugEnabled } from './debugLogger';

/**
 * Utilitários para logging condicional visível para administradores OU quando debug mode está ativo.
 * Útil para debug em produção sem expor logs sensíveis a usuários comuns.
 *
 * @module adminLog
 */

/**
 * Loga mensagens no console apenas se o usuário for admin OU debug mode estiver ativo.
 *
 * @param isAdmin - Flag indicando se o usuário atual é administrador
 * @param args - Argumentos a serem logados (aceita qualquer tipo)
 *
 * @example
 * ```typescript
 * const { isAdmin } = useAuth();
 * adminLog(isAdmin, 'Debug info:', { userId, action: 'delete' });
 * ```
 */
export const adminLog = (isAdmin: boolean | undefined, ...args: unknown[]) => {
  if (isAdmin || isDebugEnabled()) {
    console.log(...args);
  }
};

/**
 * Loga warnings no console apenas se o usuário for admin OU debug mode estiver ativo.
 *
 * @param isAdmin - Flag indicando se o usuário atual é administrador
 * @param args - Argumentos a serem logados como warning
 *
 * @example
 * ```typescript
 * const { isAdmin } = useAuth();
 * adminWarn(isAdmin, 'Possível inconsistência nos dados:', data);
 * ```
 */
export const adminWarn = (isAdmin: boolean | undefined, ...args: unknown[]) => {
  if (isAdmin || isDebugEnabled()) {
    console.warn(...args);
  }
};
