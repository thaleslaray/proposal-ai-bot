import { format } from 'date-fns';
import { logger } from '@/lib/logger';

/**
 * Interface para dados exportáveis em CSV.
 * Representa um objeto genérico com chaves string e valores primitivos ou Date.
 */
export interface ExportData {
  [key: string]: string | number | boolean | null | undefined | Date;
}

/**
 * Converte array de objetos para string CSV com escape adequado.
 * Adiciona símbolo "—" para valores vazios/null para melhor legibilidade.
 *
 * @param data - Array de objetos a serem convertidos
 * @param headers - Array com nomes das colunas na ordem desejada
 * @returns String CSV com headers e linhas de dados
 *
 * @example
 * ```typescript
 * const data = [
 *   { name: 'João', age: 25, city: 'São Paulo' },
 *   { name: 'Maria', age: null, city: 'Rio' }
 * ];
 * const csv = arrayToCSV(data, ['name', 'age', 'city']);
 * // "name,age,city\nJoão,25,São Paulo\nMaria,—,Rio"
 * ```
 *
 * @remarks
 * - Substitui null/undefined/'' por "—" para melhor visualização
 * - Escapa valores contendo vírgulas, aspas ou quebras de linha
 * - Valores com aspas são envolvidos em aspas duplas
 */
const arrayToCSV = (data: ExportData[], headers: string[]): string => {
  const escapeValue = (value: string | number | boolean | null | undefined | Date): string => {
    if (value === null || value === undefined || value === '') {
      return '—';
    }

    const stringValue = String(value);

    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  };

  // Create header row
  const headerRow = headers.map(h => escapeValue(h)).join(',');

  // Create data rows
  const dataRows = data.map(row => {
    return headers
      .map(header => {
        const value = row[header];
        return escapeValue(value);
      })
      .join(',');
  });

  return [headerRow, ...dataRows].join('\n');
};

/**
 * Formata data ISO para padrão brasileiro DD/MM/YYYY HH:mm.
 *
 * @param dateString - String de data no formato ISO (ex: "2024-01-15T10:30:00Z")
 * @returns Data formatada "DD/MM/YYYY HH:mm" ou "—" se inválida/null
 *
 * @example
 * ```typescript
 * formatDateBR('2024-01-15T10:30:00Z'); // "15/01/2024 10:30"
 * formatDateBR(null); // "—"
 * formatDateBR(undefined); // "—"
 * formatDateBR('invalid'); // "—"
 * ```
 *
 * @remarks
 * Usa date-fns para formatação consistente.
 * Retorna "—" em caso de erro para manter CSV limpo.
 */
export const formatDateBR = (dateString: string | null | undefined): string => {
  if (!dateString) return '—';

  try {
    const date = new Date(dateString);
    return format(date, 'dd/MM/yyyy HH:mm');
  } catch {
    return '—';
  }
};

/**
 * Exporta dados para arquivo CSV e inicia download no browser.
 * Adiciona BOM UTF-8 para compatibilidade com Excel e acentuação correta.
 *
 * @param data - Array de objetos a serem exportados
 * @param filename - Nome do arquivo (com ou sem extensão .csv)
 * @param headers - Array opcional com nomes das colunas (usa chaves do primeiro objeto se omitido)
 *
 * @example
 * ```typescript
 * const users = [
 *   { id: 1, name: 'João', created_at: '2024-01-15' },
 *   { id: 2, name: 'Maria', created_at: '2024-01-16' }
 * ];
 *
 * exportToCSV(users, 'usuarios.csv', ['id', 'name', 'created_at']);
 * // Baixa: usuarios.csv com encoding UTF-8
 * ```
 *
 * @remarks
 * - Adiciona BOM UTF-8 (\uFEFF) para Excel reconhecer encoding
 * - Se data estiver vazio, apenas loga warning e retorna
 * - Se headers omitido, extrai automaticamente do primeiro objeto
 * - Cria elemento <a> temporário para trigger download
 * - Revoga URL após download para liberar memória
 */
export const exportToCSV = (data: ExportData[], filename: string, headers?: string[]): void => {
  if (data.length === 0) {
    logger.warn('No data to export');
    return;
  }

  // Use provided headers or extract from first object
  const csvHeaders = headers || Object.keys(data[0]);

  // Convert to CSV
  const csvContent = arrayToCSV(data, csvHeaders);

  // Add UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';
  const csvWithBOM = BOM + csvContent;

  // Create blob
  const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });

  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Cleanup
  URL.revokeObjectURL(url);
};

/**
 * Gera nome de arquivo com timestamp para evitar conflitos.
 *
 * @param prefix - Prefixo do nome do arquivo (ex: "usuarios", "relatorio")
 * @param extension - Extensão do arquivo (padrão: "csv")
 * @returns Nome do arquivo no formato "{prefix}_YYYY-MM-DD_HHmmss.{extension}"
 *
 * @example
 * ```typescript
 * generateFilename('usuarios'); // "usuarios_2024-01-15_143022.csv"
 * generateFilename('vendas', 'xlsx'); // "vendas_2024-01-15_143022.xlsx"
 * ```
 *
 * @remarks
 * - Formato do timestamp: YYYY-MM-DD_HHmmss
 * - Útil para garantir unicidade de arquivos exportados
 * - Usa date-fns para formatação consistente
 */
export const generateFilename = (prefix: string, extension: string = 'csv'): string => {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss');
  return `${prefix}_${timestamp}.${extension}`;
};
