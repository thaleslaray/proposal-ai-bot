-- ✅ FASE 2: Correção do Schema (adicionar target_user_id)

-- Adicionar coluna para separar "target_user_id" de "document_id"
ALTER TABLE prd_analytics 
ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Migrar dados existentes (profile_view e social_click usam document_id como user_id)
UPDATE prd_analytics
SET target_user_id = document_id::uuid
WHERE event_type IN ('profile_view', 'social_click')
  AND document_id IS NOT NULL
  AND target_user_id IS NULL;

-- Limpar document_id de eventos que não são de PRDs
UPDATE prd_analytics
SET document_id = NULL
WHERE event_type IN ('profile_view', 'social_click', 'page_view', 'search', 'upgrade_modal_opened', 'upgrade_button_clicked', 'whatsapp_otp_sent', 'whatsapp_login_success')
  AND target_user_id IS NOT NULL;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_prd_analytics_target_user ON prd_analytics(target_user_id);
CREATE INDEX IF NOT EXISTS idx_prd_analytics_event_type ON prd_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_prd_analytics_created_at ON prd_analytics(created_at DESC);

-- Comentar o propósito da coluna
COMMENT ON COLUMN prd_analytics.target_user_id IS 'ID do usuário alvo (ex: perfil visualizado em profile_view), separado de document_id que é para PRDs';