-- ========================================
-- AUDITORIA DE SEGURANÇA: Fases 1, 2 e 3
-- Proteção PII + XSS + Rate Limiting + Privacidade
-- ========================================

-- ========================================
-- FASE 1.1: Proteção de Dados Pessoais (LGPD)
-- ========================================

-- PASSO 1: Remover política pública INSEGURA
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- PASSO 2: Criar VIEW segura para dados públicos (sem email, phone)
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  username,
  name,
  bio,
  avatar_url,
  social_links,
  location,
  website,
  occupation
FROM public.profiles
WHERE username IS NOT NULL;

-- Habilitar security barrier (importante!)
ALTER VIEW public.public_profiles SET (security_barrier = true);

-- PASSO 3: Políticas RLS para `profiles` (tabela privada)
CREATE POLICY "users_view_own_complete_profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- A política de update já existe: "Users can update own profile"
-- A política admin já existe: "Admins can view all profiles"

-- PASSO 4: Políticas RLS para VIEW pública
-- Nota: Views não suportam RLS diretamente, mas security_barrier protege

-- PASSO 5: Adicionar campos de consentimento LGPD
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS lgpd_consent_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS lgpd_consent_version TEXT DEFAULT 'v1.0';

-- PASSO 6: Índice para busca por email (Art. 18 LGPD - Portabilidade)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

COMMENT ON COLUMN public.profiles.lgpd_consent_date IS 'Data de consentimento LGPD (Art. 7º)';
COMMENT ON COLUMN public.profiles.lgpd_consent_version IS 'Versão dos termos aceitos';

-- ========================================
-- FASE 2.1: Rate Limiting Seguro (Database-level)
-- ========================================

-- Tabela de controle de uso diário
CREATE TABLE IF NOT EXISTS public.prd_usage_tracking (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_request TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prd_usage_user_date ON public.prd_usage_tracking(user_id, usage_date);

-- Função com LOCK para prevenir race conditions
CREATE OR REPLACE FUNCTION public.check_and_increment_prd_usage(
  p_user_id UUID,
  p_daily_limit INTEGER
)
RETURNS TABLE(allowed BOOLEAN, current_count INTEGER, reset_time TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_count INTEGER;
  v_reset_time TIMESTAMPTZ;
  v_usage_date DATE;
BEGIN
  -- Reset automático se mudou de dia
  v_usage_date := CURRENT_DATE;
  v_reset_time := (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMPTZ;
  
  -- Lock row para evitar race condition
  SELECT usage_count, usage_date INTO v_current_count, v_usage_date
  FROM prd_usage_tracking
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- Se não existe ou mudou de dia, resetar
  IF v_current_count IS NULL OR v_usage_date < CURRENT_DATE THEN
    INSERT INTO prd_usage_tracking (user_id, usage_count, usage_date)
    VALUES (p_user_id, 0, CURRENT_DATE)
    ON CONFLICT (user_id) DO UPDATE
      SET usage_count = 0, 
          usage_date = CURRENT_DATE, 
          last_request = NOW();
    
    v_current_count := 0;
  END IF;
  
  -- Verificar limite
  IF v_current_count >= p_daily_limit THEN
    RETURN QUERY SELECT false, v_current_count, v_reset_time;
    RETURN;
  END IF;
  
  -- Incrementar contador
  UPDATE prd_usage_tracking
  SET usage_count = usage_count + 1,
      last_request = NOW()
  WHERE user_id = p_user_id;
  
  RETURN QUERY SELECT true, v_current_count + 1, v_reset_time;
END;
$$;

-- Cleanup automático de registros antigos
CREATE OR REPLACE FUNCTION public.cleanup_old_prd_usage()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.prd_usage_tracking
  WHERE usage_date < CURRENT_DATE - INTERVAL '7 days';
$$;

-- RLS para tabela de tracking (apenas service role acessa)
ALTER TABLE public.prd_usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages usage tracking"
ON public.prd_usage_tracking
FOR ALL
TO service_role
USING (true);

-- ========================================
-- FASE 2.6: Documentar SECURITY DEFINER Views
-- ========================================

COMMENT ON VIEW public.alltime_leaderboard IS 
  'SECURITY DEFINER: Leitura agregada de estatísticas públicas. Não expõe PII.';
COMMENT ON VIEW public.monthly_leaderboard IS 
  'SECURITY DEFINER: Leitura agregada de estatísticas públicas. Não expõe PII.';

-- ========================================
-- FASE 3.1: Privacidade de Likes
-- ========================================

-- REMOVER política pública perigosa
DROP POLICY IF EXISTS "Users can view all likes" ON public.prd_likes;

-- NOVA POLÍTICA: Ver apenas próprios likes
CREATE POLICY "users_view_own_likes"
ON public.prd_likes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- NOVA POLÍTICA: Admins podem ver tudo
CREATE POLICY "admins_view_all_likes"
ON public.prd_likes
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- VIEW AGREGADA para estatísticas públicas (sem user_id)
CREATE OR REPLACE VIEW public.prd_like_stats AS
SELECT 
  document_id,
  COUNT(*) as total_likes
FROM public.prd_likes
GROUP BY document_id;

-- ========================================
-- FASE 3.2: Leaderboards Acessíveis
-- ========================================

-- Habilitar RLS nas views de leaderboard (se aplicável)
-- Nota: Views de leaderboard já são seguras (apenas dados agregados)

-- Garantir que não há restrições de acesso
-- As views alltime_leaderboard e monthly_leaderboard devem ser públicas