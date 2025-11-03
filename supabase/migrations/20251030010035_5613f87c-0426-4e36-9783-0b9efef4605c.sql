-- =============================================
-- FASE 1: OTIMIZAÇÕES DE PERFORMANCE (CORRIGIDA)
-- Sem CONCURRENTLY para rodar em transação
-- =============================================

-- 1️⃣ ÍNDICES ESTRATÉGICOS (sem CONCURRENTLY)
CREATE INDEX IF NOT EXISTS idx_document_history_user_id 
  ON document_history(user_id);

CREATE INDEX IF NOT EXISTS idx_document_history_user_public 
  ON document_history(user_id, is_public);

CREATE INDEX IF NOT EXISTS idx_user_acquisition_created 
  ON user_acquisition(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_acquisition_source 
  ON user_acquisition(utm_source) 
  WHERE utm_source IS NOT NULL;

-- 2️⃣ CACHE DO FUNIL (pré-calculado)
CREATE TABLE IF NOT EXISTS funnel_stats_cache (
  id INTEGER PRIMARY KEY DEFAULT 1,
  total_users INTEGER DEFAULT 0,
  first_prd_users INTEGER DEFAULT 0,
  engaged_users INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Função para atualizar cache do funil
CREATE OR REPLACE FUNCTION refresh_funnel_stats()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO funnel_stats_cache (
    id,
    total_users,
    first_prd_users,
    engaged_users,
    last_updated
  )
  SELECT 
    1,
    (SELECT COUNT(*) FROM auth.users),
    (SELECT COUNT(DISTINCT user_id) FROM document_history),
    (SELECT COUNT(DISTINCT user_id) FROM document_history WHERE is_public = true),
    NOW()
  ON CONFLICT (id) DO UPDATE SET
    total_users = EXCLUDED.total_users,
    first_prd_users = EXCLUDED.first_prd_users,
    engaged_users = EXCLUDED.engaged_users,
    last_updated = EXCLUDED.last_updated;
END;
$$;

-- Inicializar cache
SELECT refresh_funnel_stats();

-- Triggers para manter cache atualizado
CREATE OR REPLACE FUNCTION trigger_refresh_funnel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM refresh_funnel_stats();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_funnel_on_prd_change ON document_history;
CREATE TRIGGER update_funnel_on_prd_change
  AFTER INSERT OR UPDATE OR DELETE ON document_history
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_funnel();

DROP TRIGGER IF EXISTS update_funnel_on_user_change ON auth.users;
CREATE TRIGGER update_funnel_on_user_change
  AFTER INSERT OR DELETE ON auth.users
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_funnel();

-- 3️⃣ RPC: Performance por Fonte
CREATE OR REPLACE FUNCTION get_source_performance(
  start_date TIMESTAMPTZ,
  days INT
)
RETURNS TABLE(
  source TEXT,
  total_users BIGINT,
  first_prd_users BIGINT,
  first_prd_rate NUMERIC,
  avg_prds_per_user NUMERIC,
  public_prd_users BIGINT,
  public_rate NUMERIC,
  engagement_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH source_users AS (
    SELECT 
      COALESCE(ua.utm_source, 'Direct') as source,
      ua.user_id
    FROM user_acquisition ua
    WHERE ua.created_at >= start_date
  ),
  user_stats AS (
    SELECT 
      su.source,
      su.user_id,
      COUNT(dh.id) as prd_count,
      COUNT(CASE WHEN dh.is_public THEN 1 END) as public_count
    FROM source_users su
    LEFT JOIN document_history dh ON dh.user_id = su.user_id
    GROUP BY su.source, su.user_id
  )
  SELECT 
    us.source::TEXT,
    COUNT(DISTINCT us.user_id)::BIGINT as total_users,
    COUNT(DISTINCT CASE WHEN us.prd_count > 0 THEN us.user_id END)::BIGINT as first_prd_users,
    ROUND(
      (COUNT(DISTINCT CASE WHEN us.prd_count > 0 THEN us.user_id END)::NUMERIC / 
       NULLIF(COUNT(DISTINCT us.user_id), 0) * 100),
      2
    ) as first_prd_rate,
    ROUND(
      AVG(us.prd_count),
      2
    ) as avg_prds_per_user,
    COUNT(DISTINCT CASE WHEN us.public_count > 0 THEN us.user_id END)::BIGINT as public_prd_users,
    ROUND(
      (COUNT(DISTINCT CASE WHEN us.public_count > 0 THEN us.user_id END)::NUMERIC / 
       NULLIF(COUNT(DISTINCT CASE WHEN us.prd_count > 0 THEN us.user_id END), 0) * 100),
      2
    ) as public_rate,
    ROUND(
      (COUNT(DISTINCT CASE WHEN us.prd_count > 0 THEN us.user_id END)::NUMERIC / 
       NULLIF(COUNT(DISTINCT us.user_id), 0) * 100) * 0.5 +
      (COUNT(DISTINCT CASE WHEN us.public_count > 0 THEN us.user_id END)::NUMERIC / 
       NULLIF(COUNT(DISTINCT CASE WHEN us.prd_count > 0 THEN us.user_id END), 0) * 100) * 0.3 +
      AVG(us.prd_count) * 5,
      2
    ) as engagement_score
  FROM user_stats us
  GROUP BY us.source
  ORDER BY engagement_score DESC;
END;
$$;

-- 4️⃣ RPC: Métricas Consolidadas
CREATE OR REPLACE FUNCTION get_acquisition_metrics(start_date TIMESTAMPTZ)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  WITH acquisition_users AS (
    SELECT DISTINCT user_id, utm_source, utm_campaign
    FROM user_acquisition
    WHERE created_at >= start_date
  ),
  user_with_prds AS (
    SELECT DISTINCT au.user_id
    FROM acquisition_users au
    INNER JOIN document_history dh ON dh.user_id = au.user_id
  ),
  source_stats AS (
    SELECT 
      COALESCE(utm_source, 'Direct') as source,
      COUNT(*) as count
    FROM acquisition_users
    GROUP BY COALESCE(utm_source, 'Direct')
    ORDER BY count DESC
  ),
  campaign_stats AS (
    SELECT 
      COALESCE(au.utm_campaign, 'Sem campanha') as name,
      COUNT(DISTINCT au.user_id) as users,
      COUNT(DISTINCT uwp.user_id) as conversions
    FROM acquisition_users au
    LEFT JOIN user_with_prds uwp ON uwp.user_id = au.user_id
    WHERE au.utm_campaign IS NOT NULL
    GROUP BY au.utm_campaign
    ORDER BY conversions DESC
    LIMIT 10
  )
  SELECT json_build_object(
    'total_access', (SELECT COUNT(*) FROM user_acquisition WHERE created_at >= start_date),
    'total_users', (SELECT COUNT(DISTINCT user_id) FROM user_acquisition WHERE created_at >= start_date),
    'conversion_rate', ROUND(
      (SELECT COUNT(*) FROM user_with_prds)::NUMERIC / 
      NULLIF((SELECT COUNT(DISTINCT user_id) FROM acquisition_users), 0) * 100,
      2
    ),
    'top_sources', (
      SELECT json_agg(json_build_object('source', source, 'count', count))
      FROM source_stats
      LIMIT 3
    ),
    'source_distribution', (
      SELECT json_agg(json_build_object('name', source, 'value', count))
      FROM source_stats
    ),
    'campaign_stats', (
      SELECT json_agg(json_build_object('name', name, 'users', users, 'conversions', conversions))
      FROM campaign_stats
    )
  ) INTO result;
  
  RETURN result;
END;
$$;