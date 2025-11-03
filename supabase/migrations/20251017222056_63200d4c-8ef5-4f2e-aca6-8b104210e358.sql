-- Promover usuário Thales (5521982219966) para admin
DO $$
BEGIN
  -- Remover role 'free' do Thales
  DELETE FROM public.user_roles 
  WHERE user_id = 'a2f84b07-bfee-4b5b-9584-2308309f532d'
  AND role = 'free';
  
  -- Adicionar role 'admin'
  INSERT INTO public.user_roles (user_id, role)
  VALUES ('a2f84b07-bfee-4b5b-9584-2308309f532d', 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RAISE NOTICE 'Usuário Thales promovido para admin com sucesso';
END $$;