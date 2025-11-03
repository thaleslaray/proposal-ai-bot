-- Fase 1: Backup dos Dados
CREATE TEMP TABLE deleted_users_backup AS
SELECT 
  au.*,
  p.name as profile_name,
  p.email as profile_email,
  p.phone as profile_phone
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE au.id IN (
  '40869618-31aa-490c-b0de-e8ef1942001f',
  '7fd10496-e322-44f7-8081-7e5474ae955c'
);

-- Fase 2: Deletar Usuários Duplicados
DELETE FROM auth.users 
WHERE id IN (
  '40869618-31aa-490c-b0de-e8ef1942001f',
  '7fd10496-e322-44f7-8081-7e5474ae955c'
);

-- Fase 3: Adicionar Constraint Único em profiles.phone
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_unique 
ON profiles(phone) 
WHERE phone IS NOT NULL AND phone != '';

-- Fase 4: Trigger de Sincronização profiles <-> auth.users
CREATE OR REPLACE FUNCTION sync_phone_to_auth()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.phone IS DISTINCT FROM OLD.phone THEN
    UPDATE auth.users
    SET 
      phone = NEW.phone,
      phone_confirm = (NEW.phone IS NOT NULL)
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_sync_phone_to_auth
AFTER UPDATE OF phone ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_phone_to_auth();