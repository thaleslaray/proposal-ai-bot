-- ========================================
-- SISTEMA DE EVENTOS PARA HACKATHONS
-- ========================================

-- Criar tabela de eventos
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  custom_limit INTEGER DEFAULT -1,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_events_active ON events(is_active);

-- Criar tabela de participantes de eventos
CREATE TABLE event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug TEXT NOT NULL REFERENCES events(slug) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  prds_created INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  UNIQUE(event_slug, user_id)
);

CREATE INDEX idx_event_participants_event ON event_participants(event_slug);
CREATE INDEX idx_event_participants_user ON event_participants(user_id);
CREATE INDEX idx_event_participants_points ON event_participants(event_slug, points DESC);

-- Criar tabela de ações de eventos (tracking)
CREATE TABLE event_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug TEXT NOT NULL REFERENCES events(slug) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  prd_id UUID REFERENCES document_history(id) ON DELETE SET NULL,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_event_actions_event ON event_actions(event_slug, created_at DESC);
CREATE INDEX idx_event_actions_user ON event_actions(user_id);

-- ========================================
-- RLS POLICIES
-- ========================================

-- Events: públicos para leitura quando ativos
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are public" ON events
  FOR SELECT TO authenticated, anon
  USING (is_active = true);

CREATE POLICY "Admins manage events" ON events
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Event Participants: usuário vê própria inscrição, mas leaderboard é público
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own participation" ON event_participants
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view leaderboard" ON event_participants
  FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY "Service role manages participants" ON event_participants
  FOR ALL TO authenticated
  USING (auth.role() = 'service_role');

-- Event Actions: rastreamento público para transparência
ALTER TABLE event_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view event actions" ON event_actions
  FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY "Service role manages actions" ON event_actions
  FOR ALL TO authenticated
  USING (auth.role() = 'service_role');

-- ========================================
-- FUNCTIONS
-- ========================================

-- Função para incrementar PRDs criados por participante
CREATE OR REPLACE FUNCTION increment_event_participant_prds(
  p_event_slug TEXT,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE event_participants
  SET prds_created = prds_created + 1
  WHERE event_slug = p_event_slug AND user_id = p_user_id;
END;
$$;

-- Função para incrementar pontos de participante
CREATE OR REPLACE FUNCTION increment_event_participant_points(
  p_event_slug TEXT,
  p_user_id UUID,
  p_points INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE event_participants
  SET points = points + p_points
  WHERE event_slug = p_event_slug AND user_id = p_user_id;
END;
$$;

-- Função para obter evento ativo do usuário
CREATE OR REPLACE FUNCTION get_user_active_event(p_user_id UUID)
RETURNS TABLE(
  event_slug TEXT,
  event_name TEXT,
  custom_limit INTEGER,
  end_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.slug,
    e.name,
    e.custom_limit,
    e.end_date
  FROM events e
  INNER JOIN event_participants ep ON ep.event_slug = e.slug
  WHERE ep.user_id = p_user_id
    AND e.is_active = true
    AND NOW() BETWEEN e.start_date AND e.end_date
  LIMIT 1;
END;
$$;

-- Habilitar Realtime para event_actions (feed ao vivo)
ALTER PUBLICATION supabase_realtime ADD TABLE event_actions;