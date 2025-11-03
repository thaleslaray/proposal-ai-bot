-- Remover trigger problemática que causa erro 406
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Remover função que não será mais usada
DROP FUNCTION IF EXISTS public.handle_new_user();