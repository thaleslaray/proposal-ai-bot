-- FASE 10: Tabela de log de controle do evento
CREATE TABLE IF NOT EXISTS public.event_control_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug TEXT NOT NULL REFERENCES public.events(slug) ON DELETE CASCADE,
  action TEXT NOT NULL,
  team_name TEXT,
  triggered_by UUID REFERENCES auth.users(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- FASE 2: Adicionar coluna para nomes customizados de times
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS team_names JSONB DEFAULT '{}';

-- FASE 3 e 10: Adicionar coluna para marcar times que já apresentaram e modo aleatório
ALTER TABLE public.event_broadcast_state
ADD COLUMN IF NOT EXISTS teams_presented TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS random_mode_enabled BOOLEAN DEFAULT false;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_event_control_log_event_slug ON public.event_control_log(event_slug);
CREATE INDEX IF NOT EXISTS idx_event_control_log_created_at ON public.event_control_log(created_at DESC);

-- RLS policies para event_control_log
ALTER TABLE public.event_control_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all logs"
  ON public.event_control_log
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert logs"
  ON public.event_control_log
  FOR INSERT
  WITH CHECK (true);

-- Comentários
COMMENT ON TABLE public.event_control_log IS 'Log de todas as ações de controle do evento para auditoria';
COMMENT ON COLUMN public.events.team_names IS 'Nomes customizados dos times em formato JSON: {"time_1": "Startup ABC", "time_2": "Tech Innovators"}';
COMMENT ON COLUMN public.event_broadcast_state.teams_presented IS 'Array de nomes de times que já apresentaram';
COMMENT ON COLUMN public.event_broadcast_state.random_mode_enabled IS 'Se true, o sistema seleciona times aleatoriamente';