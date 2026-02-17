/**
 * Hook para carregar dados de ranking do usuário
 */

import { useState, useEffect } from 'react';
import { getUserRankingInfo, formatPercentile } from '../utils/rankingUtils';

/**
 * Hook: useUserRanking
 * Carrega informações de ranking do usuário
 * @param {string} userId - User ID
 * @returns {object} Dados de ranking (rank, percentile, etc)
 */
export const useUserRanking = (userId) => {
  const [ranking, setRanking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const fetchRanking = async () => {
      setLoading(true);
      try {
        const rankingData = await getUserRankingInfo(userId);
        
        if (rankingData) {
          setRanking({
            ...rankingData,
            percentileText: formatPercentile(rankingData.percentile_rank)
          });
        }
      } catch (err) {
        console.error('Erro ao carregar ranking:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRanking();
  }, [userId]);

  return { ranking, loading, error };
};
