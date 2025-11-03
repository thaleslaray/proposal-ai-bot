import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina classes CSS com merge inteligente de Tailwind.
 * Usa clsx para concatenação condicional e tailwind-merge para resolver conflitos.
 *
 * @param inputs - Array de classes CSS, objetos condicionais ou valores undefined/null
 * @returns String com classes CSS mescladas, sem duplicatas ou conflitos
 *
 * @example
 * ```typescript
 * cn('px-2 py-1', 'px-4'); // "py-1 px-4" (px-4 sobrescreve px-2)
 * cn('text-red-500', condition && 'text-blue-500'); // Condicional
 * cn({ 'bg-primary': isActive }, 'text-white'); // Objeto condicional
 * ```
 *
 * @remarks
 * Função essencial do shadcn/ui para composição de classes Tailwind.
 * Resolve conflitos automaticamente priorizando a última classe declarada.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Capitaliza uma palavra (primeira letra maiúscula, resto minúscula).
 *
 * @param word - Palavra a ser capitalizada
 * @returns Palavra com primeira letra maiúscula e restante minúscula
 *
 * @example
 * ```typescript
 * capitalize('JOÃO'); // "João"
 * capitalize('silva'); // "Silva"
 * ```
 */
function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Normaliza nomes completos para exibição pública (primeiro + último nome).
 * Reduz nomes longos para formato "Nome Sobrenome", protegendo privacidade.
 *
 * @param fullName - Nome completo do usuário
 * @returns Nome normalizado no formato "Primeiro Último" ou nome original se for "Anônimo"
 *
 * @example
 * ```typescript
 * normalizeDisplayName('JOÃO PEDRO DA SILVA'); // "João Silva"
 * normalizeDisplayName('Maria'); // "Maria"
 * normalizeDisplayName('Anônimo'); // "Anônimo"
 * normalizeDisplayName('  josé  carlos  santos  '); // "José Santos"
 * ```
 *
 * @remarks
 * - Preserva "Anônimo" sem alterações
 * - Remove espaços extras entre palavras
 * - Para nomes simples (1 palavra), retorna capitalizado
 * - Para nomes compostos, retorna primeiro + último palavra
 * - Útil para exibir nomes em cards, comentários, etc.
 */
export function normalizeDisplayName(fullName: string): string {
  if (!fullName || fullName.trim() === '') return 'Anônimo';
  if (fullName === 'Anônimo') return fullName;

  // Remover espaços extras e dividir em palavras
  const words = fullName.trim().split(/\s+/);

  // Se só tem 1 palavra, retorna capitalizada
  if (words.length === 1) {
    return capitalize(words[0]);
  }

  // Pegar primeiro e último nome
  const firstName = capitalize(words[0]);
  const lastName = capitalize(words[words.length - 1]);

  return `${firstName} ${lastName}`;
}

/**
 * Gera username automático no formato "primeiro-ultimo" (URL-safe).
 * Remove acentos, espaços e caracteres especiais.
 *
 * @param fullName - Nome completo do usuário
 * @returns Username no formato "joao-silva" ou "usuario-{timestamp}" se inválido
 *
 * @example
 * ```typescript
 * generateUsername('João Pedro Silva'); // "joao-silva"
 * generateUsername('Maria'); // "maria"
 * generateUsername('José da Costa Santos'); // "jose-santos"
 * generateUsername(''); // "usuario-1234567890"
 * ```
 */
export function generateUsername(fullName: string): string {
  if (!fullName || fullName.trim() === '') {
    return `usuario-${Date.now()}`;
  }

  // Normalizar para primeiro + último
  const normalized = normalizeDisplayName(fullName);

  // Remover acentos e converter para lowercase
  const withoutAccents = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Substituir espaços por hífen e remover caracteres especiais
  const username = withoutAccents
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .substring(0, 20);

  return username || `usuario-${Date.now()}`;
}
