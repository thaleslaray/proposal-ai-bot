-- Remover roles duplicadas, mantendo apenas a mais privilegiada (admin > student > free)
DELETE FROM public.user_roles 
WHERE id IN (
  SELECT ur.id 
  FROM public.user_roles ur
  INNER JOIN (
    SELECT user_id, 
           CASE 
             WHEN 'admin'::app_role = ANY(array_agg(role)) THEN 'admin'::app_role
             WHEN 'student'::app_role = ANY(array_agg(role)) THEN 'student'::app_role
             ELSE 'free'::app_role
           END as keep_role
    FROM public.user_roles
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) prioritized ON ur.user_id = prioritized.user_id
  WHERE ur.role != prioritized.keep_role
);

-- Remover o constraint antigo que permitia múltiplas roles
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

-- Adicionar novo constraint: apenas 1 role por usuário
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);

-- Adicionar comentário explicativo
COMMENT ON CONSTRAINT user_roles_user_id_key ON public.user_roles 
IS 'Ensures each user has exactly one role';