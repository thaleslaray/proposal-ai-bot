-- Política: Vitalícios e Admins podem deletar próprios PRDs
CREATE POLICY "Lifetime and Admin can delete own documents"
ON public.document_history
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id 
  AND (
    has_role(auth.uid(), 'lifetime'::app_role) 
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);