-- Corrigir RLS policy para permitir leitura pública do leaderboard
-- (necessário para visitantes anônimos visualizarem o leaderboard)

DROP POLICY IF EXISTS "Anyone can view leaderboard" ON event_participants;

CREATE POLICY "Public can view event leaderboard" 
  ON event_participants
  FOR SELECT 
  TO anon, authenticated
  USING (true);

-- Comentário: Esta policy permite que qualquer pessoa (logada ou não) 
-- visualize os dados do leaderboard de eventos