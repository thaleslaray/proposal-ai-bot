-- Criar tabela de auditoria para exclusões (conformidade LGPD Art. 37)
CREATE TABLE IF NOT EXISTS public.deletion_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deleted_user_id UUID NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deletion_type TEXT NOT NULL CHECK (deletion_type IN ('self', 'admin')),
  executed_by UUID, -- ID de quem executou (admin ou próprio usuário)
  ip_address TEXT,
  confirmation_text TEXT,
  user_email TEXT,
  user_phone TEXT
);

-- RLS: apenas admins podem visualizar logs
ALTER TABLE public.deletion_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view deletion audit logs"
  ON public.deletion_audit FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Índice para consultas por data (facilita limpeza após 5 anos)
CREATE INDEX idx_deletion_audit_deleted_at ON public.deletion_audit(deleted_at);

-- Verificar e corrigir foreign keys com ON DELETE CASCADE
-- Tabela: user_roles
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_roles_user_id_fkey'
  ) THEN
    ALTER TABLE public.user_roles DROP CONSTRAINT user_roles_user_id_fkey;
  END IF;
END $$;

ALTER TABLE public.user_roles 
  ADD CONSTRAINT user_roles_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Tabela: prd_likes
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'prd_likes_user_id_fkey'
  ) THEN
    ALTER TABLE public.prd_likes DROP CONSTRAINT prd_likes_user_id_fkey;
  END IF;
END $$;

ALTER TABLE public.prd_likes 
  ADD CONSTRAINT prd_likes_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Tabela: prd_remixes
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'prd_remixes_user_id_fkey'
  ) THEN
    ALTER TABLE public.prd_remixes DROP CONSTRAINT prd_remixes_user_id_fkey;
  END IF;
END $$;

ALTER TABLE public.prd_remixes 
  ADD CONSTRAINT prd_remixes_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Tabela: prd_comments
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'prd_comments_user_id_fkey'
  ) THEN
    ALTER TABLE public.prd_comments DROP CONSTRAINT prd_comments_user_id_fkey;
  END IF;
END $$;

ALTER TABLE public.prd_comments 
  ADD CONSTRAINT prd_comments_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Tabela: notifications
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'notifications_user_id_fkey'
  ) THEN
    ALTER TABLE public.notifications DROP CONSTRAINT notifications_user_id_fkey;
  END IF;
END $$;

ALTER TABLE public.notifications 
  ADD CONSTRAINT notifications_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Tabela: user_badges
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_badges_user_id_fkey'
  ) THEN
    ALTER TABLE public.user_badges DROP CONSTRAINT user_badges_user_id_fkey;
  END IF;
END $$;

ALTER TABLE public.user_badges 
  ADD CONSTRAINT user_badges_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Tabela: hotmart_validation_cache
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'hotmart_validation_cache_user_id_fkey'
  ) THEN
    ALTER TABLE public.hotmart_validation_cache DROP CONSTRAINT hotmart_validation_cache_user_id_fkey;
  END IF;
END $$;

ALTER TABLE public.hotmart_validation_cache 
  ADD CONSTRAINT hotmart_validation_cache_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Tabela: prd_usage_tracking
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'prd_usage_tracking_user_id_fkey'
  ) THEN
    ALTER TABLE public.prd_usage_tracking DROP CONSTRAINT prd_usage_tracking_user_id_fkey;
  END IF;
END $$;

ALTER TABLE public.prd_usage_tracking 
  ADD CONSTRAINT prd_usage_tracking_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Tabela: api_usage
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'api_usage_user_id_fkey'
  ) THEN
    ALTER TABLE public.api_usage DROP CONSTRAINT api_usage_user_id_fkey;
  END IF;
END $$;

ALTER TABLE public.api_usage 
  ADD CONSTRAINT api_usage_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Comentário explicativo
COMMENT ON TABLE public.deletion_audit IS 'Registros de auditoria de exclusão de contas mantidos por 5 anos para conformidade LGPD (Art. 37)';
