-- Criar tabela de cache para validações Hotmart
CREATE TABLE public.hotmart_validation_cache (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  phone text,
  has_access boolean NOT NULL,
  product_name text,
  validation_method text CHECK (validation_method IN ('email', 'phone')),
  last_check timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '12 hours')
);

-- Índice para buscar registros expirados rapidamente
CREATE INDEX idx_hotmart_cache_expires ON public.hotmart_validation_cache(expires_at);

-- Índice para buscar por método de validação
CREATE INDEX idx_hotmart_cache_method ON public.hotmart_validation_cache(validation_method);

-- Habilitar RLS
ALTER TABLE public.hotmart_validation_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver apenas seu próprio cache
CREATE POLICY "Users can view own cache"
  ON public.hotmart_validation_cache
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Usuários podem inserir apenas seu próprio cache
CREATE POLICY "Users can insert own cache"
  ON public.hotmart_validation_cache
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Usuários podem atualizar apenas seu próprio cache
CREATE POLICY "Users can update own cache"
  ON public.hotmart_validation_cache
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Admins podem ver todo o cache
CREATE POLICY "Admins can view all cache"
  ON public.hotmart_validation_cache
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy: Service role pode fazer qualquer operação (para edge functions)
CREATE POLICY "Service role can manage cache"
  ON public.hotmart_validation_cache
  FOR ALL
  USING (auth.role() = 'service_role');

-- Comentário descritivo
COMMENT ON TABLE public.hotmart_validation_cache IS 'Cache de validações Hotmart com TTL de 12h para reduzir chamadas à API';
COMMENT ON COLUMN public.hotmart_validation_cache.validation_method IS 'Método usado na validação: email ou phone';
COMMENT ON COLUMN public.hotmart_validation_cache.expires_at IS 'Data de expiração do cache (12h após last_check)';