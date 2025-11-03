-- Verificar se existem user_ids órfãos em event_participants
-- (apenas para diagnóstico, não bloqueia a migration)
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM event_participants ep
  WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = ep.user_id);
  
  IF orphan_count > 0 THEN
    RAISE WARNING 'Encontrados % registros órfãos em event_participants', orphan_count;
  END IF;
END $$;

-- Remover FK antiga que aponta para auth.users
ALTER TABLE event_participants 
DROP CONSTRAINT IF EXISTS event_participants_user_id_fkey;

-- Criar FK nova apontando para profiles
ALTER TABLE event_participants
ADD CONSTRAINT event_participants_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Criar índice para performance do JOIN
CREATE INDEX IF NOT EXISTS idx_event_participants_user_id 
ON event_participants(user_id);

-- Adicionar comentário explicativo
COMMENT ON CONSTRAINT event_participants_user_id_fkey ON event_participants 
IS 'FK para profiles (não auth.users) para permitir auto-join via PostgREST';