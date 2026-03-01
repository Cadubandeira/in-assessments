/**
 * Hook: useTopRanking
 * Busca o top 30 usuários mais bem rankeados
 * Usa a função getTopUsers que busca dados reais do backend
 */

import { useState, useEffect } from 'react';
import { getTopUsers } from '../utils/rankingUtils';

export const useTopRanking = () => {
  const [topUsers, setTopUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTopRanking = async () => {
      setLoading(true);
      try {
        const users = await getTopUsers(30);
        setTopUsers(users || []);
      } catch (err) {
        console.error('Erro ao buscar top ranking:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTopRanking();
  }, []);

  return { topUsers, loading, error };
};
