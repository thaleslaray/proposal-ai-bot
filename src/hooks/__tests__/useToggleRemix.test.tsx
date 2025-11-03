import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useToggleRemix } from '../useToggleRemix';
import { toast } from '@/hooks/use-toast';

const waitFor = async (callback: () => void, options = { timeout: 1000 }) => {
  const startTime = Date.now();
  while (Date.now() - startTime < options.timeout) {
    try {
      callback();
      return;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  callback();
};

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn()
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }))
    }))
  }
}));

describe('useToggleRemix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('deve retornar função executeRemix e estado isLoading', () => {
    const { result } = renderHook(() => useToggleRemix());
    
    expect(result.current.executeRemix).toBeDefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('deve exibir erro quando usuário não está autenticado', async () => {
    const { result } = renderHook(() => useToggleRemix());
    const mockPRD = {
      id: 'prd-1',
      title: 'PRD Teste',
      content: 'Conteúdo',
      category: 'Tech',
      user_id: 'user-123',
      full_document: 'Documento completo'
    };
    
    await result.current.executeRemix(mockPRD as any, undefined);
    
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Erro',
        description: 'Você precisa estar logado para remixar um PRD',
        variant: 'destructive'
      })
    );
  });

  it('deve salvar PRD no localStorage', async () => {
    const { result } = renderHook(() => useToggleRemix());
    const mockPRD = {
      id: 'prd-1',
      title: 'PRD Teste',
      content: 'Conteúdo para remix',
      category: 'Tech',
      user_id: 'user-456',
      full_document: 'Documento completo'
    };
    
    await result.current.executeRemix(mockPRD as any, 'user-123');
    
    const savedData = localStorage.getItem('remixPRD');
    expect(savedData).toBeTruthy();
    
    const parsedData = JSON.parse(savedData!);
    expect(parsedData.title).toBe('PRD Teste');
    expect(parsedData.content).toBe('Conteúdo para remix');
  });

  it('deve executar callback onSuccess quando remix é bem-sucedido', async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useToggleRemix({ onSuccess }));
    const mockPRD = {
      id: 'prd-1',
      title: 'PRD',
      content: 'Teste',
      category: 'Tech',
      user_id: 'user-456',
      full_document: 'Documento completo'
    };
    
    await result.current.executeRemix(mockPRD as any, 'user-123');
    
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('deve exibir toast de sucesso', async () => {
    const { result } = renderHook(() => useToggleRemix());
    const mockPRD = {
      id: 'prd-1',
      title: 'PRD Teste',
      content: 'Conteúdo',
      category: 'Tech',
      user_id: 'user-456',
      full_document: 'Documento completo'
    };
    
    await result.current.executeRemix(mockPRD as any, 'user-123');
    
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'PRD copiado!',
          description: expect.stringContaining('Redirecionando')
        })
      );
    });
  });
});
