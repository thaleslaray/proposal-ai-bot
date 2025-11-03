-- Drop existing view
DROP VIEW IF EXISTS public.monthly_leaderboard;

-- Create new monthly_leaderboard with Viralidade score
CREATE VIEW public.monthly_leaderboard AS
WITH monthly_stats AS (
  SELECT 
    dh.user_id,
    COUNT(dh.id) as prds_created,
    COALESCE(SUM(dh.likes_count), 0) as total_likes,
    COALESCE(SUM(dh.remixes_count), 0) as total_remixes,
    COALESCE(SUM(dh.view_count), 0) as total_views
  FROM document_history dh
  WHERE dh.created_at >= date_trunc('month', CURRENT_DATE)
    AND dh.is_public = true
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
FROM monthly_stats
ORDER BY engagement_score DESC
LIMIT 50;