-- Corrigir função get_active_users_24h para contar usuários com updated_at < 24h E que têm documentos
CREATE OR REPLACE FUNCTION public.get_active_users_24h()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  active_count bigint;
BEGIN
  -- Contar usuários ativos: updated_at < 24h E tem documentos
  SELECT COUNT(DISTINCT au.id)
  INTO active_count
  FROM auth.users au
  LEFT JOIN profiles p ON p.id = au.id
  WHERE GREATEST(
    au.updated_at, 
    COALESCE(p.updated_at, au.updated_at)
  ) >= NOW() - INTERVAL '24 hours'
  AND EXISTS (
    SELECT 1 FROM document_history dh WHERE dh.user_id = au.id
  );
  
  RETURN COALESCE(active_count, 0);
END;
$$;