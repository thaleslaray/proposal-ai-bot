
-- Fix leaderboard to show all-time data instead of monthly-only
-- This prevents empty leaderboard at the start of a new month

DROP VIEW IF EXISTS public.monthly_leaderboard;

-- Create leaderboard with all-time data (renamed but keeping same structure for compatibility)
CREATE VIEW public.monthly_leaderboard AS
WITH all_time_stats AS (
  SELECT 
    dh.user_id,
    COUNT(dh.id) as prds_created,
    COALESCE(SUM(dh.likes_count), 0) as total_likes,
    COALESCE(SUM(dh.remixes_count), 0) as total_remixes,
    COALESCE(SUM(dh.view_count), 0) as total_views
  FROM document_history dh
  WHERE dh.is_public = true
  GROUP BY dh.user_id
)
SELECT 
  user_id,
  prds_created,
  total_likes,
  total_remixes,
  total_views,
  -- Engagement Score focado em Viralidade
  (
    (prds_created * 2.0) +
    (total_likes * 3.0) +
    (total_remixes * 4.0) +
    (total_views * 0.5) +
    CASE 
      WHEN total_views > 0 AND total_remixes > 0
      THEN (total_remixes::float / total_views * 100) * 4.0
      ELSE 0 
    END
  )::numeric(10,2) as engagement_score,
  ROW_NUMBER() OVER (ORDER BY (
    (prds_created * 2.0) +
    (total_likes * 3.0) +
    (total_remixes * 4.0) +
    (total_views * 0.5) +
    CASE 
      WHEN total_views > 0 AND total_remixes > 0
      THEN (total_remixes::float / total_views * 100) * 4.0
      ELSE 0 
    END
  ) DESC) as rank,
  ROW_NUMBER() OVER (ORDER BY total_likes DESC) as rank_by_likes,
  ROW_NUMBER() OVER (ORDER BY total_remixes DESC) as rank_by_remixes
FROM all_time_stats
ORDER BY engagement_score DESC
LIMIT 50;

COMMENT ON VIEW public.monthly_leaderboard IS 
  'Leaderboard com dados de todos os tempos (all-time) para evitar leaderboard vazio no início do mês';
