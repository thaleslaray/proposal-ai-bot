-- 1. Recriar a trigger (caso tenha sido removida)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- 2. Criar perfil para usuários sem perfil usando a função existente
SELECT backfill_missing_profiles();