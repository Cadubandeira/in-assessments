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
    // Buscar top users diretamente da tabela user_progression
    const { data: progressionData, error: progressionError } = await supabase
      .from('user_progression')
      .select('user_id, level, total_xp')
      .order('total_xp', { ascending: false })
      .limit(limit);

    if (progressionError) {
      console.warn('Erro ao buscar progressão:', progressionError);
      return [];
    }

    if (!progressionData || progressionData.length === 0) {
      console.log('Nenhum dado de progressão encontrado');
      return [];
    }

    console.log('Progression data:', progressionData);

    // Buscar user_display_name de assessment_events para cada usuário
    const userIds = progressionData.map(p => p.user_id);
    
    const { data: eventsData, error: eventsError } = await supabase
      .from('assessment_events')
      .select('user_id, user_display_name')
      .in('user_id', userIds)
      .order('created_at', { ascending: false });

    if (eventsError) {
      console.warn('Erro ao buscar eventos para display names:', eventsError);
    }

    console.log('Events data for display names:', eventsData);

    // Criar um mapa de user_id -> display_name a partir dos eventos
    const displayNameMap = {};
    if (eventsData) {
      eventsData.forEach(event => {
        if (event.user_id && event.user_display_name && !displayNameMap[event.user_id]) {
          displayNameMap[event.user_id] = event.user_display_name;
        }
      });
    }

    // Combinar dados de progressão com display_name dos eventos
    const enrichedData = progressionData.map((p, index) => {
      return {
        rank: index + 1,
        user_id: p.user_id,
        display_name: displayNameMap[p.user_id],
        level: p.level,
        total_xp: p.total_xp
      };
    });

    console.log('Enriched data:', enrichedData);
    return enrichedData;
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
