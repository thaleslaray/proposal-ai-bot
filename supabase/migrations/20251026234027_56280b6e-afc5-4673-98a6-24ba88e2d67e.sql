-- Otimização da Galeria: Índices Compostos para Performance

-- Índice para query principal da galeria (is_public + ordering)
CREATE INDEX IF NOT EXISTS idx_document_history_gallery_main 
ON document_history (is_public, created_at DESC) 
WHERE is_public = true;

-- Índice para categoria + ordering
CREATE INDEX IF NOT EXISTS idx_document_history_category_public 
ON document_history (is_public, category, created_at DESC) 
WHERE is_public = true;

-- Índice para "Mais Curtido" (is_public + likes_count DESC)
CREATE INDEX IF NOT EXISTS idx_document_history_likes_public 
ON document_history (is_public, likes_count DESC, created_at DESC) 
WHERE is_public = true;

-- Índice para "Mais Remixado" (is_public + remixes_count > 0)
CREATE INDEX IF NOT EXISTS idx_document_history_remixes_public 
ON document_history (is_public, remixes_count DESC, created_at DESC) 
WHERE is_public = true AND remixes_count > 0;

-- Índice para "Featured" (is_public + is_featured)
CREATE INDEX IF NOT EXISTS idx_document_history_featured 
ON document_history (is_public, is_featured, featured_at DESC) 
WHERE is_public = true AND is_featured = true;

-- Índice para lookup de roles (batch query)
CREATE INDEX IF NOT EXISTS idx_user_roles_lookup 
ON user_roles (user_id, role);