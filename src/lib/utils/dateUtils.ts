import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

/**
 * Date Utilities - Funções utilitárias para formatação de datas
 * Todas as funções são locale-aware (pt-BR)
 */
export const dateUtils = {
  /**
   * Formata uma data em um formato específico
   * @param date - String ISO ou objeto Date
   * @param formatStr - Formato desejado (padrão: 'dd/MM/yyyy')
   */
  format: (date: string | Date, formatStr: string = 'dd/MM/yyyy') => {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date;
      if (!isValid(dateObj)) return 'Data inválida';
      return format(dateObj, formatStr, { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  },
  
  /**
   * Formata uma data de forma relativa (ex: "há 2 horas")
   * @param date - String ISO ou objeto Date
   */
  formatRelative: (date: string | Date) => {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date;
      if (!isValid(dateObj)) return 'Data inválida';
      return formatDistanceToNow(dateObj, { 
        addSuffix: true,
        locale: ptBR 
      });
    } catch {
      return 'Data inválida';
    }
  },
  
  /**
   * Formata data e hora completa
   * @param date - String ISO ou objeto Date
   */
  formatDateTime: (date: string | Date) => {
    return dateUtils.format(date, "dd/MM/yyyy 'às' HH:mm");
  },

  /**
   * Formata apenas a hora
   * @param date - String ISO ou objeto Date
   */
  formatTime: (date: string | Date) => {
    return dateUtils.format(date, 'HH:mm');
  },

  /**
   * Formata data por extenso
   * @param date - String ISO ou objeto Date
   */
  formatLong: (date: string | Date) => {
    return dateUtils.format(date, "d 'de' MMMM 'de' yyyy");
  },

  /**
   * Converte data/hora local do Brasil (BRT) para UTC ISO string
   * @param localDateTime - String no formato "YYYY-MM-DDTHH:mm" (do input datetime-local)
   * @returns ISO string em UTC (ex: "2025-11-02T22:00:00.000Z")
   * 
   * @example
   * convertBRTtoUTC("2025-11-02T19:00") // "2025-11-02T22:00:00.000Z" (19h BRT = 22h UTC)
   */
  convertBRTtoUTC: (localDateTime: string): string => {
    if (!localDateTime) return '';
    
    // Timezone do Brasil (considera horário de verão automaticamente)
    const brazilTimezone = 'America/Sao_Paulo';
    
    // Interpreta a string como data no timezone de Brasília
    const zonedDate = fromZonedTime(localDateTime, brazilTimezone);
    
    // Retorna ISO string em UTC
    return zonedDate.toISOString();
  },

  /**
   * Converte data UTC para formato datetime-local do Brasil (BRT)
   * @param utcDateTime - String ISO em UTC (ex: "2025-11-02T22:00:00.000Z")
   * @returns String no formato "YYYY-MM-DDTHH:mm" para input datetime-local
   * 
   * @example
   * convertUTCtoBRT("2025-11-02T22:00:00.000Z") // "2025-11-02T19:00" (22h UTC = 19h BRT)
   */
  convertUTCtoBRT: (utcDateTime: string): string => {
    if (!utcDateTime) return '';
    
    const brazilTimezone = 'America/Sao_Paulo';
    
    // Converte UTC para timezone de Brasília
    const zonedDate = toZonedTime(new Date(utcDateTime), brazilTimezone);
    
    // Formata para datetime-local (YYYY-MM-DDTHH:mm)
    return format(zonedDate, "yyyy-MM-dd'T'HH:mm");
  },

  /**
   * Obtém timezone atual do Brasil (considera horário de verão)
   * @returns Offset em formato "+HH:mm" (ex: "-03:00" ou "-02:00")
   */
  getBrazilTimezoneOffset: (): string => {
    const date = new Date();
    const brazilDate = toZonedTime(date, 'America/Sao_Paulo');
    const offset = (brazilDate.getTimezoneOffset() / -60);
    const sign = offset >= 0 ? '+' : '-';
    const hours = Math.abs(Math.floor(offset));
    const minutes = Math.abs((offset % 1) * 60);
    return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
};
