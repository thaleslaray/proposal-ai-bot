-- FASE 2: Criar trigger para estado inicial automático
CREATE OR REPLACE FUNCTION create_initial_broadcast_state()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO event_broadcast_state (
    event_slug, 
    current_state,
    current_team_name,
    voting_closes_at,
    teams_presented,
    random_mode_enabled
  ) VALUES (
    NEW.slug,
    'idle',
    NULL,
    NULL,
    '{}',
    false
  )
  ON CONFLICT (event_slug) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER create_broadcast_state_on_event_creation
AFTER INSERT ON events
FOR EACH ROW
EXECUTE FUNCTION create_initial_broadcast_state();