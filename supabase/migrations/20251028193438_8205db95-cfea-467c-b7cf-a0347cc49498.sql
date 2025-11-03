-- Criar tabela de configuração de permissões por role
CREATE TABLE public.prd_permissions_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL UNIQUE,
  can_toggle_visibility BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Inserir valores padrão baseados nas regras definidas
INSERT INTO public.prd_permissions_config (role, can_toggle_visibility, can_delete) VALUES
  ('free', false, false),      -- Free: sempre público, não deleta
  ('student', true, false),    -- Student: pode tornar privado, não deleta
  ('lifetime', true, true),    -- Lifetime: pode tornar privado E deletar
  ('admin', true, true);       -- Admin: pode tornar privado E deletar

-- Habilitar RLS
ALTER TABLE public.prd_permissions_config ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para admins
CREATE POLICY "Admins can view permissions config"
  ON public.prd_permissions_config FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update permissions config"
  ON public.prd_permissions_config FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Criar função para buscar permissões do usuário
CREATE OR REPLACE FUNCTION public.get_user_prd_permissions(_user_id uuid)
RETURNS TABLE(can_toggle_visibility boolean, can_delete boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prioridade: admin > lifetime > student > free
  IF has_role(_user_id, 'admin') THEN
    RETURN QUERY SELECT pc.can_toggle_visibility, pc.can_delete 
    FROM prd_permissions_config pc WHERE pc.role = 'admin';
  ELSIF has_role(_user_id, 'lifetime') THEN
    RETURN QUERY SELECT pc.can_toggle_visibility, pc.can_delete 
    FROM prd_permissions_config pc WHERE pc.role = 'lifetime';
  ELSIF has_role(_user_id, 'student') THEN
    RETURN QUERY SELECT pc.can_toggle_visibility, pc.can_delete 
    FROM prd_permissions_config pc WHERE pc.role = 'student';
  ELSE
    RETURN QUERY SELECT pc.can_toggle_visibility, pc.can_delete 
    FROM prd_permissions_config pc WHERE pc.role = 'free';
  END IF;
END;
$$;

-- Atualizar política de UPDATE (visibilidade)
DROP POLICY IF EXISTS "Students can update own PRD visibility" ON public.document_history;

CREATE POLICY "Users can update visibility based on permissions"
  ON public.document_history FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id 
    AND (SELECT can_toggle_visibility FROM get_user_prd_permissions(auth.uid()))
  )
  WITH CHECK (auth.uid() = user_id);

-- Atualizar política de DELETE
DROP POLICY IF EXISTS "Lifetime and Admin can delete own documents" ON public.document_history;

CREATE POLICY "Users can delete based on permissions"
  ON public.document_history FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id 
    AND (SELECT can_delete FROM get_user_prd_permissions(auth.uid()))
  );