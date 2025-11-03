-- FASE 1: Índices de Performance
-- Índice composto para query da galeria (is_public + category + created_at)
CREATE INDEX IF NOT EXISTS idx_document_history_gallery 
ON document_history (is_public, category, created_at DESC) 
WHERE is_public = true;

-- Índice para verificação de likes do usuário
CREATE INDEX IF NOT EXISTS idx_prd_likes_user_doc 
ON prd_likes (user_id, document_id);

-- Índice GIN para busca por tags
CREATE INDEX IF NOT EXISTS idx_document_history_tags 
ON document_history USING GIN (tags);

-- FASE 5: Função de Validação de Contadores
-- Esta função pode ser executada manualmente ou via cron job
CREATE OR REPLACE FUNCTION validate_document_counters()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Atualizar likes_count baseado em prd_likes
  UPDATE document_history dh
  SET likes_count = (
    SELECT COUNT(*) 
    FROM prd_likes pl 
    WHERE pl.document_id = dh.id
  )
  WHERE dh.likes_count != (
    SELECT COUNT(*) 
    FROM prd_likes pl 
    WHERE pl.document_id = dh.id
  );

  -- Atualizar remixes_count baseado em prd_remixes
  UPDATE document_history dh
  SET remixes_count = (
    SELECT COUNT(*) 
    FROM prd_remixes pr 
    WHERE pr.original_id = dh.id
  )
  WHERE dh.remixes_count != (
    SELECT COUNT(*) 
    FROM prd_remixes pr 
    WHERE pr.original_id = dh.id
  );

  RAISE NOTICE 'Contadores sincronizados com sucesso';
END;
$$;