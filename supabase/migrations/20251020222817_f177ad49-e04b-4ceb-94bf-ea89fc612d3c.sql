-- Adicionar foreign key de document_history.user_id → profiles.id
ALTER TABLE document_history
  ADD CONSTRAINT fk_document_history_user_id
  FOREIGN KEY (user_id) 
  REFERENCES profiles(id)
  ON DELETE CASCADE;

-- Criar índice para performance nas queries de JOIN
CREATE INDEX IF NOT EXISTS idx_document_history_user_id 
  ON document_history(user_id);