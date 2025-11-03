/**
 * Sanitiza a biografia do usuário removendo HTML tags e scripts maliciosos.
 * Protege contra ataques XSS (Cross-Site Scripting) ao remover conteúdo HTML/JavaScript.
 *
 * @param bio - Texto da biografia fornecido pelo usuário
 * @returns Texto sanitizado, limitado a 500 caracteres, sem HTML ou scripts
 *
 * @example
 * ```typescript
 * const safeBio = sanitizeBio('<script>alert("xss")</script>Olá mundo!');
 * // Retorna: "Olá mundo!"
 * ```
 *
 * @remarks
 * - Remove todas as tags HTML usando regex
 * - Remove especificamente tags <script> e seu conteúdo
 * - Limita o tamanho final a 500 caracteres
 * - Remove espaços em branco extras no início e fim
 */
export const sanitizeBio = (bio: string): string => {
  // Remover scripts ANTES de remover tags HTML
  const withoutScript = bio.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remover HTML tags
  const withoutHtml = withoutScript.replace(/<[^>]*>/g, '');

  // Normalizar espaços múltiplos (preservando quebras de linha)
  const normalized = withoutHtml.replace(/[^\S\n]+/g, ' ');

  // Limitar tamanho
  return normalized.substring(0, 500).trim();
};

/**
 * Valida se uma string é uma URL válida.
 * Previne URLs maliciosas como `javascript:` ou `data:` através da validação do construtor URL.
 *
 * @param url - String contendo a URL a ser validada
 * @returns `true` se a URL for válida ou vazia, `false` caso contrário
 *
 * @example
 * ```typescript
 * validateUrl('https://example.com'); // true
 * validateUrl('javascript:alert(1)'); // false
 * validateUrl(''); // true (vazio é considerado válido)
 * ```
 *
 * @remarks
 * URLs vazias são consideradas válidas para permitir campos opcionais.
 * O construtor `new URL()` valida automaticamente o formato e protocolo.
 */
export const validateUrl = (url: string): boolean => {
  const trimmed = url.trim();
  if (!trimmed) return true; // Empty is valid (optional fields)

  try {
    const parsed = new URL(trimmed);
    // WHITELIST: Only allow HTTP and HTTPS protocols (prevent XSS)
    // Also validate that hostname exists and is not empty
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      parsed.hostname.length > 0 &&
      parsed.hostname !== '.'
    );
  } catch {
    return false; // Malformed URL
  }
};

/**
 * Sanitiza username para formato seguro compatível com URLs.
 * Remove caracteres especiais e normaliza para lowercase com apenas letras, números e underscore.
 *
 * @param username - Username bruto fornecido pelo usuário
 * @returns Username sanitizado em lowercase, apenas a-z, 0-9 e _, máximo 20 caracteres
 *
 * @example
 * ```typescript
 * sanitizeUsername('João Silva!'); // "josilva"
 * sanitizeUsername('user@123'); // "user123"
 * sanitizeUsername('My_Cool_Username_2024'); // "my_cool_username_20"
 * ```
 *
 * @remarks
 * - Converte para lowercase
 * - Remove acentos, espaços e caracteres especiais
 * - Mantém apenas [a-z0-9_]
 * - Limita a 20 caracteres para compatibilidade com URLs
 */
export const sanitizeUsername = (username: string): string => {
  return username
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .substring(0, 20);
};

/**
 * Sanitiza texto genérico removendo HTML tags e limitando tamanho.
 * Útil para limpar inputs de texto livre antes de salvar no banco ou exibir na UI.
 *
 * @param text - Texto a ser sanitizado
 * @param maxLength - Tamanho máximo permitido (padrão: 100 caracteres)
 * @returns Texto sanitizado sem HTML, limitado ao tamanho especificado
 *
 * @example
 * ```typescript
 * sanitizeText('<b>Título</b> do projeto', 50); // "Título do projeto"
 * sanitizeText('Texto muito longo...', 10); // "Texto muit"
 * ```
 *
 * @remarks
 * - Remove todas as tags HTML
 * - Aplica substring antes do trim para garantir limite exato
 * - Remove espaços em branco extras
 */
export const sanitizeText = (text: string, maxLength: number = 100): string => {
  // Remover scripts ANTES de remover tags
  const withoutScript = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  return withoutScript
    .replace(/<[^>]*>/g, '')
    .replace(/[^\S\n]+/g, ' ')
    .substring(0, maxLength)
    .trim();
};
