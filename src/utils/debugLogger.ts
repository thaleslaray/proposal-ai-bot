/**
 * Sistema centralizado de logs com controle via admin panel.
 * Útil para debug em produção sem poluir console por padrão.
 *
 * @module debugLogger
 */

let DEBUG_ENABLED = false;

/**
 * Função para ler estado do localStorage
 */
const getDebugState = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('debug_mode') === 'true';
};

// Inicializar estado do localStorage
DEBUG_ENABLED = getDebugState();

/**
 * Função para admin habilitar/desabilitar logs.
 * Estado é persistido no localStorage.
 *
 * @param enabled - Se true, ativa logs de debug
 *
 * @example
 * ```typescript
 * setDebugMode(true);  // Ativa logs
 * setDebugMode(false); // Desativa logs
 * ```
 */
export const setDebugMode = (enabled: boolean) => {
  DEBUG_ENABLED = enabled;
  localStorage.setItem('debug_mode', enabled.toString());
  console.log(`🔧 Debug mode ${enabled ? 'ENABLED ✅' : 'DISABLED 🚫'}`);
};

/**
 * Verifica se está em modo debug
 *
 * @returns true se debug está ativo
 *
 * @example
 * ```typescript
 * if (isDebugEnabled()) {
 *   // executar código de debug
 * }
 * ```
 */
export const isDebugEnabled = () => DEBUG_ENABLED;

/**
 * Logger condicional - apenas exibe se debug mode estiver ativo
 *
 * @param args - Argumentos a serem logados
 *
 * @example
 * ```typescript
 * debugLog('🔍 Fetching data:', { userId, params });
 * debugLog('✅ Success:', response);
 * ```
 */
export const debugLog = (...args: unknown[]) => {
  if (DEBUG_ENABLED) {
    console.log(...args);
  }
};

/**
 * Warning condicional - apenas exibe se debug mode estiver ativo
 *
 * @param args - Argumentos a serem logados como warning
 *
 * @example
 * ```typescript
 * debugWarn('⚠️ Cache expirado, revalidando...');
 * ```
 */
export const debugWarn = (...args: unknown[]) => {
  if (DEBUG_ENABLED) {
    console.warn(...args);
  }
};

/**
 * Erros sempre aparecem (críticos, não são suprimidos)
 *
 * @param args - Argumentos a serem logados como erro
 *
 * @example
 * ```typescript
 * debugError('❌ Erro crítico:', error);
 * ```
 */
export const debugError = (...args: unknown[]) => {
  console.error(...args);
};
