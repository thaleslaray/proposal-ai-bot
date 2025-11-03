-- Adicionar configuração de permissões para participantes de eventos
INSERT INTO prd_permissions_config (role, can_toggle_visibility, can_delete)
VALUES ('event_participant', true, false)
ON CONFLICT (role) DO NOTHING;

-- Atualizar função get_user_prd_permissions para considerar eventos ativos
CREATE OR REPLACE FUNCTION public.get_user_prd_permissions(_user_id uuid)
RETURNS TABLE(can_toggle_visibility boolean, can_delete boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- NOVA PRIORIDADE: Verificar se está em evento ativo
  IF EXISTS (
    SELECT 1 FROM event_participants ep
    INNER JOIN events e ON e.slug = ep.event_slug
    WHERE ep.user_id = _user_id
      AND e.is_active = true
      AND NOW() BETWEEN e.start_date AND e.end_date
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