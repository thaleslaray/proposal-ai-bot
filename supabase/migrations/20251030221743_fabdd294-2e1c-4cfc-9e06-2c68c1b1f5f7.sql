-- Criar função RPC para retornar top usuários por custo (agregado no SQL)
CREATE OR REPLACE FUNCTION get_top_users_by_cost(limit_count integer DEFAULT 5)
RETURNS TABLE (
  user_id uuid,
  total_cost numeric,
  total_tokens bigint
) 
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    user_id,
    COALESCE(SUM(cost_usd), 0) as total_cost,
    COALESCE(SUM(tokens_used), 0) as total_tokens
  FROM api_usage
  WHERE user_id IS NOT NULL
  GROUP BY user_id
  ORDER BY total_cost DESC
  LIMIT limit_count;
$$;