-- FASE 1: Criar estados faltantes para eventos antigos
INSERT INTO event_broadcast_state (
  event_slug, 
  current_state,
  current_team_name,
  voting_closes_at,
  teams_presented,
  random_mode_enabled
)
SELECT 
  e.slug,
  'idle'::text,
  NULL,
  NULL,
  '{}'::text[],
  false
FROM events e
LEFT JOIN event_broadcast_state ebs ON ebs.event_slug = e.slug
WHERE ebs.event_slug IS NULL
ON CONFLICT (event_slug) DO NOTHING;

-- FASE 2: Adicionar policy para permitir INSERT anônimo de estado inicial
CREATE POLICY "Allow anonymous insert initial idle state"
ON event_broadcast_state
FOR INSERT
TO public
WITH CHECK (
  -- Só permite se NÃO EXISTIR estado para este evento ainda
  NOT EXISTS (
    SELECT 1 FROM event_broadcast_state existing
    WHERE existing.event_slug = event_broadcast_state.event_slug
  )
  AND current_state = 'idle'
  AND current_team_name IS NULL
  AND voting_closes_at IS NULL
);