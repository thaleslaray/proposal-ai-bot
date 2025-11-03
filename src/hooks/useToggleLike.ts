import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface UseToggleLikeOptions {
  onOptimisticUpdate?: (prdId: string, isLiked: boolean, newCount: number) => void;
  onSuccess?: (prdId: string, isLiked: boolean, likesCount: number) => void;
  onError?: (prdId: string, wasLiked: boolean, originalCount: number) => void;
}

interface ToggleLikeResult {
  isLiked: boolean;
  likesCount: number;
  error?: string;
}

export const useToggleLike = (options?: UseToggleLikeOptions) => {
  const [isLoading, setIsLoading] = useState(false);

  const toggleLike = async (
    prdId: string,
    currentIsLiked: boolean,
    currentLikesCount: number
  ): Promise<ToggleLikeResult> => {
    setIsLoading(true);

    // Calcular novo estado otimista
    const newLikedState = !currentIsLiked;
    const optimisticCount = newLikedState
      ? currentLikesCount + 1
      : Math.max(0, currentLikesCount - 1);

    // Aplicar update otimista via callback
    options?.onOptimisticUpdate?.(prdId, newLikedState, optimisticCount);

    // Mostrar feedback imediato
    toast.success(newLikedState ? '❤️ PRD curtido!' : '💔 Like removido');

    try {
      // Obter token de autenticação
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Você precisa estar autenticado para curtir');
      }

      // Fazer request manual para controle total
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/toggle-prd-like`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ document_id: prdId }),
        }
      );

      // Extrair JSON com tratamento de erro
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        logger.error('Failed to parse response JSON:', jsonError);
        throw new Error('Erro ao processar resposta do servidor');
      }

      // Verificar se houve erro no backend
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Erro ao curtir PRD');
      }

      // Sincronizar com resposta real do backend
      options?.onSuccess?.(prdId, data.isLiked, data.likesCount);

      setIsLoading(false);
      return {
        isLiked: data.isLiked,
        likesCount: data.likesCount,
      };
    } catch (error: unknown) {
      logger.error('Error toggling like:', error);

      // Rollback via callback
      options?.onError?.(prdId, currentIsLiked, currentLikesCount);

      // Mostrar erro específico extraído do backend
      const errorMessage = error instanceof Error ? error.message : 'Erro ao curtir PRD';
      toast.error(errorMessage);

      setIsLoading(false);
      return {
        isLiked: currentIsLiked,
        likesCount: currentLikesCount,
        error: errorMessage,
      };
    }
  };

  return { toggleLike, isLoading };
};
