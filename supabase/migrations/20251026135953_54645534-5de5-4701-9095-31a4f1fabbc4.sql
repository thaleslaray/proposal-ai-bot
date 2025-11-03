-- Criar função para contar usuários de auth.users (fonte de verdade)
CREATE OR REPLACE FUNCTION public.get_auth_users_count()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COUNT(*) FROM auth.users;
$$;