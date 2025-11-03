-- Remove SECURITY DEFINER from leaderboard views
-- These views only aggregate public data, so SECURITY DEFINER is unnecessary

-- Drop and recreate alltime_leaderboard without SECURITY DEFINER
DROP VIEW IF EXISTS public.alltime_leaderboard;

CREATE VIEW public.alltime_leaderboard AS
SELECT 
  user_id,
  COUNT(*) AS prds_created,
  COALESCE(SUM(likes_count), 0) AS total_likes,
  COALESCE(SUM(remixes_count), 0) AS total_remixes,
  COALESCE(SUM(view_count), 0) AS total_views,
  RANK() OVER (ORDER BY SUM(likes_count) DESC) AS rank
FROM document_history
WHERE is_public = true
GROUP BY user_id
ORDER BY total_likes DESC
LIMIT 100;

-- Drop and recreate monthly_leaderboard without SECURITY DEFINER
DROP VIEW IF EXISTS public.monthly_leaderboard;

CREATE VIEW public.monthly_leaderboard AS
SELECT 
  user_id,
  COUNT(*) AS prds_created,
  COALESCE(SUM(likes_count), 0) AS total_likes,
  COALESCE(SUM(remixes_count), 0) AS total_remixes,
  COALESCE(SUM(view_count), 0) AS total_views,
  RANK() OVER (ORDER BY SUM(likes_count) DESC) AS rank_by_likes,
  RANK() OVER (ORDER BY SUM(remixes_count) DESC) AS rank_by_remixes
FROM document_history
WHERE created_at >= DATE_TRUNC('month', NOW())
  AND is_public = true
GROUP BY user_id
ORDER BY total_likes DESC
LIMIT 50;