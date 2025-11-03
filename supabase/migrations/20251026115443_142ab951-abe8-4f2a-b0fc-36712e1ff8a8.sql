-- Índice GIN para busca full-text em profiles (nome + email)
CREATE INDEX IF NOT EXISTS idx_profiles_search 
ON profiles USING gin(
  to_tsvector('portuguese', coalesce(name, '') || ' ' || coalesce(email, ''))
);

-- Índice para contagem rápida de documentos por usuário
CREATE INDEX IF NOT EXISTS idx_document_history_user_id 
ON document_history(user_id);

-- Índice composto para cache Hotmart com filtro WHERE
CREATE INDEX IF NOT EXISTS idx_hotmart_cache_user_access 
ON hotmart_validation_cache(user_id, product_name) 
WHERE has_access = true;