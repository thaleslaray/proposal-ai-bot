-- Permitir leitura pública de perfis com username definido
-- Isso alinha com a lógica da view public_profiles
CREATE POLICY "Public profiles are readable by everyone"
ON public.profiles
FOR SELECT
TO public
USING (username IS NOT NULL);

-- Adicionar índice para otimizar queries por username
CREATE INDEX IF NOT EXISTS idx_profiles_username 
ON public.profiles(username) 
WHERE username IS NOT NULL;

COMMENT ON POLICY "Public profiles are readable by everyone" ON public.profiles IS
  'Permite leitura pública de perfis com username definido, alinhado com public_profiles view';