-- Adicionar coluna description na tabela document_history
ALTER TABLE public.document_history 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Criar índice para melhor performance em buscas
CREATE INDEX IF NOT EXISTS idx_document_history_description ON public.document_history(description);