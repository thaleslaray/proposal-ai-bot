-- Corrigir get_active_users_24h para contar apenas criação de documentos nas últimas 24h
CREATE OR REPLACE FUNCTION public.get_active_users_24h()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COUNT(DISTINCT user_id)
  FROM document_history
  WHERE created_at >= NOW() - INTERVAL '24 hours';
$$;