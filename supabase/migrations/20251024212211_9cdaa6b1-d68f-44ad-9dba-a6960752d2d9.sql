-- Permitir usuários verem seus próprios remixes
-- Necessário para validações internas do Supabase durante INSERT
CREATE POLICY "Users can view own remixes"
ON public.prd_remixes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Permitir visualização pública de todos os remixes (para estatísticas públicas)
CREATE POLICY "Anyone can view all remixes"
ON public.prd_remixes
FOR SELECT
TO public
USING (true);

COMMENT ON POLICY "Anyone can view all remixes" ON public.prd_remixes IS
  'Permite visualização pública de remixes para estatísticas e leaderboard';