-- Grant permissions for RPC functions
-- Execute isso em Supabase após criar as funções

-- Dar permissão para usuários autenticados usarem as funções RPC
GRANT EXECUTE ON FUNCTION get_user_ranking_info(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_users(INT) TO authenticated;

-- Dar permissão para acessar a view
GRANT SELECT ON user_ranking TO authenticated;

-- Verificar que as funções existem
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_user_ranking_info', 'get_top_users');
