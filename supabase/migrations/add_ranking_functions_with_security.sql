-- Migration: Add ranking functions with proper security
-- This fixes the permission denied error for auth.users table

-- ============================================
-- 1. VIEW: Ranking de Usuários
-- ============================================
DROP VIEW IF EXISTS public.user_ranking CASCADE;

CREATE OR REPLACE VIEW public.user_ranking AS
SELECT 
  up.user_id,
  up.level,
  up.total_xp,
  ROW_NUMBER() OVER (ORDER BY up.total_xp DESC, up.level DESC) AS rank,
  ROUND(
    100.0 * ROW_NUMBER() OVER (ORDER BY up.total_xp DESC, up.level DESC) / 
    (SELECT COUNT(*) FROM user_progression)
  ) AS percentile_rank
FROM user_progression up
WHERE up.user_id IS NOT NULL
ORDER BY up.total_xp DESC, up.level DESC;

-- ============================================
-- 2. FUNCTION: Get user percentile/ranking
-- Using SECURITY DEFINER to bypass RLS on auth tables
-- ============================================
CREATE OR REPLACE FUNCTION get_user_ranking_info(user_id UUID)
RETURNS TABLE (
  rank BIGINT,
  percentile_rank NUMERIC,
  level INT,
  total_xp INT,
  total_users BIGINT,
  display_name TEXT
) LANGUAGE SQL SECURITY DEFINER SET search_path = public AS $$
  SELECT 
    ROW_NUMBER() OVER (ORDER BY up.total_xp DESC, up.level DESC)::BIGINT,
    ROUND(
      100.0 * ROW_NUMBER() OVER (ORDER BY up.total_xp DESC, up.level DESC) / 
      (SELECT COUNT(*) FROM user_progression)
    )::NUMERIC,
    up.level,
    up.total_xp,
    (SELECT COUNT(*) FROM user_progression)::BIGINT,
    'Usuário' AS display_name
  FROM user_progression up
  WHERE up.user_id = $1
  LIMIT 1
$$;

-- ============================================
-- 3. FUNCTION: Get top users for leaderboard
-- Using SECURITY DEFINER to bypass RLS on auth tables
-- ============================================
CREATE OR REPLACE FUNCTION get_top_users(limit_count INT DEFAULT 10)
RETURNS TABLE (
  rank BIGINT,
  display_name TEXT,
  level INT,
  total_xp INT
) LANGUAGE SQL SECURITY DEFINER SET search_path = public AS $$
  SELECT 
    ROW_NUMBER() OVER (ORDER BY up.total_xp DESC, up.level DESC)::BIGINT,
    'Usuário' AS display_name,
    up.level,
    up.total_xp
  FROM user_progression up
  WHERE up.user_id IS NOT NULL
  ORDER BY up.total_xp DESC, up.level DESC
  LIMIT $1
$$;

-- ============================================
-- 4. Grant execution permissions
-- ============================================
GRANT EXECUTE ON FUNCTION get_user_ranking_info(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_users(INT) TO authenticated;
