-- ==========================================
-- CORREÇÃO: Trigger simplificado (sem unaccent)
-- ==========================================

-- 1. Criar função simplificada para auto-popular profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name text;
  base_username text;
  final_username text;
  counter integer := 0;
BEGIN
  -- Extrair nome do metadata
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', 'Usuario');
  
  -- Gerar username simples: primeiro nome + timestamp
  base_username := lower(regexp_replace(split_part(user_name, ' ', 1), '[^a-zA-Z0-9]', '', 'g'));
  
  -- Se username vazio, usar "usuario"
  IF base_username = '' THEN
    base_username := 'usuario';
  END IF;
  
  -- Adicionar timestamp para garantir unicidade
  final_username := base_username || '-' || floor(extract(epoch from now()))::text;
  
  -- Inserir profile
  INSERT INTO public.profiles (id, phone, name, email, username, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.phone, ''),
    user_name,
    CASE 
      WHEN NEW.email LIKE '%@temp.internal' THEN NULL
      WHEN NEW.email LIKE '%@whatsapp.auth' THEN NULL
      ELSE NEW.email
    END,
    final_username,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    updated_at = NOW();
  
  -- Atribuir role 'free' se não existir
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'free')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 2. Criar trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Migrar usuários existentes que não têm profile
INSERT INTO public.profiles (id, phone, email, name, username, created_at, updated_at)
SELECT 
  au.id,
  COALESCE(au.phone, ''),
  CASE 
    WHEN au.email LIKE '%@temp.internal' THEN NULL
    WHEN au.email LIKE '%@whatsapp.auth' THEN NULL
    ELSE au.email
  END,
  COALESCE(au.raw_user_meta_data->>'name', 'Usuário'),
  lower(regexp_replace(split_part(COALESCE(au.raw_user_meta_data->>'name', 'usuario'), ' ', 1), '[^a-zA-Z0-9]', '', 'g')) || '-' || floor(extract(epoch from au.created_at))::text,
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;