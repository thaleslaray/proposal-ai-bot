-- Opção 1: Padronização E.164 em auth.users
-- Adicionar prefixo + em telefones que não têm
UPDATE auth.users
SET phone = '+' || phone
WHERE phone NOT LIKE '+%' 
  AND phone ~ '^[0-9]+$' 
  AND phone IS NOT NULL
  AND phone != '';

-- Opção 2: Função RPC robusta que busca em múltiplos formatos
DROP FUNCTION IF EXISTS public.get_user_by_phone(text);

CREATE OR REPLACE FUNCTION public.get_user_by_phone(search_phone text)
RETURNS TABLE (
  id uuid,
  phone text,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id::uuid,
    au.phone::text,
    au.email::text
  FROM auth.users au
  WHERE au.phone = search_phone                     -- Busca exata (ideal após padronização)
     OR au.phone = ltrim(search_phone, '+')         -- Remove + do input e compara
     OR ('+' || au.phone) = search_phone            -- Adiciona + no banco e compara
  LIMIT 1;
END;
$$;