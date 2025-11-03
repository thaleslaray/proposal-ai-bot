/**
 * Cache em memória para roles de usuários.
 * Armazena roles no formato "admin,lifetime" ou "student" para reduzir queries ao banco.
 * 
 * @remarks
 * - Chave: userId (string UUID)
 * - Valor: { roles: string com roles separadas por vírgula, timestamp: number }
 * - Útil para evitar múltiplas consultas em curto período
 */
const roleCache = new Map<string, { 
  roles: string; // formato: "admin,lifetime" ou "student"
  timestamp: number; 
}>();

/**
 * Duração do cache de roles em milissegundos.
 * Após este período, o cache é considerado expirado e revalidado no próximo acesso.
 * 
 * @constant
 * @default 300000 (5 minutos)
 */
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Busca roles em cache para um usuário específico.
 * Retorna roles apenas se o cache ainda estiver válido (dentro de CACHE_DURATION).
 * 
 * @param userId - UUID do usuário
 * @returns String com roles separadas por vírgula (ex: "admin,lifetime") ou null se não estiver em cache ou expirado
 * 
 * @example
 * ```typescript
 * const roles = getCachedRole('123e4567-e89b-12d3-a456-426614174000');
 * if (roles) {
 *   console.log('Cached roles:', roles); // "admin,lifetime"
 * } else {
 *   // Buscar do banco de dados
 * }
 * ```
 * 
 * @remarks
 * - Remove automaticamente entradas expiradas ao detectá-las
 * - Retorna null para cache miss ou expirado
 */
export const getCachedRole = (userId: string): string | null => {
  const cached = roleCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.roles;
  }
  // Limpar cache expirado
  roleCache.delete(userId);
  return null;
};

/**
 * Armazena roles em cache para um usuário.
 * Sobrescreve qualquer cache anterior para o mesmo userId.
 * 
 * @param userId - UUID do usuário
 * @param roles - String com roles separadas por vírgula (ex: "admin,lifetime")
 * 
 * @example
 * ```typescript
 * // Após buscar do banco
 * const rolesFromDB = 'student,lifetime';
 * setCachedRole('123e4567-e89b-12d3-a456-426614174000', rolesFromDB);
 * ```
 * 
 * @remarks
 * - Timestamp é definido automaticamente como Date.now()
 * - Cache será válido por CACHE_DURATION (5 minutos)
 */
export const setCachedRole = (userId: string, roles: string) => {
  roleCache.set(userId, { roles, timestamp: Date.now() });
};

/**
 * Limpa completamente o cache de roles.
 * Útil para forçar revalidação após mudanças de permissões ou logout.
 * 
 * @example
 * ```typescript
 * // Ao fazer logout
 * clearRoleCache();
 * 
 * // Após admin alterar roles de um usuário
 * clearRoleCache(); // Força refetch para todos os usuários
 * ```
 * 
 * @remarks
 * Remove todas as entradas do Map, liberando memória.
 */
export const clearRoleCache = () => {
  roleCache.clear();
};
