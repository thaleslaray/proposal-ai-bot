-- Função para inferir origem baseado em referrer e landing_page
CREATE OR REPLACE FUNCTION public.infer_utm_from_acquisition(
  p_referrer text,
  p_landing_page text
)
RETURNS TABLE(
  inferred_source text,
  inferred_medium text
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  has_fbclid boolean;
  has_gclid boolean;
BEGIN
  -- Detectar click IDs na landing page
  has_fbclid := p_landing_page LIKE '%fbclid=%';
  has_gclid := p_landing_page LIKE '%gclid=%';
  
  -- Inferir source baseado no referrer
  IF p_referrer ILIKE '%instagram.com%' THEN
    inferred_source := 'instagram';
  ELSIF p_referrer ILIKE '%facebook.com%' OR p_referrer ILIKE '%fb.com%' THEN
    inferred_source := 'facebook';
  ELSIF p_referrer ILIKE '%twitter.com%' OR p_referrer ILIKE '%t.co%' THEN
    inferred_source := 'twitter';
  ELSIF p_referrer ILIKE '%linkedin.com%' THEN
    inferred_source := 'linkedin';
  ELSIF p_referrer ILIKE '%google.com%' THEN
    inferred_source := 'google';
  ELSIF p_referrer ILIKE '%youtube.com%' THEN
    inferred_source := 'youtube';
  ELSIF p_referrer ILIKE '%whatsapp.com%' THEN
    inferred_source := 'whatsapp';
  ELSIF p_referrer IS NULL OR p_referrer = '' THEN
    inferred_source := 'direct';
  ELSE
    inferred_source := 'referral';
  END IF;
  
  -- Inferir medium baseado nos click IDs e referrer
  IF has_fbclid THEN
    inferred_medium := 'social_paid';
  ELSIF has_gclid THEN
    inferred_medium := 'cpc';
  ELSIF p_referrer IS NOT NULL AND p_referrer != '' THEN
    IF p_referrer ILIKE '%instagram.com%' OR p_referrer ILIKE '%facebook.com%' OR 
       p_referrer ILIKE '%twitter.com%' OR p_referrer ILIKE '%linkedin.com%' THEN
      inferred_medium := 'social_organic';
    ELSE
      inferred_medium := 'referral';
    END IF;
  ELSE
    inferred_medium := 'direct';
  END IF;
  
  RETURN QUERY SELECT inferred_source, inferred_medium;
END;
$$;

-- Atualizar get_users_with_details para usar inferência
DROP FUNCTION IF EXISTS public.get_users_with_details(text, integer, integer, text);

CREATE FUNCTION public.get_users_with_details(
  search_term text DEFAULT ''::text, 
  limit_count integer DEFAULT 20, 
  offset_count integer DEFAULT 0, 
  event_filter text DEFAULT NULL::text
)
RETURNS TABLE(
  user_id uuid, 
  phone text, 
  name text, 
  email text, 
  role app_role, 
  doc_count bigint, 
  product_name text, 
  updated_at timestamp with time zone, 
  last_doc_at timestamp with time zone, 
  utm_source text, 
  ref_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    MAX(dh.created_at)::timestamptz as last_doc_at,
    COALESCE(
      ua.utm_source,
      (SELECT inferred_source FROM infer_utm_from_acquisition(ua.referrer, ua.landing_page))
    )::text as utm_source,
    ua.ref_code::text as ref_code
  FROM auth.users au
  LEFT JOIN profiles p ON p.id = au.id
  LEFT JOIN user_roles ur ON ur.user_id = au.id
  LEFT JOIN document_history dh ON dh.user_id = au.id
  LEFT JOIN hotmart_validation_cache hvc ON hvc.user_id = au.id AND hvc.has_access = true
  LEFT JOIN event_participants ep ON ep.user_id = au.id
  LEFT JOIN user_acquisition ua ON ua.user_id = au.id
  WHERE 
    (search_term = '' OR
     normalize_name(p.name) ILIKE '%' || search_term || '%' OR
     p.email ILIKE '%' || search_term || '%' OR
     au.email ILIKE '%' || search_term || '%' OR
     au.phone ILIKE '%' || search_term || '%')
    AND (
      event_filter IS NULL OR
      (event_filter = 'none' AND ep.user_id IS NULL) OR
      ep.event_slug = event_filter
    )
  GROUP BY 
    au.id, au.phone, au.email, au.raw_user_meta_data, au.updated_at,
    p.name, p.email, p.phone, p.updated_at,
    ur.role, hvc.product_name, ua.utm_source, ua.ref_code, ua.referrer, ua.landing_page
  ORDER BY au.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- Backfill: atualizar registros existentes com inferência
UPDATE user_acquisition
SET 
  utm_source = (SELECT inferred_source FROM infer_utm_from_acquisition(referrer, landing_page)),
  utm_medium = (SELECT inferred_medium FROM infer_utm_from_acquisition(referrer, landing_page))
WHERE utm_source IS NULL 
  AND (referrer IS NOT NULL OR landing_page IS NOT NULL);