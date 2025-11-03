-- Migration: Add social links and contact fields to profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS show_email BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS occupation TEXT;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(location) WHERE location IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_occupation ON profiles(occupation) WHERE occupation IS NOT NULL;

-- Constraint para garantir username único (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_unique ON profiles(LOWER(username));

-- Comentários para documentação
COMMENT ON COLUMN profiles.social_links IS 'JSON com redes sociais: {linkedin, github, twitter, instagram, youtube, tiktok}';
COMMENT ON COLUMN profiles.show_email IS 'Se true, exibe email público no perfil';
COMMENT ON COLUMN profiles.website IS 'Website pessoal ou portfolio';
COMMENT ON COLUMN profiles.location IS 'Cidade, Estado (ex: São Paulo, SP)';
COMMENT ON COLUMN profiles.occupation IS 'Profissão (ex: Product Manager, Designer)';

-- Criar bucket público para avatares
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Usuários podem fazer upload do próprio avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policy: Usuários podem atualizar próprio avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policy: Usuários podem deletar próprio avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policy: Todos podem visualizar avatares (bucket público)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Policy: Todos podem ver perfis públicos (onde username não é null)
CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT
TO public
USING (username IS NOT NULL);