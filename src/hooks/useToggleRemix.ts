import { useState } from 'react';
import { PRDDocument } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { PRDDocument } from '@/types';
import { toast } from 'sonner';
import { PRDDocument } from '@/types';
import { logger } from '@/lib/logger';
import { PRDDocument } from '@/types';

interface UseToggleRemixOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const useToggleRemix = (options?: UseToggleRemixOptions) => {
  const [isLoading, setIsLoading] = useState(false);

  const executeRemix = async (prd: PRDDocument, userId: string | undefined): Promise<void> => {
    if (isLoading) return;

    // Validação de autenticação
    if (!userId) {
      toast.info('Faça login para fazer remix');
      return;
    }

    setIsLoading(true);

    try {
      const isOwnPRD = prd.user_id === userId;

      // Salvar o PRD completo para remix no localStorage
      localStorage.setItem('remix_idea', prd.full_document);
      localStorage.setItem('remix_original_id', prd.id);

      // Registrar analytics para todos os remixes
      const { error: analyticsError } = await supabase.from('prd_analytics').insert({
        document_id: prd.id,
        event_type: 'remix',
        user_id: userId,
        metadata: { is_self_remix: isOwnPRD },
      });

      if (analyticsError) {
        logger.error('Erro ao registrar analytics:', analyticsError);
      }

      // Incrementar contador APENAS se não for próprio PRD
      if (!isOwnPRD) {
        const { error: remixError } = await supabase.rpc('increment_remixes', { doc_id: prd.id });

        if (remixError) {
          logger.error('Erro ao incrementar remixes:', remixError);
        }
      }

      toast.success(
        isOwnPRD
          ? '🔄 Criando nova versão do seu PRD...'
          : '🔄 Redirecionando para criar seu remix...'
      );

      if (options?.onSuccess) {
        options.onSuccess();
      }

      // Redirecionar para a home após um delay
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (error) {
      logger.error('Erro ao processar remix:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao processar remix';
      toast.error(errorMessage);

      if (options?.onError) {
        options.onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return { executeRemix, isLoading };
};
