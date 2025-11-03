-- ========================================
-- HELPERS: Funções RPC para criptografia
-- ========================================

-- Função para criptografar (uso da edge function)
CREATE OR REPLACE FUNCTION public.encrypt_text(data_text text, key_text text)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN pgp_sym_encrypt(data_text, key_text);
END;
$$;

-- Função para descriptografar (uso admin)
CREATE OR REPLACE FUNCTION public.decrypt_text(data_encrypted bytea, key_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN pgp_sym_decrypt(data_encrypted, key_text);
END;
$$;