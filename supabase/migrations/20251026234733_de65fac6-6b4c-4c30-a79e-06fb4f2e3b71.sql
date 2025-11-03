-- Criar índice otimizado para ordenação por view_count
CREATE INDEX IF NOT EXISTS idx_document_history_views_public 
ON document_history (is_public, view_count DESC, created_at DESC) 
WHERE is_public = true;