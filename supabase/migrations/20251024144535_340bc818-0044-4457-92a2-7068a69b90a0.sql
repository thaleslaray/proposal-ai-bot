-- Fix analytics tracking and views counting
-- Permite que usuários autenticados e anônimos registrem views

-- Políticas RLS para prd_analytics
DROP POLICY IF EXISTS "Authenticated users can track analytics" ON prd_analytics;
CREATE POLICY "Authenticated users can track analytics"
ON prd_analytics FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anonymous can track views" ON prd_analytics;
CREATE POLICY "Anonymous can track views"
ON prd_analytics FOR INSERT TO anon
WITH CHECK (event_type = 'view' AND user_id IS NULL);

-- Corrigir função increment_views para validar documento público
CREATE OR REPLACE FUNCTION public.increment_views(doc_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE document_history
  SET view_count = view_count + 1
  WHERE id = doc_id AND is_public = true;
  
  IF NOT FOUND THEN
    RAISE WARNING 'Document % not found or not public', doc_id;
  END IF;
END;
$function$;