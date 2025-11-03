-- Criar função otimizada que retorna roles e evento ativo em uma única query
CREATE OR REPLACE FUNCTION public.get_user_full_context(p_user_id UUID)
RETURNS TABLE (
  roles TEXT[],
  active_event_slug TEXT,
  active_event_name TEXT,
  event_custom_limit INTEGER,
  event_end_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ARRAY_AGG(DISTINCT ur.role::TEXT) FILTER (WHERE ur.role IS NOT NULL) as roles,
    e.slug as active_event_slug,
    e.name as active_event_name,
    e.custom_limit as event_custom_limit,
    e.end_date as event_end_date
  FROM user_roles ur
  LEFT JOIN event_participants ep ON ep.user_id = p_user_id
  LEFT JOIN events e ON e.slug = ep.event_slug 
    AND e.is_active = true 
    AND NOW() BETWEEN e.start_date AND e.end_date
  WHERE ur.user_id = p_user_id
  GROUP BY e.slug, e.name, e.custom_limit, e.end_date;
END;
$$;