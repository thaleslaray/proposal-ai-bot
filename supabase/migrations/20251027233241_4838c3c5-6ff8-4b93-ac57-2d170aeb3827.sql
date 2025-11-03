-- Remover política problemática que verifica auth.role() incorretamente
DROP POLICY IF EXISTS "Service role manages participants" ON event_participants;

-- Criar política correta que permite service role e usuários gerenciarem seus registros
CREATE POLICY "Allow service role and user self-management" 
ON event_participants
FOR ALL
TO authenticated
USING (
  -- Service role pode acessar tudo (via edge function)
  current_setting('request.jwt.role', true) = 'service_role'
  OR 
  -- Usuários podem ver/editar apenas seus próprios registros
  auth.uid() = user_id
)
WITH CHECK (
  -- Service role pode inserir/atualizar qualquer registro
  current_setting('request.jwt.role', true) = 'service_role'
  OR 
  -- Usuários podem inserir/atualizar apenas seus próprios registros
  auth.uid() = user_id
);

-- Comentário explicativo
COMMENT ON POLICY "Allow service role and user self-management" ON event_participants 
IS 'Permite edge functions (service_role) gerenciarem participantes e usuários gerenciarem seus próprios dados';