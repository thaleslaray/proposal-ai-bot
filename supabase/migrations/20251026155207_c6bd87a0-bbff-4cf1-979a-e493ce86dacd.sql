-- Atualizar get_users_with_details para normalizar nomes automaticamente
CREATE OR REPLACE FUNCTION public.get_users_with_details(
  search_term text DEFAULT '',
  limit_count integer DEFAULT 20,
  offset_count integer DEFAULT 0
)
RETURNS TABLE(
  user_id uuid,
  phone text,
  name text,
  email text,
  role app_role,
  doc_count bigint,
  product_name text,
  updated_at timestamptz,
  last_doc_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id::uuid as user_id,
    COALESCE(au.phone, p.phone, '')::text as phone,
    normalize_name(COALESCE(p.name, au.raw_user_meta_data->>'name', ''))::text as name,
    COALESCE(p.email, au.email, '')::text as email,
    COALESCE(ur.role, 'free'::app_role) as role,
    COUNT(DISTINCT dh.id) as doc_count,
    hvc.product_name::text as product_name,
    GREATEST(au.updated_at, p.updated_at)::timestamptz as updated_at,
    MAX(dh.created_at)::timestamptz as last_doc_at
  FROM auth.users au
  LEFT JOIN profiles p ON p.id = au.id
  LEFT JOIN user_roles ur ON ur.user_id = au.id
  LEFT JOIN document_history dh ON dh.user_id = au.id
  LEFT JOIN hotmart_validation_cache hvc ON hvc.user_id = au.id AND hvc.has_access = true
  WHERE 
    search_term = '' OR
    normalize_name(p.name) ILIKE '%' || search_term || '%' OR
    p.email ILIKE '%' || search_term || '%' OR
    au.email ILIKE '%' || search_term || '%' OR
    au.phone ILIKE '%' || search_term || '%'
  GROUP BY 
    au.id, 
    au.phone, 
    au.email, 
    au.raw_user_meta_data, 
    au.updated_at,
    p.name, 
    p.email, 
    p.phone,
    p.updated_at,
    ur.role, 
    hvc.product_name
  ORDER BY au.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;