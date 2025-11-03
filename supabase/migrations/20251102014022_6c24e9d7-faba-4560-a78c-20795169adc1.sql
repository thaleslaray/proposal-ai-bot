-- Tornar start_date e end_date nullable na tabela events
ALTER TABLE events 
  ALTER COLUMN start_date DROP NOT NULL,
  ALTER COLUMN end_date DROP NOT NULL;

-- Adicionar constraint para garantir consistência:
-- Ambas NULL (permanente) OU ambas NOT NULL com end_date > start_date
ALTER TABLE events 
  ADD CONSTRAINT events_dates_consistency 
  CHECK (
    (start_date IS NULL AND end_date IS NULL) OR 
    (start_date IS NOT NULL AND end_date IS NOT NULL AND end_date > start_date)
  );

-- Atualizar função get_user_prd_permissions para considerar eventos permanentes
CREATE OR REPLACE FUNCTION public.get_user_prd_permissions(_user_id uuid)
RETURNS TABLE(can_toggle_visibility boolean, can_delete boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verificar se está em evento ativo (incluindo permanentes sem data)
  IF EXISTS (
    SELECT 1 FROM event_participants ep
    INNER JOIN events e ON e.slug = ep.event_slug
    WHERE ep.user_id = _user_id
      AND e.is_active = true
      AND (
        -- Evento com datas definidas: verificar range
        (e.start_date IS NOT NULL AND NOW() BETWEEN e.start_date AND e.end_date)
        OR
        -- Evento permanente sem datas: sempre ativo
        (e.start_date IS NULL AND e.end_date IS NULL)
      )
  ) THEN
    RETURN QUERY SELECT pc.can_toggle_visibility, pc.can_delete 
    FROM prd_permissions_config pc WHERE pc.role = 'event_participant';
    RETURN;
  END IF;

  -- Prioridade normal: admin > lifetime > student > free
  IF has_role(_user_id, 'admin') THEN
    RETURN QUERY SELECT pc.can_toggle_visibility, pc.can_delete 
    FROM prd_permissions_config pc WHERE pc.role = 'admin';
  ELSIF has_role(_user_id, 'lifetime') THEN
    RETURN QUERY SELECT pc.can_toggle_visibility, pc.can_delete 
    FROM prd_permissions_config pc WHERE pc.role = 'lifetime';
  ELSIF has_role(_user_id, 'student') THEN
    RETURN QUERY SELECT pc.can_toggle_visibility, pc.can_delete 
    FROM prd_permissions_config pc WHERE pc.role = 'student';
  ELSE
    RETURN QUERY SELECT pc.can_toggle_visibility, pc.can_delete 
    FROM prd_permissions_config pc WHERE pc.role = 'free';
  END IF;
END;
$function$;