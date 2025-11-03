-- Fix search_path for security definer functions to prevent search path injection attacks

-- Update increment_likes with search_path
CREATE OR REPLACE FUNCTION public.increment_likes(doc_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  UPDATE document_history
  SET likes_count = likes_count + 1
  WHERE id = doc_id;
END;
$function$;

-- Update decrement_likes with search_path
CREATE OR REPLACE FUNCTION public.decrement_likes(doc_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  UPDATE document_history
  SET likes_count = GREATEST(0, likes_count - 1)
  WHERE id = doc_id;
END;
$function$;

-- Update increment_remixes with search_path
CREATE OR REPLACE FUNCTION public.increment_remixes(doc_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  UPDATE document_history
  SET remixes_count = remixes_count + 1
  WHERE id = doc_id;
END;
$function$;

-- Update increment_views with search_path
CREATE OR REPLACE FUNCTION public.increment_views(doc_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  UPDATE document_history
  SET view_count = view_count + 1
  WHERE id = doc_id;
END;
$function$;