-- Remover FK antiga que aponta para auth.users
ALTER TABLE public.event_actions
DROP CONSTRAINT event_actions_user_id_fkey;

-- Criar nova FK apontando para profiles
ALTER TABLE public.event_actions
ADD CONSTRAINT event_actions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;