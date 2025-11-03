-- FASE 1: BANCO DE DADOS - Sistema de Votação com Pesos Configuráveis

-- 1.1. Tabela de Estado de Broadcast (Controla o que todos veem em tempo real)
CREATE TABLE IF NOT EXISTS public.event_broadcast_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug TEXT NOT NULL UNIQUE,
  current_state TEXT NOT NULL CHECK (current_state IN ('idle', 'presenting_team', 'voting_open', 'results_revealed')),
  current_team_name TEXT,
  voting_closes_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.event_broadcast_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view broadcast state"
  ON public.event_broadcast_state
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can update broadcast state"
  ON public.event_broadcast_state
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 1.2. Tabela de Configuração de Pesos
CREATE TABLE IF NOT EXISTS public.event_voting_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug TEXT NOT NULL UNIQUE,
  template_name TEXT NOT NULL,
  weight_viability DECIMAL(3,2) NOT NULL CHECK (weight_viability BETWEEN 0 AND 1),
  weight_innovation DECIMAL(3,2) NOT NULL CHECK (weight_innovation BETWEEN 0 AND 1),
  weight_pitch DECIMAL(3,2) NOT NULL CHECK (weight_pitch BETWEEN 0 AND 1),
  weight_demo DECIMAL(3,2) NOT NULL CHECK (weight_demo BETWEEN 0 AND 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT weights_sum_check CHECK (
    weight_viability + weight_innovation + weight_pitch + weight_demo = 1.00
  )
);

ALTER TABLE public.event_voting_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view voting weights"
  ON public.event_voting_weights
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage voting weights"
  ON public.event_voting_weights
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 1.3. Tabela de Votos Detalhados
CREATE TABLE IF NOT EXISTS public.event_team_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug TEXT NOT NULL,
  team_name TEXT NOT NULL,
  voter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  score_viability INTEGER NOT NULL CHECK (score_viability BETWEEN 0 AND 10),
  score_innovation INTEGER NOT NULL CHECK (score_innovation BETWEEN 0 AND 10),
  score_pitch INTEGER NOT NULL CHECK (score_pitch BETWEEN 0 AND 10),
  score_demo INTEGER NOT NULL CHECK (score_demo BETWEEN 0 AND 10),
  
  weighted_score DECIMAL(5,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(event_slug, team_name, voter_user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_votes_lookup ON public.event_team_votes(event_slug, team_name);

ALTER TABLE public.event_team_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own votes"
  ON public.event_team_votes
  FOR INSERT
  WITH CHECK (auth.uid() = voter_user_id);

CREATE POLICY "Anyone can view votes"
  ON public.event_team_votes
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can view all votes"
  ON public.event_team_votes
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 1.4. View Materializada para Agregação Rápida
CREATE MATERIALIZED VIEW IF NOT EXISTS public.event_team_scores AS
SELECT 
  event_slug,
  team_name,
  COUNT(*) as total_votes,
  ROUND(AVG(score_viability)::numeric, 2) as avg_viability,
  ROUND(AVG(score_innovation)::numeric, 2) as avg_innovation,
  ROUND(AVG(score_pitch)::numeric, 2) as avg_pitch,
  ROUND(AVG(score_demo)::numeric, 2) as avg_demo,
  ROUND(AVG(weighted_score)::numeric, 2) as avg_weighted_score
FROM public.event_team_votes
GROUP BY event_slug, team_name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_scores ON public.event_team_scores(event_slug, team_name);

-- Função para atualizar a view materializada
CREATE OR REPLACE FUNCTION public.refresh_team_scores()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.event_team_scores;
  RETURN NULL;
END;
$$;

-- Trigger para atualizar automaticamente
DROP TRIGGER IF EXISTS refresh_team_scores_trigger ON public.event_team_votes;
CREATE TRIGGER refresh_team_scores_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.event_team_votes
FOR EACH STATEMENT
EXECUTE FUNCTION public.refresh_team_scores();

-- Inserir templates padrão (para facilitar)
INSERT INTO public.event_voting_weights (event_slug, template_name, weight_viability, weight_innovation, weight_pitch, weight_demo)
VALUES 
  ('default-hybrid', 'hybrid', 0.35, 0.20, 0.30, 0.15),
  ('default-viability', 'viability_focused', 0.40, 0.25, 0.20, 0.15),
  ('default-innovation', 'innovation_focused', 0.25, 0.40, 0.25, 0.10),
  ('default-balanced', 'balanced', 0.25, 0.25, 0.25, 0.25)
ON CONFLICT (event_slug) DO NOTHING;