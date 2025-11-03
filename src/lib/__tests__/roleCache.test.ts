import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCachedRole, setCachedRole, clearRoleCache } from '../roleCache';

describe('roleCache', () => {
  beforeEach(() => {
    clearRoleCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('setCachedRole e getCachedRole', () => {
    it('deve salvar e recuperar role do cache', () => {
      const userId = 'user-123';
      const role = 'student,lifetime';
      
      setCachedRole(userId, role);
      const cached = getCachedRole(userId);
      
      expect(cached).toBe(role);
    });

    it('deve retornar null para usuário não cacheado', () => {
      const cached = getCachedRole('user-inexistente');
      expect(cached).toBeNull();
    });

    it('deve expirar cache após 5 minutos', () => {
      const userId = 'user-456';
      setCachedRole(userId, 'admin');
      
      // Avançar 4 minutos - ainda válido
      vi.advanceTimersByTime(4 * 60 * 1000);
      expect(getCachedRole(userId)).toBe('admin');
      
      // Avançar mais 2 minutos - expirado
      vi.advanceTimersByTime(2 * 60 * 1000);
      expect(getCachedRole(userId)).toBeNull();
    });

    it('deve sobrescrever cache existente', () => {
      const userId = 'user-789';
      
      setCachedRole(userId, 'free');
      expect(getCachedRole(userId)).toBe('free');
      
      setCachedRole(userId, 'student');
      expect(getCachedRole(userId)).toBe('student');
    });

    it('deve manter múltiplos usuários em cache', () => {
      setCachedRole('user-1', 'admin');
      setCachedRole('user-2', 'student');
      setCachedRole('user-3', 'free');
      
      expect(getCachedRole('user-1')).toBe('admin');
      expect(getCachedRole('user-2')).toBe('student');
      expect(getCachedRole('user-3')).toBe('free');
    });
  });

  describe('clearRoleCache', () => {
    it('deve limpar todo o cache', () => {
      setCachedRole('user-1', 'admin');
      setCachedRole('user-2', 'student');
      
      clearRoleCache();
      
      expect(getCachedRole('user-1')).toBeNull();
      expect(getCachedRole('user-2')).toBeNull();
    });

    it('deve permitir adicionar ao cache após limpar', () => {
      setCachedRole('user-1', 'admin');
      clearRoleCache();
      
      setCachedRole('user-1', 'student');
      expect(getCachedRole('user-1')).toBe('student');
    });
  });
});
