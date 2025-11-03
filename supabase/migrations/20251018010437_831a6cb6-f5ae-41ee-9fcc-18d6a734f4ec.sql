-- Adicionar novos roles ao enum app_role
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'student';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'free';

-- Adicionar colunas de controle de erro na tabela hotmart_validation_cache
ALTER TABLE public.hotmart_validation_cache 
  ADD COLUMN IF NOT EXISTS validation_status text DEFAULT 'success',
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS error_details jsonb;

-- Comentários para documentação
COMMENT ON COLUMN public.hotmart_validation_cache.validation_status IS 'Valores possíveis: success, error, timeout, pending';
COMMENT ON COLUMN public.hotmart_validation_cache.error_message IS 'Mensagem amigável para exibição no admin';
COMMENT ON COLUMN public.hotmart_validation_cache.error_details IS 'Stack trace completo e detalhes técnicos do erro';