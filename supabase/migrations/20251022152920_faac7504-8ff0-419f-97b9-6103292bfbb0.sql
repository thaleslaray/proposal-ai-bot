-- Corrigir lógica de rate limiting para -1 (ilimitado)
CREATE OR REPLACE FUNCTION public.check_and_increment_prd_usage(
  p_user_id UUID,
  p_daily_limit INTEGER
)
RETURNS TABLE(allowed BOOLEAN, current_count INTEGER, reset_time TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_count INTEGER;
  v_reset_time TIMESTAMPTZ;
  v_usage_date DATE;
BEGIN
  -- Reset automático se mudou de dia
  v_usage_date := CURRENT_DATE;
  v_reset_time := (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMPTZ;
  
  -- Lock row para evitar race condition
  SELECT usage_count, usage_date INTO v_current_count, v_usage_date
  FROM prd_usage_tracking
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- Se não existe ou mudou de dia, resetar
  IF v_current_count IS NULL OR v_usage_date < CURRENT_DATE THEN
    INSERT INTO prd_usage_tracking (user_id, usage_count, usage_date)
    VALUES (p_user_id, 0, CURRENT_DATE)
    ON CONFLICT (user_id) DO UPDATE
      SET usage_count = 0, 
          usage_date = CURRENT_DATE, 
          last_request = NOW();
    
    v_current_count := 0;
  END IF;
  
  -- CORREÇÃO: Verificar se é ilimitado ANTES da comparação
  IF p_daily_limit = -1 THEN
    -- Incrementar contador para estatísticas (mas sempre permitir)
    UPDATE prd_usage_tracking
    SET usage_count = usage_count + 1,
        last_request = NOW()
    WHERE user_id = p_user_id;
    
    RETURN QUERY SELECT true, v_current_count + 1, v_reset_time;
    RETURN;
  END IF;
  
  -- Verificar limite normal
  IF v_current_count >= p_daily_limit THEN
    RETURN QUERY SELECT false, v_current_count, v_reset_time;
    RETURN;
  END IF;
  
  -- Incrementar contador
  UPDATE prd_usage_tracking
  SET usage_count = usage_count + 1,
      last_request = NOW()
  WHERE user_id = p_user_id;
  
  RETURN QUERY SELECT true, v_current_count + 1, v_reset_time;
END;
$$;