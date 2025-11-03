-- ====================================
-- GALERIA 2.0 - DATABASE COMPLETO
-- ====================================

-- 1. Adicionar campos em profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Adicionar campos em document_history
ALTER TABLE document_history
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS featured_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- 3. Criar tabela user_badges
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  badge_type TEXT NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_type ON user_badges(badge_type);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view badges"
ON user_badges FOR SELECT
USING (true);

CREATE POLICY "Service role can manage badges"
ON user_badges FOR ALL
USING (auth.role() = 'service_role');

-- 4. Criar tabela notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
ON notifications FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- 5. Criar tabela prd_comments
CREATE TABLE IF NOT EXISTS prd_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES document_history(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES prd_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  is_implemented BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prd_comments_document_id ON prd_comments(document_id);
CREATE INDEX IF NOT EXISTS idx_prd_comments_parent_id ON prd_comments(parent_id);

ALTER TABLE prd_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments"
ON prd_comments FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create comments"
ON prd_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
ON prd_comments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
ON prd_comments FOR DELETE
USING (auth.uid() = user_id);

-- 6. Criar tabela prd_analytics
CREATE TABLE IF NOT EXISTS prd_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES document_history(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  user_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prd_analytics_document_id ON prd_analytics(document_id);
CREATE INDEX IF NOT EXISTS idx_prd_analytics_event_type ON prd_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_prd_analytics_created_at ON prd_analytics(created_at);

ALTER TABLE prd_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert analytics"
ON prd_analytics FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view analytics"
ON prd_analytics FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- 7. Criar view monthly_leaderboard
CREATE OR REPLACE VIEW monthly_leaderboard AS
SELECT 
  user_id,
  COUNT(*) as prds_created,
  COALESCE(SUM(likes_count), 0) as total_likes,
  COALESCE(SUM(remixes_count), 0) as total_remixes,
  COALESCE(SUM(view_count), 0) as total_views,
  RANK() OVER (ORDER BY SUM(likes_count) DESC) as rank_by_likes,
  RANK() OVER (ORDER BY SUM(remixes_count) DESC) as rank_by_remixes
FROM document_history
WHERE created_at >= date_trunc('month', NOW())
AND is_public = true
GROUP BY user_id
ORDER BY total_likes DESC
LIMIT 50;

-- 8. Criar view alltime_leaderboard
CREATE OR REPLACE VIEW alltime_leaderboard AS
SELECT 
  user_id,
  COUNT(*) as prds_created,
  COALESCE(SUM(likes_count), 0) as total_likes,
  COALESCE(SUM(remixes_count), 0) as total_remixes,
  COALESCE(SUM(view_count), 0) as total_views,
  RANK() OVER (ORDER BY SUM(likes_count) DESC) as rank
FROM document_history
WHERE is_public = true
GROUP BY user_id
ORDER BY total_likes DESC
LIMIT 100;

-- 9. Criar função calculate_user_badges
CREATE OR REPLACE FUNCTION calculate_user_badges(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prd_count INTEGER;
  max_likes INTEGER;
  max_remixes INTEGER;
  total_engagement INTEGER;
BEGIN
  SELECT COUNT(*) INTO prd_count
  FROM document_history
  WHERE user_id = target_user_id AND is_public = true;
  
  SELECT COALESCE(MAX(likes_count), 0) INTO max_likes
  FROM document_history
  WHERE user_id = target_user_id;
  
  SELECT COALESCE(MAX(remixes_count), 0) INTO max_remixes
  FROM document_history
  WHERE user_id = target_user_id;
  
  SELECT COALESCE(SUM(likes_count) + SUM(remixes_count), 0) INTO total_engagement
  FROM document_history
  WHERE user_id = target_user_id;
  
  IF prd_count >= 10 THEN
    INSERT INTO user_badges (user_id, badge_type, metadata)
    VALUES (target_user_id, 'top_creator', jsonb_build_object('prds_count', prd_count))
    ON CONFLICT DO NOTHING;
  END IF;
  
  IF max_likes >= 50 THEN
    INSERT INTO user_badges (user_id, badge_type, metadata)
    VALUES (target_user_id, 'most_loved', jsonb_build_object('max_likes', max_likes))
    ON CONFLICT DO NOTHING;
  END IF;
  
  IF max_remixes >= 10 THEN
    INSERT INTO user_badges (user_id, badge_type, metadata)
    VALUES (target_user_id, 'remix_master', jsonb_build_object('max_remixes', max_remixes))
    ON CONFLICT DO NOTHING;
  END IF;
  
  IF total_engagement >= 200 THEN
    INSERT INTO user_badges (user_id, badge_type, metadata)
    VALUES (target_user_id, 'viral_star', jsonb_build_object('total_engagement', total_engagement))
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- 10. Criar função increment_views
CREATE OR REPLACE FUNCTION increment_views(doc_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE document_history
  SET view_count = view_count + 1
  WHERE id = doc_id;
END;
$$;