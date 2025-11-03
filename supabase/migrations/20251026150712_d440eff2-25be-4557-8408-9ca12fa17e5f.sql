-- Recalcular custos históricos com preços corretos da OpenAI
-- GPT-5-mini: $0.25/1M input, $2.00/1M output
-- GPT-5-nano: $0.05/1M input, $0.40/1M output

UPDATE api_usage
SET cost_usd = CASE
  -- GPT-5-mini: $0.25/1M input, $2.00/1M output
  WHEN metadata->>'model' = 'gpt-5-mini' THEN
    ROUND(
      (COALESCE((metadata->>'prompt_tokens')::numeric, 0) * 0.00000025 +
       COALESCE((metadata->>'completion_tokens')::numeric, 0) * 0.000002)::numeric,
      6
    )
  
  -- GPT-5-nano: $0.05/1M input, $0.40/1M output
  WHEN metadata->>'model' = 'gpt-5-nano' THEN
    ROUND(
      (COALESCE((metadata->>'prompt_tokens')::numeric, 0) * 0.00000005 +
       COALESCE((metadata->>'completion_tokens')::numeric, 0) * 0.0000004)::numeric,
      6
    )
  
  -- Mantém custo original se modelo desconhecido
  ELSE cost_usd
END
WHERE metadata ? 'prompt_tokens' 
  AND metadata ? 'completion_tokens'
  AND metadata ? 'model';