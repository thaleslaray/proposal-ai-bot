import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useToggleLike } from '../useToggleLike';
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
    functions: {
      invoke: vi.fn()
    }
  }
}));

describe('useToggleLike', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar função toggleLike e estado isLoading', () => {
    const { result } = renderHook(() => useToggleLike());
    
    expect(result.current.toggleLike).toBeDefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('deve exibir erro quando usuário não está autenticado', async () => {
    const { result } = renderHook(() => useToggleLike());
    
    const response = await result.current.toggleLike('prd-1', false, 10);
    
    expect(response.error).toBeDefined();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Erro',
        description: 'Você precisa estar logado para curtir um PRD',
        variant: 'destructive'
      })
    );
  });

  it('deve executar callback onOptimisticUpdate', async () => {
    const onOptimisticUpdate = vi.fn();
    const { result } = renderHook(() => 
      useToggleLike({ onOptimisticUpdate })
    );
    
    await result.current.toggleLike('prd-1', false, 10);
    
    expect(onOptimisticUpdate).toHaveBeenCalledWith(true, 11);
  });

  it('deve executar callback onSuccess quando like é bem-sucedido', async () => {
    const onSuccess = vi.fn();
    const { supabase } = await import('@/integrations/supabase/client');
    
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { isLiked: true, likesCount: 11 },
      error: null
    });
    
    const { result } = renderHook(() => useToggleLike({ onSuccess }));
    
    await result.current.toggleLike('prd-1', false, 10);
    
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith({ isLiked: true, likesCount: 11 });
    });
  });

  it('deve executar callback onError quando ocorre falha', async () => {
    const onError = vi.fn();
    const { supabase } = await import('@/integrations/supabase/client');
    
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: { message: 'Erro de rede' }
    });
    
    const { result } = renderHook(() => useToggleLike({ onError }));
    
    await result.current.toggleLike('prd-1', false, 10);
    
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(false, 10);
    });
  });
});
