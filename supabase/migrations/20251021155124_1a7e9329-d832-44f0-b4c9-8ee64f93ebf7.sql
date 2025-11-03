-- Criar tabela de configuração de limites de PRD
CREATE TABLE public.prd_limits_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL UNIQUE,
  daily_limit integer NOT NULL CHECK (daily_limit >= -1),
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid
);

-- Inserir valores padrão iniciais
INSERT INTO public.prd_limits_config (role, daily_limit) VALUES
  ('free', 1),
  ('student', 2),
  ('lifetime', -1),
  ('admin', -1);

-- Habilitar RLS
ALTER TABLE public.prd_limits_config ENABLE ROW LEVEL SECURITY;

-- RLS: Apenas admins podem ver
CREATE POLICY "Admins can view limits config"
  ON public.prd_limits_config FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- RLS: Apenas admins podem atualizar
CREATE POLICY "Admins can update limits config"
  ON public.prd_limits_config FOR UPDATE
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Criar função para obter o limite de um usuário
CREATE OR REPLACE FUNCTION public.get_prd_limit(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_limit integer;
BEGIN
  -- Verificar roles em ordem de prioridade
  IF has_role(_user_id, 'admin') THEN
    SELECT daily_limit INTO user_limit FROM prd_limits_config WHERE role = 'admin';
  ELSIF has_role(_user_id, 'lifetime') THEN
    SELECT daily_limit INTO user_limit FROM prd_limits_config WHERE role = 'lifetime';
  ELSIF has_role(_user_id, 'student') THEN
    SELECT daily_limit INTO user_limit FROM prd_limits_config WHERE role = 'student';
  ELSE
    SELECT daily_limit INTO user_limit FROM prd_limits_config WHERE role = 'free';
  END IF;
  
  RETURN COALESCE(user_limit, 1);
END;
$$;