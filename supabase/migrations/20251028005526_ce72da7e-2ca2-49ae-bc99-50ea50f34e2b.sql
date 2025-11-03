-- Atualizar get_prd_limit para verificar eventos ativos PRIMEIRO
CREATE OR REPLACE FUNCTION public.get_prd_limit(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_limit integer;
  event_limit integer;
BEGIN
  -- PRIORIDADE 1: Verificar se está em evento ativo
  SELECT e.custom_limit INTO event_limit
  FROM events e
  INNER JOIN event_participants ep ON ep.event_slug = e.slug
  WHERE ep.user_id = _user_id
    AND e.is_active = true
    AND NOW() BETWEEN e.start_date AND e.end_date
  LIMIT 1;
  
  -- Se está em evento ativo, retorna o limite do evento
  IF event_limit IS NOT NULL THEN
    RETURN event_limit;
  END IF;
  
  -- PRIORIDADE 2: Verificar roles em ordem de prioridade
  IF has_role(_user_id, 'admin') THEN
    SELECT daily_limit INTO user_limit FROM prd_limits_config WHERE role = 'admin';
  ELSIF has_role(_user_id, 'lifetime') THEN
    SELECT daily_limit INTO user_limit FROM prd_limits_config WHERE role = 'lifetime';
  ELSIF has_role(_user_id, 'student') THEN
    SELECT daily_limit INTO user_limit FROM prd_limits_config WHERE role = 'student';
  ELSE
    SELECT daily_limit INTO user_limit FROM prd_limits_config WHERE role = 'free';
  END IF;
  
  RETURN COALESCE(user_limit, 1);
END;
$$;