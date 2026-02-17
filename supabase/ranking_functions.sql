-- Functions e queries para cálculo de Ranking
-- Execute isso em Supabase SQL quando estiver pronto

-- ============================================
-- 1. VIEW: Ranking de Usuários
-- ============================================
CREATE OR REPLACE VIEW public.user_ranking AS
SELECT 
  up.user_id,
  up.level,
  up.total_xp,
  au.email,
  ROW_NUMBER() OVER (ORDER BY up.total_xp DESC, up.level DESC) AS rank,
  ROUND(
    100.0 * ROW_NUMBER() OVER (ORDER BY up.total_xp DESC, up.level DESC) / 
    (SELECT COUNT(*) FROM user_progression)
  ) AS percentile_rank
FROM user_progression up
LEFT JOIN auth.users au ON up.user_id = au.id
WHERE up.user_id IS NOT NULL
ORDER BY up.total_xp DESC, up.level DESC;

-- ============================================
-- 2. FUNCTION: Get user percentile/ranking
-- ============================================
CREATE OR REPLACE FUNCTION get_user_ranking_info(user_id UUID)
RETURNS TABLE (
  rank BIGINT,
  percentile_rank NUMERIC,
  level INT,
  total_xp INT,
  total_users BIGINT,
  display_name TEXT
) LANGUAGE SQL AS $$
  SELECT 
    ROW_NUMBER() OVER (ORDER BY up.total_xp DESC, up.level DESC)::BIGINT,
    ROUND(
      100.0 * ROW_NUMBER() OVER (ORDER BY up.total_xp DESC, up.level DESC) / 
      (SELECT COUNT(*) FROM user_progression)
    )::NUMERIC,
    up.level,
    up.total_xp,
    (SELECT COUNT(*) FROM user_progression)::BIGINT,
    COALESCE(au.email, 'Usuário')
  FROM user_progression up
  LEFT JOIN auth.users au ON up.user_id = au.id
  WHERE up.user_id = $1
  LIMIT 1
$$;

-- ============================================
-- 3. FUNCTION: Get top users for leaderboard
-- ============================================
CREATE OR REPLACE FUNCTION get_top_users(limit_count INT DEFAULT 10)
RETURNS TABLE (
  rank BIGINT,
  display_name TEXT,
  level INT,
  total_xp INT
) LANGUAGE SQL AS $$
  SELECT 
    ROW_NUMBER() OVER (ORDER BY up.total_xp DESC, up.level DESC)::BIGINT,
    COALESCE(au.email, 'Usuário'),
    up.level,
    up.total_xp
  FROM user_progression up
  LEFT JOIN auth.users au ON up.user_id = au.id
  WHERE up.user_id IS NOT NULL
  ORDER BY up.total_xp DESC, up.level DESC
  LIMIT $1
$$;

-- ============================================
-- Usar em Supabase (client-side)
-- ============================================
-- Para obter ranking do usuário:
-- SELECT * FROM get_user_ranking_info('user-uuid-here');
--
-- Para obter top 10:
-- SELECT * FROM get_top_users(10);
--
-- Para usar via Supabase client:
-- const { data } = await supabase
--   .rpc('get_user_ranking_info', { user_id: user.id });
