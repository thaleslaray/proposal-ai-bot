-- Habilitar extensão unaccent para remover acentos
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Criar função para gerar username automaticamente
CREATE OR REPLACE FUNCTION public.generate_username(full_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  words text[];
  first_name text;
  last_name text;
  username text;
BEGIN
  -- Se nome vazio, gerar username genérico
  IF full_name IS NULL OR trim(full_name) = '' THEN
    RETURN 'usuario-' || floor(extract(epoch from now()))::text;
  END IF;
  
  -- Normalizar: remover acentos e espaços extras
  full_name := lower(unaccent(trim(full_name)));
  words := string_to_array(full_name, ' ');
  
  -- Pegar primeiro e último nome
  first_name := words[1];
  last_name := CASE WHEN array_length(words, 1) > 1 
                THEN words[array_length(words, 1)] 
                ELSE '' END;
  
  -- Gerar username "primeiro-ultimo"
  IF last_name != '' THEN
    username := first_name || '-' || last_name;
  ELSE
    username := first_name;
  END IF;
  
  -- Remover caracteres especiais e limitar a 20 chars
  username := regexp_replace(username, '[^a-z0-9-]', '', 'g');
  username := substring(username, 1, 20);
  
  RETURN username;
END;
$$;

-- Recriar função handle_new_user com geração de username
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name text;
  generated_username text;
  final_username text;
BEGIN
  -- Extrair nome do metadata
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', '');
  
  -- Gerar username base
  generated_username := generate_username(user_name);
  final_username := generated_username;
  
  -- Se username já existe, adicionar timestamp para garantir unicidade
  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = final_username) LOOP
    final_username := generated_username || '-' || floor(extract(epoch from now()))::text;
  END LOOP;
  
  -- Inserir profile com username
  INSERT INTO public.profiles (id, phone, name, email, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.phone, ''),
    user_name,
    CASE 
      WHEN NEW.email LIKE '%@temp.internal' THEN NULL
      WHEN NEW.email LIKE '%@whatsapp.auth' THEN NULL
      ELSE NEW.email
    END,
    final_username
  );
  
  -- Atribuir role 'free'
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'free');
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recriar trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();