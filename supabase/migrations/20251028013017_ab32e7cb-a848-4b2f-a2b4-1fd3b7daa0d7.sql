-- Função para incrementar estatísticas de evento quando PRD é criado
CREATE OR REPLACE FUNCTION public.increment_event_stats(
  p_user_id UUID,
  p_event_slug TEXT,
  p_points INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE event_participants
  SET 
    prds_created = prds_created + 1,
    points = points + p_points
  WHERE user_id = p_user_id 
    AND event_slug = p_event_slug;
END;
$$;