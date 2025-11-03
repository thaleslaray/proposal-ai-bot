-- Atualizar usernames retroativamente para usuários sem username
DO $$
DECLARE
  profile_record RECORD;
  generated_username text;
  final_username text;
  username_exists boolean;
BEGIN
  -- Iterar sobre todos os perfis sem username
  FOR profile_record IN 
    SELECT id, name 
    FROM profiles 
    WHERE username IS NULL
  LOOP
    -- Gerar username base usando a função existente
    generated_username := generate_username(COALESCE(profile_record.name, ''));
    final_username := generated_username;
    
    -- Verificar se username já existe
    SELECT EXISTS(
      SELECT 1 FROM profiles WHERE username = final_username
    ) INTO username_exists;
    
    -- Se existir, adicionar timestamp
    WHILE username_exists LOOP
      final_username := generated_username || '-' || floor(extract(epoch from now()))::text;
      SELECT EXISTS(
        SELECT 1 FROM profiles WHERE username = final_username
      ) INTO username_exists;
    END LOOP;
    
    -- Atualizar o profile
    UPDATE profiles 
    SET username = final_username 
    WHERE id = profile_record.id;
    
    RAISE NOTICE 'Username gerado para %: %', profile_record.name, final_username;
  END LOOP;
END $$;