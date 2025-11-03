-- Fase 2: Otimizações Backend

-- 1. Criar índices para queries mais rápidas
CREATE INDEX IF NOT EXISTS idx_document_history_created_at 
ON document_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_hotmart_cache_status_check 
ON hotmart_validation_cache(validation_status, last_check DESC);

CREATE INDEX IF NOT EXISTS idx_document_history_user_id 
ON document_history(user_id);

CREATE INDEX IF NOT EXISTS idx_prd_usage_date 
ON prd_usage_tracking(usage_date DESC);

-- 2. Criar materialized view para estatísticas (atualização instantânea)
CREATE MATERIALIZED VIEW IF NOT EXISTS admin_stats_cache AS
SELECT 
  (SELECT COUNT(*) FROM auth.users) as total_users,
  (SELECT COUNT(*) FROM document_history WHERE created_at >= CURRENT_DATE) as docs_today,
  (SELECT COUNT(*) FROM document_history WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as docs_week,
  (SELECT COUNT(*) FROM document_history) as docs_total,
  NOW() as last_updated;

-- Criar índice único para permitir REFRESH CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS admin_stats_cache_idx ON admin_stats_cache(last_updated);

-- 3. Função para refresh automático da view (pode ser chamada por cron ou trigger)
CREATE OR REPLACE FUNCTION refresh_admin_stats_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY admin_stats_cache;
END;
$$;

-- 4. Trigger para atualizar cache quando houver mudanças relevantes
CREATE OR REPLACE FUNCTION trigger_refresh_admin_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Refresh assíncrono (não bloqueia a operação)
  PERFORM refresh_admin_stats_cache();
  RETURN NEW;
END;
$$;

-- Trigger em document_history
DROP TRIGGER IF EXISTS update_admin_stats_on_doc ON document_history;
CREATE TRIGGER update_admin_stats_on_doc
AFTER INSERT OR DELETE ON document_history
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_admin_stats();