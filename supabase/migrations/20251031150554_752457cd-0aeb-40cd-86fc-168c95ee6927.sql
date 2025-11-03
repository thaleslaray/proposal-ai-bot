-- Criar view para status de votação dos participantes
CREATE OR REPLACE VIEW event_participants_voting_status AS
SELECT 
  ep.event_slug,
  ep.user_id,
  p.name,
  p.username,
  p.email,
  p.avatar_url,
  ebs.current_team_name as voting_for_team,
  CASE 
    WHEN etv.voter_user_id IS NOT NULL THEN true
    ELSE false
  END as has_voted,
  etv.created_at as voted_at,
  etv.weighted_score,
  etv.score_viability,
  etv.score_innovation,
  etv.score_pitch,
  etv.score_demo,
  ep.registered_at
FROM event_participants ep
LEFT JOIN profiles p ON p.id = ep.user_id
LEFT JOIN event_broadcast_state ebs ON ebs.event_slug = ep.event_slug
LEFT JOIN event_team_votes etv ON etv.voter_user_id = ep.user_id 
  AND etv.event_slug = ep.event_slug 
  AND etv.team_name = ebs.current_team_name
ORDER BY has_voted DESC, p.name ASC;

-- Permitir leitura da view por admins
GRANT SELECT ON event_participants_voting_status TO authenticated;

-- Criar função para obter métricas de votação
CREATE OR REPLACE FUNCTION get_voting_metrics(p_event_slug text, p_team_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  total_participants integer;
  total_voted integer;
  avg_viability numeric;
  avg_innovation numeric;
  avg_pitch numeric;
  avg_demo numeric;
  avg_weighted numeric;
BEGIN
  -- Contar participantes
  SELECT COUNT(*) INTO total_participants
  FROM event_participants
  WHERE event_slug = p_event_slug;
  
  -- Contar votos e calcular médias
  SELECT 
    COUNT(*),
    AVG(score_viability),
    AVG(score_innovation),
    AVG(score_pitch),
    AVG(score_demo),
    AVG(weighted_score)
  INTO total_voted, avg_viability, avg_innovation, avg_pitch, avg_demo, avg_weighted
  FROM event_team_votes
  WHERE event_slug = p_event_slug 
    AND team_name = p_team_name;
  
  -- Construir resultado
  result := jsonb_build_object(
    'total_participants', total_participants,
    'total_voted', COALESCE(total_voted, 0),
    'participation_rate', CASE 
      WHEN total_participants > 0 THEN ROUND((COALESCE(total_voted, 0)::numeric / total_participants) * 100, 1)
      ELSE 0
    END,
    'averages', jsonb_build_object(
      'viability', ROUND(COALESCE(avg_viability, 0), 2),
      'innovation', ROUND(COALESCE(avg_innovation, 0), 2),
      'pitch', ROUND(COALESCE(avg_pitch, 0), 2),
      'demo', ROUND(COALESCE(avg_demo, 0), 2),
      'weighted', ROUND(COALESCE(avg_weighted, 0), 2)
    )
  );
  
  RETURN result;
END;
$$;