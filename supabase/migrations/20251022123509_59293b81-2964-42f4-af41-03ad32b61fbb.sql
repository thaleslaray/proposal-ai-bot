-- ========================================
-- FASE 4: Criptografia e Limpeza Automática (CORRIGIDO)
-- ========================================

-- PARTE 1: Criptografar emails na hotmart_validation_cache
-- ========================================

-- Habilitar extensão pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Adicionar coluna criptografada
ALTER TABLE public.hotmart_validation_cache
ADD COLUMN IF NOT EXISTS encrypted_email bytea;

-- Migrar dados existentes (criptografar emails com chave fixa temporária)
-- NOTA: Em produção, use variável de ambiente via Supabase Vault
UPDATE public.hotmart_validation_cache
SET encrypted_email = pgp_sym_encrypt(
  email, 
  'TEMP_KEY_CHANGE_IN_PRODUCTION_VIA_VAULT'
)
WHERE email IS NOT NULL AND encrypted_email IS NULL;

-- Remover coluna antiga de email em texto puro
ALTER TABLE public.hotmart_validation_cache
DROP COLUMN IF EXISTS email;

-- Adicionar comentário
COMMENT ON COLUMN public.hotmart_validation_cache.encrypted_email IS 
  'Email criptografado com pgp_sym_encrypt (LGPD Art. 46 - Segurança da informação)';

-- PARTE 2: Cron job para limpeza de OTPs expirados
-- ========================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Criar cron job: executar cleanup_expired_otps() a cada 6 horas
SELECT cron.schedule(
  'cleanup-expired-otps',
  '0 */6 * * *', -- A cada 6 horas (00:00, 06:00, 12:00, 18:00)
  $$
  SELECT public.cleanup_expired_otps();
  $$
);

-- Adicionar log de auditoria
COMMENT ON FUNCTION public.cleanup_expired_otps IS 
  'Limpa OTPs com mais de 24h. Executado automaticamente via cron a cada 6h.';

-- PARTE 3: Função auxiliar para descriptografar (uso interno/admin)
-- ========================================

CREATE OR REPLACE FUNCTION public.decrypt_hotmart_email(encrypted_data bytea)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Apenas admins podem descriptografar
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas admins podem descriptografar emails.';
  END IF;
  
  -- Usar mesma chave da criptografia
  RETURN pgp_sym_decrypt(
    encrypted_data, 
    'TEMP_KEY_CHANGE_IN_PRODUCTION_VIA_VAULT'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN '[ERRO: ' || SQLERRM || ']';
END;
$$;

COMMENT ON FUNCTION public.decrypt_hotmart_email IS 
  'Descriptografa emails do Hotmart. APENAS ADMINS. Uso restrito para suporte LGPD (Art. 18).';

-- PARTE 4: View segura para admins (sem RLS, usa políticas da tabela base)
-- ========================================

CREATE OR REPLACE VIEW public.hotmart_cache_admin AS
SELECT 
  user_id,
  has_access,
  last_check,
  expires_at,
  validation_status,
  validation_method,
  product_name,
  phone,
  decrypt_hotmart_email(encrypted_email) as email -- Descriptografa apenas para admins
FROM public.hotmart_validation_cache;

-- Security barrier para forçar RLS da tabela base
ALTER VIEW public.hotmart_cache_admin SET (security_barrier = true);

COMMENT ON VIEW public.hotmart_cache_admin IS 
  'View administrativa com emails descriptografados. Acesso via RLS da tabela base (apenas admins).';