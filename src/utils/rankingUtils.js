/**
 * Ranking Utilities
 * Integra com as functions do Supabase para ranking de usuários
 */

import { supabase } from '../supabaseClient';

/**
 * Get user's ranking information (posição, percentil, etc)
 * @param {string} userId - User ID
 * @returns {object} Ranking info com rank, percentile, nível, XP
 */
export const getUserRankingInfo = async (userId) => {
  try {
    const { data, error } = await supabase
      .rpc('get_user_ranking_info', { user_id: userId });

    if (error) {
      console.warn('Erro ao buscar ranking do usuário via RPC:', error);
      // Fallback: obter dados básicos directamente
      return await getFallbackRankingInfo(userId);
    }

    return data ? data[0] : null;
  } catch (err) {
    console.error('Erro ao buscar ranking:', err);
    return await getFallbackRankingInfo(userId);
  }
};

/**
 * Fallback para ranking se RPC não funcionar
 * Calcula ranking de forma simples
 */
const getFallbackRankingInfo = async (userId) => {
  try {
    const { data: userProgression, error: userError } = await supabase
      .from('user_progression')
      .select('level, total_xp')
      .eq('user_id', userId)
      .single();

    if (userError || !userProgression) {
      return null;
    }

    // Contar usuários com mais XP
    const { count } = await supabase
      .from('user_progression')
      .select('id', { count: 'exact' })
      .gt('total_xp', userProgression.total_xp);

    const totalUsers = await supabase
      .from('user_progression')
      .select('id', { count: 'exact' });

    const rank = (count || 0) + 1;
    const percentile = Math.round((rank / (totalUsers?.count || 1)) * 100);

    return {
      rank,
      percentile_rank: percentile,
      level: userProgression.level,
      total_xp: userProgression.total_xp,
      total_users: totalUsers?.count || 0,
      display_name: 'Usuário'
    };
  } catch (err) {
    console.error('Erro no fallback ranking:', err);
    return null;
  }
};

/**
 * Get top users for leaderboard
 * @param {number} limit - Quantos users retornar (padrão 10)
 * @returns {array} Array de usuários no top
 */
export const getTopUsers = async (limit = 10) => {
  try {
    const { data, error } = await supabase
      .rpc('get_top_users', { limit_count: limit });

    if (error) {
      console.warn('Erro ao buscar top users:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Erro ao buscar top users:', err);
    return [];
  }
};

/**
 * Format percentile rank como "Top X%"
 * @param {number} percentile - Percentil (1-100)
 * @returns {string} String formatted (ex: "Top 2%")
 */
export const formatPercentile = (percentile) => {
  if (!percentile) return 'N/A';
  return `Top ${100 - percentile + 1}%`;
};

/**
 * Get medal emoji based on rank
 * @param {number} rank - Posição no ranking
 * @returns {string} Emoji correspondente
 */
export const getRankMedal = (rank) => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return '🏅';
};
