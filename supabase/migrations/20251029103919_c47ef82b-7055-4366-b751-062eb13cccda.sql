-- Criar tabela para rastrear origem de usuários
CREATE TABLE IF NOT EXISTS public.user_acquisition (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  ref_code TEXT,
  referrer TEXT,
  landing_page TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Índices para queries comuns
CREATE INDEX idx_user_acquisition_user_id ON public.user_acquisition(user_id);
CREATE INDEX idx_user_acquisition_utm_source ON public.user_acquisition(utm_source);
CREATE INDEX idx_user_acquisition_utm_campaign ON public.user_acquisition(utm_campaign);
CREATE INDEX idx_user_acquisition_ref_code ON public.user_acquisition(ref_code);

-- Enable RLS
ALTER TABLE public.user_acquisition ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own acquisition data"
  ON public.user_acquisition
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all acquisition data"
  ON public.user_acquisition
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert acquisition data"
  ON public.user_acquisition
  FOR INSERT
  WITH CHECK (true);

-- Comentários para documentação
COMMENT ON TABLE public.user_acquisition IS 'Rastreamento de origem de usuários via UTM parameters';
COMMENT ON COLUMN public.user_acquisition.utm_source IS 'Fonte do tráfego (ex: instagram, google, email)';
COMMENT ON COLUMN public.user_acquisition.utm_campaign IS 'Nome da campanha (ex: evento-funis, black-friday)';
COMMENT ON COLUMN public.user_acquisition.ref_code IS 'Código de referência para afiliados/parceiros';