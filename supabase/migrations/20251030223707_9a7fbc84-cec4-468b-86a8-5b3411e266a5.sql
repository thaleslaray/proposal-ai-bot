-- Criar função para obter estatísticas reais do funil
CREATE OR REPLACE FUNCTION get_funnel_stats()
RETURNS TABLE (
  total_users bigint,
  users_with_first_prd bigint,
  engaged_users bigint
) 
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    (SELECT COUNT(*) FROM auth.users) as total_users,
    (SELECT COUNT(DISTINCT user_id) FROM document_history) as users_with_first_prd,
    (SELECT COUNT(*) FROM (
      SELECT user_id 
      FROM document_history 
      GROUP BY user_id 
      HAVING COUNT(*) >= 3
    ) subquery) as engaged_users;
$$;