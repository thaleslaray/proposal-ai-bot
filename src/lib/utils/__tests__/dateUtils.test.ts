import { describe, it, expect } from 'vitest';
import { dateUtils } from '../dateUtils';

describe('dateUtils', () => {
  describe('format', () => {
    it('deve formatar data ISO no formato padrão dd/MM/yyyy', () => {
      const result = dateUtils.format('2024-03-15T10:30:00Z');
      expect(result).toBe('15/03/2024');
    });

    it('deve formatar data com formato customizado', () => {
      const result = dateUtils.format('2024-03-15T10:30:00Z', 'yyyy-MM-dd');
      expect(result).toBe('2024-03-15');
    });

    it('deve aceitar objeto Date', () => {
      const date = new Date('2024-03-15T10:30:00Z');
      const result = dateUtils.format(date);
      expect(result).toBe('15/03/2024');
    });

    it('deve retornar "Data inválida" para string inválida', () => {
      const result = dateUtils.format('invalid-date');
      expect(result).toBe('Data inválida');
    });
  });

  describe('formatRelative', () => {
    it('deve formatar data relativa recente', () => {
      const recentDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 horas atrás
      const result = dateUtils.formatRelative(recentDate);
      expect(result).toContain('horas');
    });

    it('deve retornar "Data inválida" para data inválida', () => {
      const result = dateUtils.formatRelative('not-a-date');
      expect(result).toBe('Data inválida');
    });

    it('deve aceitar string ISO', () => {
      const isoDate = new Date(Date.now() - 1000 * 60 * 5).toISOString(); // 5 min atrás
      const result = dateUtils.formatRelative(isoDate);
      expect(result).toContain('minutos');
    });
  });

  describe('formatDateTime', () => {
    it('deve formatar data e hora completa', () => {
      const result = dateUtils.formatDateTime('2024-03-15T14:30:00Z');
      expect(result).toMatch(/15\/03\/2024 às \d{2}:\d{2}/);
    });
  });

  describe('formatTime', () => {
    it('deve formatar apenas a hora', () => {
      const result = dateUtils.formatTime('2024-03-15T14:30:00Z');
      expect(result).toMatch(/\d{2}:\d{2}/);
    });
  });

  describe('formatLong', () => {
    it('deve formatar data por extenso em português', () => {
      const result = dateUtils.formatLong('2024-03-15T10:30:00Z');
      expect(result).toContain('março');
      expect(result).toContain('2024');
    });
  });

  describe('convertBRTtoUTC', () => {
    it('deve converter BRT para UTC corretamente', () => {
      // 19h BRT = 22h UTC (BRT = UTC-3)
      const result = dateUtils.convertBRTtoUTC('2025-11-02T19:00');
      expect(result).toBe('2025-11-02T22:00:00.000Z');
    });

    it('deve retornar string vazia para input vazio', () => {
      expect(dateUtils.convertBRTtoUTC('')).toBe('');
    });
  });

  describe('convertUTCtoBRT', () => {
    it('deve converter UTC para BRT corretamente', () => {
      // 22h UTC = 19h BRT
      const result = dateUtils.convertUTCtoBRT('2025-11-02T22:00:00.000Z');
      expect(result).toBe('2025-11-02T19:00');
    });

    it('deve retornar string vazia para input vazio', () => {
      expect(dateUtils.convertUTCtoBRT('')).toBe('');
    });
  });

  describe('getBrazilTimezoneOffset', () => {
    it('deve retornar offset do Brasil no formato correto', () => {
      const result = dateUtils.getBrazilTimezoneOffset();
      expect(result).toMatch(/^[+-]\d{2}:\d{2}$/);
    });
  });
});
