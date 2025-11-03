import { describe, it, expect } from 'vitest';
import { numberUtils } from '../numberUtils';

describe('numberUtils', () => {
  describe('formatCurrency', () => {
    it('deve formatar número como moeda BRL', () => {
      const result = numberUtils.formatCurrency(1234.56);
      // Intl.NumberFormat usa espaço não-quebrável (U+00A0)
      expect(result).toBe('R$\u00A01.234,56');
    });

    it('deve formatar com moeda customizada', () => {
      const result = numberUtils.formatCurrency(1234.56, 'USD');
      // Com locale pt-BR, USD ainda usa formato brasileiro (vírgula para decimal)
      expect(result).toContain('1.234,56');
    });

    it('deve lidar com valores negativos', () => {
      const result = numberUtils.formatCurrency(-500);
      expect(result).toContain('-R$');
    });

    it('deve formatar zero corretamente', () => {
      const result = numberUtils.formatCurrency(0);
      // Intl.NumberFormat usa espaço não-quebrável (U+00A0)
      expect(result).toBe('R$\u00A00,00');
    });
  });

  describe('formatCompact', () => {
    it('deve formatar milhares com K', () => {
      const result = numberUtils.formatCompact(1500);
      expect(result).toContain('mil'); // pt-BR usa "mil"
    });

    it('deve formatar milhões com M', () => {
      const result = numberUtils.formatCompact(2500000);
      expect(result).toContain('mi'); // pt-BR usa "mi"
    });

    it('deve manter números pequenos sem abreviação', () => {
      const result = numberUtils.formatCompact(999);
      expect(result).toBe('999');
    });
  });

  describe('formatPercentage', () => {
    it('deve formatar como porcentagem sem decimais', () => {
      const result = numberUtils.formatPercentage(75);
      expect(result).toBe('75%');
    });

    it('deve formatar com decimais especificados', () => {
      const result = numberUtils.formatPercentage(75.456, 2);
      expect(result).toBe('75.46%');
    });

    it('deve lidar com valores negativos', () => {
      const result = numberUtils.formatPercentage(-10);
      expect(result).toBe('-10%');
    });
  });

  describe('formatNumber', () => {
    it('deve formatar com separadores de milhar', () => {
      const result = numberUtils.formatNumber(1234567);
      expect(result).toBe('1.234.567');
    });

    it('deve formatar com decimais', () => {
      const result = numberUtils.formatNumber(1234.56, 2);
      expect(result).toBe('1.234,56');
    });

    it('deve formatar zero corretamente', () => {
      const result = numberUtils.formatNumber(0);
      expect(result).toBe('0');
    });
  });

  describe('abbreviate', () => {
    it('deve retornar número como string se menor que 1000', () => {
      expect(numberUtils.abbreviate(999)).toBe('999');
    });

    it('deve abreviar milhares com K', () => {
      expect(numberUtils.abbreviate(1500)).toBe('1.5K');
    });

    it('deve abreviar milhões com M', () => {
      expect(numberUtils.abbreviate(2500000)).toBe('2.5M');
    });

    it('deve abreviar bilhões com B', () => {
      expect(numberUtils.abbreviate(3500000000)).toBe('3.5B');
    });

    it('deve lidar com valores exatos', () => {
      expect(numberUtils.abbreviate(1000)).toBe('1.0K');
      expect(numberUtils.abbreviate(1000000)).toBe('1.0M');
    });
  });
});
