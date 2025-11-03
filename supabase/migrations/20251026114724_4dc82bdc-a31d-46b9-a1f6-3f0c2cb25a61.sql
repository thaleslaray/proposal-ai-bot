-- Correção: Usar tabela normal em vez de materialized view

-- 1. Remover materialized view
DROP MATERIALIZED VIEW IF EXISTS admin_stats_cache CASCADE;

-- 2. Criar tabela de cache com RLS
CREATE TABLE IF NOT EXISTS admin_stats_cache (
  id INT PRIMARY KEY DEFAULT 1,
  total_users INT NOT NULL,
  docs_today INT NOT NULL,
  docs_week INT NOT NULL,
  docs_total INT NOT NULL,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT only_one_row CHECK (id = 1)
);

-- 3. Habilitar RLS
ALTER TABLE admin_stats_cache ENABLE ROW LEVEL SECURITY;

-- 4. Policy para admins
CREATE POLICY "Only admins can view stats cache"
ON admin_stats_cache
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- 5. Função para atualizar cache
CREATE OR REPLACE FUNCTION refresh_admin_stats_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO admin_stats_cache (id, total_users, docs_today, docs_week, docs_total, last_updated)
  VALUES (
    1,
    (SELECT COUNT(*) FROM profiles),
    (SELECT COUNT(*) FROM document_history WHERE created_at >= CURRENT_DATE),
    (SELECT COUNT(*) FROM document_history WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
    (SELECT COUNT(*) FROM document_history),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    total_users = EXCLUDED.total_users,
    docs_today = EXCLUDED.docs_today,
    docs_week = EXCLUDED.docs_week,
    docs_total = EXCLUDED.docs_total,
    last_updated = EXCLUDED.last_updated;
END;
$$;

-- 6. Trigger function
CREATE OR REPLACE FUNCTION trigger_refresh_admin_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM refresh_admin_stats_cache();
  RETURN NEW;
END;
$$;

-- 7. Recriar trigger
DROP TRIGGER IF EXISTS update_admin_stats_on_doc ON document_history;
CREATE TRIGGER update_admin_stats_on_doc
AFTER INSERT OR DELETE ON document_history
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_admin_stats();

-- 8. Popular cache inicial
SELECT refresh_admin_stats_cache();