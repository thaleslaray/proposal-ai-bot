-- Corrigir definição de usuários engajados: 3+ PRDs em vez de PRDs públicos
CREATE OR REPLACE FUNCTION public.refresh_funnel_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    (SELECT COUNT(*) FROM (
      SELECT user_id 
      FROM document_history 
      GROUP BY user_id 
      HAVING COUNT(*) >= 3
    ) subquery),
    NOW()
  ON CONFLICT (id) DO UPDATE SET
    total_users = EXCLUDED.total_users,
    first_prd_users = EXCLUDED.first_prd_users,
    engaged_users = EXCLUDED.engaged_users,
    last_updated = EXCLUDED.last_updated;
END;
$function$;

-- Recalcular estatísticas com a nova definição
SELECT refresh_funnel_stats();