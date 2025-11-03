-- Adicionar coluna category_metadata para armazenar dados da classificação AI
ALTER TABLE document_history 
ADD COLUMN IF NOT EXISTS category_metadata JSONB DEFAULT '{}'::jsonb;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_document_category ON document_history(category);
CREATE INDEX IF NOT EXISTS idx_category_metadata ON document_history USING GIN(category_metadata);

-- Comentário explicativo
COMMENT ON COLUMN document_history.category_metadata IS 
'Metadata da classificação AI: {confidence, reasoning, suggested_tags, classified_at, fallback}';