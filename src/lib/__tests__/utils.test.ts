import { describe, it, expect } from 'vitest';
import { cn, normalizeDisplayName } from '../utils';

describe('cn - Class Name Merger', () => {
  it('deve concatenar classes simples', () => {
    const result = cn('text-red-500', 'bg-blue-100');
    expect(result).toContain('text-red-500');
    expect(result).toContain('bg-blue-100');
  });

  it('deve resolver conflitos do Tailwind (último vence)', () => {
    const result = cn('text-red-500', 'text-blue-500');
    expect(result).toBe('text-blue-500');
    expect(result).not.toContain('text-red-500');
  });

  it('deve aceitar classes condicionais', () => {
    const isActive = true;
    const result = cn('base-class', isActive && 'active-class');
    expect(result).toContain('base-class');
    expect(result).toContain('active-class');
  });

  it('deve ignorar valores falsy', () => {
    const result = cn('visible', false && 'hidden', null, undefined, '');
    expect(result).toBe('visible');
  });

  it('deve lidar com arrays de classes', () => {
    const result = cn(['class-1', 'class-2'], 'class-3');
    expect(result).toContain('class-1');
    expect(result).toContain('class-2');
    expect(result).toContain('class-3');
  });
});

describe('normalizeDisplayName', () => {
  it('deve normalizar nome completo para "Nome Sobrenome"', () => {
    expect(normalizeDisplayName('João Silva Santos')).toBe('João Santos');
    expect(normalizeDisplayName('Maria de Souza')).toBe('Maria Souza');
  });

  it('deve capitalizar primeira letra', () => {
    expect(normalizeDisplayName('joão silva')).toBe('João Silva');
    expect(normalizeDisplayName('MARIA SANTOS')).toBe('Maria Santos');
  });

  it('deve retornar "Anônimo" para nomes vazios', () => {
    expect(normalizeDisplayName('')).toBe('Anônimo');
    expect(normalizeDisplayName('   ')).toBe('Anônimo');
  });

  it('deve lidar com nomes de uma palavra', () => {
    expect(normalizeDisplayName('João')).toBe('João');
    expect(normalizeDisplayName('MARIA')).toBe('Maria');
  });

  it('deve remover espaços extras', () => {
    expect(normalizeDisplayName('  João   Silva  ')).toBe('João Silva');
  });

  it('deve preservar acentos', () => {
    expect(normalizeDisplayName('José María García')).toBe('José García');
  });

  it('deve lidar com nomes já normalizados', () => {
    expect(normalizeDisplayName('João Silva')).toBe('João Silva');
  });

  it('deve normalizar nome completo com múltiplas palavras maiúsculas', () => {
    expect(normalizeDisplayName('ERICKA CAPOZZI SANCHES')).toBe('Ericka Sanches');
    expect(normalizeDisplayName('JOÃO PEDRO DA SILVA SANTOS')).toBe('João Santos');
  });
});
