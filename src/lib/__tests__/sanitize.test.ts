import { describe, it, expect } from 'vitest';
import { sanitizeBio, sanitizeUsername, sanitizeText, validateUrl } from '../sanitize';

describe('sanitizeBio', () => {
  it('deve remover tags HTML perigosas', () => {
    const input = '<script>alert("XSS")</script>Minha bio';
    const result = sanitizeBio(input);
    expect(result).toBe('Minha bio');
    expect(result).not.toContain('<script>');
  });

  it('deve remover event handlers inline', () => {
    const input = '<img src="x" onerror="alert(1)">Bio';
    const result = sanitizeBio(input);
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('alert');
  });

  it('deve limitar a 500 caracteres', () => {
    const input = 'a'.repeat(600);
    const result = sanitizeBio(input);
    expect(result.length).toBeLessThanOrEqual(500);
  });

  it('deve preservar texto comum', () => {
    const input = 'Desenvolvedor Full Stack 🚀';
    const result = sanitizeBio(input);
    expect(result).toBe(input);
  });

  it('deve remover espaços extras', () => {
    const input = '  Bio   com   espaços  ';
    const result = sanitizeBio(input);
    expect(result).toBe('Bio com espaços');
  });

  it('deve retornar string vazia para entrada vazia', () => {
    expect(sanitizeBio('')).toBe('');
    expect(sanitizeBio('   ')).toBe('');
  });
});

describe('sanitizeUsername', () => {
  it('deve converter para lowercase e manter apenas a-z0-9_', () => {
    expect(sanitizeUsername('thales_123')).toBe('thales_123');
    expect(sanitizeUsername('user_name')).toBe('user_name');
    expect(sanitizeUsername('JohnDoe2024')).toBe('johndoe2024'); // Lowercase
  });

  it('deve remover caracteres especiais', () => {
    expect(sanitizeUsername('user@name')).toBe('username');
    expect(sanitizeUsername('user-name')).toBe('username');
    expect(sanitizeUsername('user.name')).toBe('username');
    expect(sanitizeUsername('user name')).toBe('username');
  });

  it('deve preservar underscores', () => {
    expect(sanitizeUsername('user_name_123')).toBe('user_name_123');
    expect(sanitizeUsername('_username')).toBe('_username');
  });

  it('deve limitar a 20 caracteres', () => {
    const long = 'a'.repeat(31);
    const result = sanitizeUsername(long);
    expect(result.length).toBe(20);
    expect(result).toBe('a'.repeat(20));
  });

  it('deve retornar string vazia para entrada sem caracteres válidos', () => {
    expect(sanitizeUsername('')).toBe('');
    expect(sanitizeUsername('   ')).toBe('');
    expect(sanitizeUsername('!@#$%')).toBe('');
  });

  it('deve remover acentos e caracteres Unicode', () => {
    // Nota: A implementação atual remove todos os não-[a-z0-9_]
    expect(sanitizeUsername('José')).toBe('jos'); // Remove 'é'
    expect(sanitizeUsername('François')).toBe('franois'); // Remove 'ç'
  });
});

describe('sanitizeText', () => {
  it('deve remover todas as tags HTML', () => {
    const input = '<div><p>Texto <strong>formatado</strong></p></div>';
    const result = sanitizeText(input);
    expect(result).toBe('Texto formatado');
  });

  it('deve remover scripts maliciosos', () => {
    const input = 'Texto <script>fetch("evil.com")</script> normal';
    const result = sanitizeText(input);
    expect(result).toBe('Texto normal'); // Espaços múltiplos são normalizados
    expect(result).not.toContain('script');
  });

  it('deve preservar quebras de linha', () => {
    const input = 'Linha 1\nLinha 2\nLinha 3';
    const result = sanitizeText(input);
    expect(result).toBe(input);
  });

  it('deve normalizar espaços', () => {
    const input = 'Texto   com    múltiplos  espaços';
    const result = sanitizeText(input);
    expect(result).toBe('Texto com múltiplos espaços');
  });
});

describe('validateUrl', () => {
  it('deve aceitar URLs válidas', () => {
    expect(validateUrl('https://example.com')).toBe(true);
    expect(validateUrl('http://site.com.br')).toBe(true);
    expect(validateUrl('https://sub.domain.com/path')).toBe(true);
  });

  it('deve rejeitar javascript: URIs', () => {
    expect(validateUrl('javascript:alert(1)')).toBe(false);
    expect(validateUrl('JavaScript:void(0)')).toBe(false);
  });

  it('deve rejeitar data: URIs', () => {
    expect(validateUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
  });

  it('deve rejeitar vbscript: URIs', () => {
    expect(validateUrl('vbscript:msgbox')).toBe(false);
  });

  it('deve rejeitar URLs sem protocolo', () => {
    expect(validateUrl('example.com')).toBe(false);
    expect(validateUrl('www.site.com')).toBe(false);
  });

  it('deve aceitar strings vazias (campos opcionais)', () => {
    expect(validateUrl('')).toBe(true);
    expect(validateUrl('   ')).toBe(true);
  });

  it('deve rejeitar URLs malformadas', () => {
    expect(validateUrl('http://')).toBe(false);
    expect(validateUrl('https://.')).toBe(false);
  });
});
