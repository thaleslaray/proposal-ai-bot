-- Adicionar colunas para galeria na tabela document_history
ALTER TABLE document_history 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other',
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS remixes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_document_history_is_public ON document_history(is_public);
CREATE INDEX IF NOT EXISTS idx_document_history_category ON document_history(category);
CREATE INDEX IF NOT EXISTS idx_document_history_created_at ON document_history(created_at DESC);

-- Criar tabela prd_likes
CREATE TABLE IF NOT EXISTS prd_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES document_history(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, document_id)
);

-- RLS Policies para prd_likes
ALTER TABLE prd_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all likes"
ON prd_likes FOR SELECT
USING (true);

CREATE POLICY "Users can like PRDs"
ON prd_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike own likes"
ON prd_likes FOR DELETE
USING (auth.uid() = user_id);

-- Índices para prd_likes
CREATE INDEX IF NOT EXISTS idx_prd_likes_document_id ON prd_likes(document_id);
CREATE INDEX IF NOT EXISTS idx_prd_likes_user_id ON prd_likes(user_id);

-- Criar tabela prd_remixes
CREATE TABLE IF NOT EXISTS prd_remixes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id UUID NOT NULL REFERENCES document_history(id) ON DELETE CASCADE,
  remix_id UUID NOT NULL REFERENCES document_history(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies para prd_remixes
ALTER TABLE prd_remixes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all remixes"
ON prd_remixes FOR SELECT
USING (true);

CREATE POLICY "Users can create remixes"
ON prd_remixes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Índices para prd_remixes
CREATE INDEX IF NOT EXISTS idx_prd_remixes_original_id ON prd_remixes(original_id);
CREATE INDEX IF NOT EXISTS idx_prd_remixes_remix_id ON prd_remixes(remix_id);

-- Atualizar RLS Policies de document_history
CREATE POLICY "Public PRDs are viewable by everyone"
ON document_history FOR SELECT
USING (is_public = true);

CREATE POLICY "Students can update own PRD visibility"
ON document_history FOR UPDATE
USING (
  auth.uid() = user_id 
  AND (
    has_role(auth.uid(), 'student'::app_role) 
    OR has_role(auth.uid(), 'lifetime'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  )
)
WITH CHECK (
  auth.uid() = user_id
);

-- Criar funções RPC para contadores
CREATE OR REPLACE FUNCTION increment_likes(doc_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE document_history
  SET likes_count = likes_count + 1
  WHERE id = doc_id;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_likes(doc_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE document_history
  SET likes_count = GREATEST(0, likes_count - 1)
  WHERE id = doc_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_remixes(doc_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE document_history
  SET remixes_count = remixes_count + 1
  WHERE id = doc_id;
END;
$$;