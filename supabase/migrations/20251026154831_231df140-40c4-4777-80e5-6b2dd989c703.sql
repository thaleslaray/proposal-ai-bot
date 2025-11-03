-- Criar função para normalizar nomes no PostgreSQL
CREATE OR REPLACE FUNCTION public.normalize_name(full_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  words TEXT[];
  first_name TEXT;
  last_name TEXT;
BEGIN
  -- Retornar nulo ou 'Anônimo' sem alterações
  IF full_name IS NULL OR TRIM(full_name) = '' THEN
    RETURN 'Anônimo';
  END IF;
  
  IF full_name = 'Anônimo' THEN
    RETURN full_name;
  END IF;
  
  -- Remover espaços extras e dividir em palavras
  words := string_to_array(TRIM(regexp_replace(full_name, '\s+', ' ', 'g')), ' ');
  
  -- Se só tem 1 palavra, retorna capitalizada
  IF array_length(words, 1) = 1 THEN
    RETURN initcap(lower(words[1]));
  END IF;
  
  -- Pegar primeiro e último nome
  first_name := initcap(lower(words[1]));
  last_name := initcap(lower(words[array_length(words, 1)]));
  
  RETURN first_name || ' ' || last_name;
END;
$$;

-- Atualizar todos os nomes existentes na tabela profiles
UPDATE profiles
SET 
  name = normalize_name(name),
  updated_at = NOW()
WHERE name IS NOT NULL 
  AND name != normalize_name(name);

-- Atualizar trigger para normalizar nome ao criar perfil
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_name text;
  user_phone text;
  user_email text;
  base_username text;
  final_username text;
BEGIN
  -- Extrair nome e normalizar
  user_name := normalize_name(COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    'Usuário'
  ));
  
  -- Extrair telefone
  user_phone := COALESCE(
    NEW.phone,
    NEW.raw_user_meta_data->>'phone',
    ''
  );
  
  -- Extrair email (ignorar emails temporários)
  user_email := CASE 
    WHEN NEW.email LIKE '%@temp.internal' THEN NULL
    WHEN NEW.email LIKE '%@whatsapp.auth' THEN NULL
    ELSE NEW.email
  END;
  
  -- Gerar username: primeiro nome + timestamp
  base_username := lower(regexp_replace(split_part(user_name, ' ', 1), '[^a-zA-Z0-9]', '', 'g'));
  
  IF base_username = '' OR base_username = 'usuario' THEN
    base_username := 'user';
  END IF;
  
  final_username := base_username || '-' || floor(extract(epoch from now()))::text;
  
  -- Inserir ou atualizar profile
  INSERT INTO public.profiles (id, phone, name, email, username, created_at, updated_at)
  VALUES (
    NEW.id,
    user_phone,
    user_name,
    user_email,
    final_username,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = normalize_name(COALESCE(
      NULLIF(TRIM(EXCLUDED.name), ''),
      profiles.name,
      'Usuário'
    )),
    email = COALESCE(
      NULLIF(TRIM(EXCLUDED.email), ''),
      profiles.email
    ),
    phone = COALESCE(
      NULLIF(TRIM(EXCLUDED.phone), ''),
      profiles.phone
    ),
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