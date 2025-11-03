-- 1. Corrigir o trigger handle_new_user() removendo ON CONFLICT problemático
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert profile sem ON CONFLICT
  INSERT INTO public.profiles (id, phone, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.phone, ''),
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    CASE 
      WHEN NEW.email LIKE '%@temp.internal' THEN NULL
      ELSE NEW.email
    END
  );
  
  -- Assign 'free' role by default sem ON CONFLICT
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'free');
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recriar o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Sincronizar dados faltantes em profiles
INSERT INTO public.profiles (id, phone, name, email)
SELECT 
  au.id,
  COALESCE(au.phone, ''),
  COALESCE(au.raw_user_meta_data->>'name', ''),
  CASE 
    WHEN au.email LIKE '%@temp.internal' THEN NULL
    ELSE au.email
  END
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- 3. Sincronizar roles faltantes
INSERT INTO public.user_roles (user_id, role)
SELECT au.id, 'free'::app_role
FROM auth.users au
LEFT JOIN public.user_roles ur ON au.id = ur.user_id
WHERE ur.user_id IS NULL;