-- Fix SECURITY DEFINER views to use SECURITY INVOKER
-- This ensures views respect RLS policies of the querying user

-- Fix monthly_leaderboard view
ALTER VIEW public.monthly_leaderboard SET (security_invoker = on);

-- Fix alltime_leaderboard view
ALTER VIEW public.alltime_leaderboard SET (security_invoker = on);

-- Fix public_profiles view
ALTER VIEW public.public_profiles SET (security_invoker = on);

-- Fix prd_like_stats view
ALTER VIEW public.prd_like_stats SET (security_invoker = on);

-- Fix hotmart_cache_admin view
ALTER VIEW public.hotmart_cache_admin SET (security_invoker = on);

COMMENT ON VIEW public.monthly_leaderboard IS 
  'Leaderboard com dados all-time usando SECURITY INVOKER para respeitar RLS';

COMMENT ON VIEW public.alltime_leaderboard IS 
  'Leaderboard histórico usando SECURITY INVOKER para respeitar RLS';

COMMENT ON VIEW public.public_profiles IS 
  'Perfis públicos usando SECURITY INVOKER para respeitar RLS';

COMMENT ON VIEW public.prd_like_stats IS 
  'Estatísticas de likes usando SECURITY INVOKER para respeitar RLS';

COMMENT ON VIEW public.hotmart_cache_admin IS 
  'Cache de validação Hotmart usando SECURITY INVOKER para respeitar RLS';