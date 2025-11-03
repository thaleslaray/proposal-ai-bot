-- =====================================================
-- FASE 1: BACKFILL - Criar perfis para usuários sem perfil
-- =====================================================
INSERT INTO public.profiles (id, phone, email, name, username, created_at, updated_at)
SELECT 
  au.id,
  COALESCE(au.phone, ''),
  CASE 
    WHEN au.email LIKE '%@temp.internal' THEN NULL
    WHEN au.email LIKE '%@whatsapp.auth' THEN NULL
    ELSE au.email
  END,
  normalize_name(COALESCE(au.raw_user_meta_data->>'name', 'Usuário')),
  lower(regexp_replace(
    split_part(COALESCE(au.raw_user_meta_data->>'name', 'user'), ' ', 1), 
    '[^a-zA-Z0-9]', '', 'g'
  )) || '-' || substring(au.id::text, 1, 8),
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE p.id IS NULL;

-- =====================================================
-- FASE 2: RECRIAR TRIGGER - Garantir sincronização futura
-- =====================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- FASE 3: FUNÇÕES DE MONITORAMENTO
-- =====================================================

-- Função para backfill manual
CREATE OR REPLACE FUNCTION public.backfill_missing_profiles()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profiles_created INTEGER;
BEGIN
  INSERT INTO public.profiles (id, phone, email, name, username, created_at, updated_at)
  SELECT 
    au.id,
    COALESCE(au.phone, ''),
    CASE 
      WHEN au.email LIKE '%@temp.internal' THEN NULL
      WHEN au.email LIKE '%@whatsapp.auth' THEN NULL
      ELSE au.email
    END,
    normalize_name(COALESCE(au.raw_user_meta_data->>'name', 'Usuário')),
    lower(regexp_replace(
      split_part(COALESCE(au.raw_user_meta_data->>'name', 'user'), ' ', 1), 
      '[^a-zA-Z0-9]', '', 'g'
    )) || '-' || substring(au.id::text, 1, 8),
    au.created_at,
    NOW()
  FROM auth.users au
  LEFT JOIN profiles p ON p.id = au.id
  WHERE p.id IS NULL;
  
  GET DIAGNOSTICS profiles_created = ROW_COUNT;
  RETURN profiles_created;
END;
$$;

-- Função para verificar saúde da sincronização
CREATE OR REPLACE FUNCTION public.check_profile_sync()
RETURNS TABLE(
  total_users BIGINT,
  total_profiles BIGINT,
  missing_profiles BIGINT,
  sync_percentage NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    (SELECT COUNT(*) FROM auth.users) as total_users,
    (SELECT COUNT(*) FROM profiles) as total_profiles,
    (SELECT COUNT(*) FROM auth.users au LEFT JOIN profiles p ON p.id = au.id WHERE p.id IS NULL) as missing_profiles,
    ROUND(
      CASE 
        WHEN (SELECT COUNT(*) FROM auth.users) = 0 THEN 100
        ELSE (SELECT COUNT(*) FROM profiles)::numeric / (SELECT COUNT(*) FROM auth.users)::numeric * 100
      END,
      2
    ) as sync_percentage;
$$;