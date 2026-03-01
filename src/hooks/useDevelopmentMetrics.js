/**
 * Hook: useDevelopmentMetrics
 * Busca e processa métricas de desenvolvimento do usuário
 * Usa user_indicator_scores como fonte principal (estado atual)
 * com fallback para assessment_events caso a tabela nao exista.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export const useDevelopmentMetrics = (userId) => {
  const [indicators, setIndicators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));

  const normalizeScoreData = (scoreData) => {
    if (!scoreData) return { score: 0, maxScore: 0, percentage: 0 };

    const score = Number(scoreData.score ?? scoreData.value ?? 0);
    const maxScore = Number(scoreData.maxScore ?? scoreData.max_score ?? 0);
    const percentageFromPayload = Number(scoreData.percentage ?? scoreData.percent ?? 0);

    const percentage = percentageFromPayload > 0
      ? Math.round(percentageFromPayload)
      : maxScore > 0
        ? Math.round((score / maxScore) * 100)
        : 0;

    return { score, maxScore, percentage };
  };

  useEffect(() => {
    if (!userId) return;

    const fetchMetrics = async () => {
      setLoading(true);
      try {
        // 1) Fonte principal: user_indicator_scores (estado atual por indicador)
        const { data: consolidated, error: consolidatedError } = await supabase
          .from('user_indicator_scores')
          .select('indicator_name, indicator_id, score, max_score, percentage, updated_at, indicators_master (id, name, color, icon, description)')
          .eq('user_id', userId)
          .order('indicator_name', { ascending: true });

        if (consolidatedError && !/relation|does not exist|42P01/i.test(String(consolidatedError.message || consolidatedError))) {
          throw consolidatedError;
        }

        if (consolidated && consolidated.length > 0) {
          const missingNames = consolidated
            .filter((row) => !row.indicators_master && row.indicator_name)
            .map((row) => row.indicator_name);

          let masterByName = [];
          if (missingNames.length > 0) {
            const { data: byName, error: byNameError } = await supabase
              .from('indicators_master')
              .select('id, name, color, icon, description')
              .in('name', missingNames);

            if (byNameError) throw byNameError;
            masterByName = byName || [];
          }

          const processedIndicators = consolidated.map((row) => {
            const masterData = row.indicators_master
              || masterByName.find((m) => m.name === row.indicator_name)
              || {};
            const normalized = normalizeScoreData({
              score: row.score,
              max_score: row.max_score,
              percentage: row.percentage
            });

            return {
              id: row.indicator_id || masterData?.id || row.indicator_name,
              name: masterData?.name || row.indicator_name || 'Indicador Desconhecido',
              description: masterData?.description || '',
              color: masterData?.color || '#6366F1',
              icon: masterData?.icon || 'circle',
              score: normalized.score,
              maxScore: normalized.maxScore || 100,
              percentage: normalized.percentage
            };
          });

          processedIndicators.sort((a, b) => a.name.localeCompare(b.name));
          setIndicators(processedIndicators);
          return;
        }

        // 2) Fallback: consolidar o resultado mais recente por indicador via assessment_events
        const { data: events, error: eventError } = await supabase
          .from('assessment_events')
          .select('indicator_scores_snapshot, executed_at')
          .eq('user_id', userId)
          .order('executed_at', { ascending: false })
          .limit(200);

        if (eventError) {
          console.warn('Nenhum evento encontrado:', eventError);
          setIndicators([]);
          return;
        }

        if (!events || events.length === 0) {
          setIndicators([]);
          return;
        }

        const latestByIndicator = new Map();
        events.forEach((event) => {
          const snapshot = event?.indicator_scores_snapshot || {};
          Object.entries(snapshot).forEach(([key, scoreData]) => {
            const indicatorId = isUuid(key) ? key : (scoreData?.indicator_id || null);
            const indicatorName = scoreData?.name || (isUuid(key) ? null : key);
            const mapKey = indicatorId || indicatorName;

            if (mapKey && !latestByIndicator.has(mapKey)) {
              latestByIndicator.set(mapKey, {
                indicatorId,
                indicatorName,
                executedAt: event.executed_at,
                scoreData
              });
            }
          });
        });

        const indicatorKeys = Array.from(latestByIndicator.keys());
        if (indicatorKeys.length === 0) {
          setIndicators([]);
          return;
        }

        const indicatorIds = indicatorKeys.filter((key) => isUuid(key));
        const indicatorNames = indicatorKeys.filter((key) => !isUuid(key));

        let masterIndicators = [];
        if (indicatorIds.length > 0) {
          const { data, error: masterByIdError } = await supabase
            .from('indicators_master')
            .select('id, name, color, icon, description')
            .in('id', indicatorIds);

          if (masterByIdError) throw masterByIdError;
          masterIndicators = data || [];
        }

        if (indicatorNames.length > 0) {
          const { data, error: masterByNameError } = await supabase
            .from('indicators_master')
            .select('id, name, color, icon, description')
            .in('name', indicatorNames);

          if (masterByNameError) throw masterByNameError;
          masterIndicators = [...masterIndicators, ...(data || [])];
        }

        const processedIndicators = indicatorKeys.map((indicatorKey) => {
          const latest = latestByIndicator.get(indicatorKey);
          const masterData = isUuid(indicatorKey)
            ? masterIndicators?.find(m => m.id === indicatorKey)
            : masterIndicators?.find(m => m.name === indicatorKey);
          const normalized = normalizeScoreData(latest?.scoreData);

          return {
            id: masterData?.id || latest?.indicatorId || indicatorKey,
            name: masterData?.name || latest?.indicatorName || indicatorKey,
            description: masterData?.description || '',
            color: masterData?.color || '#6366F1',
            icon: masterData?.icon || 'circle',
            score: normalized.score,
            maxScore: normalized.maxScore || 100,
            percentage: normalized.percentage
          };
        });

        processedIndicators.sort((a, b) => a.name.localeCompare(b.name));
        setIndicators(processedIndicators);
      } catch (err) {
        console.error('Erro ao buscar metricas de desenvolvimento:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [userId]);

  return { indicators, loading, error };
};
