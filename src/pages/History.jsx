import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useUserRole } from '../hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import { Filter, Zap, Circle } from 'lucide-react';
import { TOKENS } from '../config/tokens';
import { calculateXP, formatXP, XP_CONFIG } from '../utils/gamificationUtils';
import { getLucideIcon } from '../utils/iconUtils';

function classifyFallback(percentage) {
  if (percentage <= 40) return 'Crítico';
  if (percentage <= 70) return 'Moderado';
  return 'Saudável';
}

function getClassificationFromRanges(percentage, overallRanges) {
  if (!overallRanges || overallRanges.length === 0) {
    return classifyFallback(percentage);
  }
  
  const range = overallRanges.find(r => percentage >= r.min_score && percentage <= r.max_score);
  return range ? range.label : classifyFallback(percentage);
}

const getIndicatorBadgeStyle = (value) => {
  const clamped = Math.min(100, Math.max(0, Number(value) || 0));
  const t = clamped / 100;
  const red = { r: 220, g: 38, b: 38 };
  const blue = { r: 59, g: 130, b: 246 };
  const green = { r: 22, g: 163, b: 74 };

  const blend = (from, to, amount) => ({
    r: Math.round(from.r + (to.r - from.r) * amount),
    g: Math.round(from.g + (to.g - from.g) * amount),
    b: Math.round(from.b + (to.b - from.b) * amount)
  });

  const blended = t <= 0.5
    ? blend(red, blue, t * 2)
    : blend(blue, green, (t - 0.5) * 2);

  return {
    backgroundColor: `rgb(${blended.r}, ${blended.g}, ${blended.b})`,
    color: '#FFFFFF',
    boxShadow: `0 0 12px rgba(${blended.r}, ${blended.g}, ${blended.b}, 0.35)`
  };
};

export default function History() {
  const navigate = useNavigate();
  const { role, loading: roleLoading, error: roleError } = useUserRole();
  const [history, setHistory] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [sortOrder, setSortOrder] = useState('recent'); // 'recent' | 'oldest' | 'best' | 'worst'
  const [selectedAssessment, setSelectedAssessment] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [indicatorsMeta, setIndicatorsMeta] = useState({});
  const [overallRangesCache, setOverallRangesCache] = useState({});

  useEffect(() => {
    if (roleLoading) return; // Wait for role to load

    let mounted = true;

    const fetchHistory = async () => {
      try {
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (mounted) setError('Usuário não autenticado.');
          return;
        }

        if (mounted) setCurrentUserId(user.id);

        let query = supabase
          .from('assessment_events')
          .select(`
            id,
            user_id,
            assessment_id,
            assessment_version,
            assessment_version_id,
            total_score,
            max_possible_score,
            classification_snapshot,
            indicator_scores_snapshot,
            user_display_name,
            created_at,
            assessments (
              name,
              type
            ),
            assessment_versions!assessment_events_assessment_version_id_fkey (
              id,
              version_number,
              is_active
            )
          `)
          .order('created_at', { ascending: false });

        // Filter by role
        if (role !== 'admin') {
          query = query.eq('user_id', user.id);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
          const msg = String(fetchError.message || fetchError);
          if (/0 rows|No rows|Results contain 0/i.test(msg)) {
            if (mounted) setHistory([]);
          } else {
            throw fetchError;
          }
        } else {
          if (mounted) {
            const historyData = data || [];
            setHistory(historyData);

            // Buscar metadados dos indicadores para todos os assessments
            const assessmentIds = [...new Set(historyData.map(item => item.assessment_id).filter(Boolean))];
            
            if (assessmentIds.length > 0) {
              const { data: indicatorsData, error: indError } = await supabase
                .from('indicators')
                .select(`
                  id,
                  assessment_id,
                  indicator_master_id,
                  name,
                  indicators_master (
                    id,
                    name,
                    color,
                    icon
                  )
                `)
                .in('assessment_id', assessmentIds);

              if (!indError && indicatorsData) {
                const metaMap = {};
                indicatorsData.forEach(ind => {
                  const indicatorName = ind.indicators_master?.name || ind.name;
                  const indicatorMasterId = ind.indicator_master_id;
                  
                  const metaPayload = {
                    id: indicatorMasterId,
                    name: indicatorName,
                    color: ind.indicators_master?.color || '#6366F1',
                    icon: ind.indicators_master?.icon || 'circle'
                  };
                  
                  if (indicatorMasterId) {
                    metaMap[indicatorMasterId] = metaPayload;
                  }
                  if (indicatorName) {
                    metaMap[indicatorName] = metaPayload;
                  }
                  // Também adicionar por ID do indicador customizado
                  if (ind.id) {
                    metaMap[ind.id] = metaPayload;
                  }
                });
                setIndicatorsMeta(metaMap);
              }
            }

            // Buscar overall_ranges para todos os assessment_versions
            const versionIds = [...new Set(historyData.map(item => item.assessment_version_id).filter(Boolean))];
            
            if (versionIds.length > 0) {
              const { data: rangesData, error: rangesError } = await supabase
                .from('assessment_overall_ranges')
                .select('*')
                .in('assessment_version_id', versionIds);

              if (!rangesError && rangesData) {
                const rangesMap = {};
                rangesData.forEach(range => {
                  if (!rangesMap[range.assessment_version_id]) {
                    rangesMap[range.assessment_version_id] = [];
                  }
                  rangesMap[range.assessment_version_id].push(range);
                });
                
                // Ordenar ranges de cada versão por min_score
                Object.keys(rangesMap).forEach(versionId => {
                  rangesMap[versionId].sort((a, b) => a.min_score - b.min_score);
                });
                
                setOverallRangesCache(rangesMap);
              }
            }
          }
        }
      } catch (err) {
        if (mounted) setError(err.message || String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchHistory();
    return () => { mounted = false; };
  }, [role, roleLoading]);

  if (roleLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F5F3EC]">Carregando...</div>;
  }

  if (roleError) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F5F3EC] text-red-600">{roleError}</div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F5F3EC] text-red-600">{error}</div>;
  }

  const isAdmin = role === 'admin';

  // Lista de assessments únicos para filtro de admin
  const uniqueAssessments = Array.from(
    new Map(
      history
        .filter(h => h.assessments?.name)
        .map(h => [h.assessment_id, { id: h.assessment_id, name: h.assessments.name }])
    ).values()
  );

  // Aplicar filtros
  let visibleItems = history;

  // Filtro por assessment (apenas admin)
  if (isAdmin && selectedAssessment !== 'all') {
    visibleItems = visibleItems.filter(item => item.assessment_id === selectedAssessment);
  }

  // Aplicar ordenamento
  visibleItems = [...visibleItems].sort((a, b) => {
    const aTotal = a.total_score ?? 0;
    const aMax = a.max_possible_score ?? 1;
    const aPercentage = aMax > 0 ? (aTotal / aMax) * 100 : 0;
    
    const bTotal = b.total_score ?? 0;
    const bMax = b.max_possible_score ?? 1;
    const bPercentage = bMax > 0 ? (bTotal / bMax) * 100 : 0;

    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;

    if (sortOrder === 'recent') {
      return bTime - aTime; // Mais recente primeiro
    } else if (sortOrder === 'oldest') {
      return aTime - bTime; // Mais antigo primeiro
    } else if (sortOrder === 'best') {
      return bPercentage - aPercentage; // Melhor primeiro
    } else if (sortOrder === 'worst') {
      return aPercentage - bPercentage; // Pior primeiro
    }
    return 0;
  });

  const totals = visibleItems.reduce(
    (acc, item) => {
      const total = item.total_score ?? 0;
      const max = item.max_possible_score ?? 0;
      const percentage = max > 0 ? Math.round((total / max) * 100) : 0;
      acc.sum += percentage;
      acc.best = Math.max(acc.best, percentage);
      const timestamp = item.created_at ? new Date(item.created_at).getTime() : 0;
      acc.latest = Math.max(acc.latest, timestamp);
      return acc;
    },
    { sum: 0, best: 0, latest: 0 }
  );
  const totalCount = visibleItems.length;
  const averageScore = totalCount > 0 ? Math.round(totals.sum / totalCount) : 0;
  const latestDateLabel = totals.latest
    ? new Date(totals.latest).toLocaleDateString('pt-BR', { dateStyle: 'medium' })
    : '—';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF] overflow-x-hidden">
      <section className="bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] pt-[72px] pb-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
          <div className="absolute top-16 -left-10 w-48 h-48 md:w-64 md:h-64 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 -right-20 w-64 h-64 md:w-96 md:h-96 bg-[#312E81] rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 relative z-10 w-full text-left">
          <p className="text-white/80 font-medium mb-2 tracking-wide uppercase text-xs sm:text-sm">Atividades realizadas</p>
          <h1 className={`${TOKENS.fonts.serif} text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight`}>
            Evolução
          </h1>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 -mt-16 relative z-20 w-full pb-16">
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="bg-white/90 backdrop-blur-sm border border-white/60 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4F46E5]">Atividades</p>
            <p className={`${TOKENS.fonts.serif} text-2xl text-[#1E1B4B] mt-2`}>{totalCount}</p>
            <p className="text-xs text-gray-500 mt-1">Resultados exibidos</p>
          </div>
          <div className="bg-white/90 backdrop-blur-sm border border-white/60 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4F46E5]">Media</p>
            <p className={`${TOKENS.fonts.serif} text-2xl text-[#1E1B4B] mt-2`}>{averageScore}%</p>
            <p className="text-xs text-gray-500 mt-1">Desempenho geral</p>
          </div>
          <div className="bg-white/90 backdrop-blur-sm border border-white/60 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4F46E5]">Melhor resultado</p>
            <p className={`${TOKENS.fonts.serif} text-2xl text-[#1E1B4B] mt-2`}>{totals.best}%</p>
            <p className="text-xs text-gray-500 mt-1">Seu pico recente</p>
          </div>
          <div className="bg-white/90 backdrop-blur-sm border border-white/60 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4F46E5]">Ultima atividade</p>
            <p className={`${TOKENS.fonts.serif} text-2xl text-[#1E1B4B] mt-2`}>{latestDateLabel}</p>
            <p className="text-xs text-gray-500 mt-1">Data mais recente</p>
          </div>
        </section>

        {/* Filtros alinhados à direita */}
        <div className="flex justify-end items-center gap-3 mb-6">
          <div className="inline-flex items-center gap-2 text-sm text-gray-600">
            <Filter className="w-4 h-4" />
            <span>Ordenar</span>
          </div>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="border border-[#E0E7FF] rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="recent">Mais recente</option>
            <option value="oldest">Mais antigo</option>
            <option value="best">Melhor desempenho</option>
            <option value="worst">Pior desempenho</option>
          </select>
          {isAdmin && (
            <>
              <div className="inline-flex items-center gap-2 text-sm text-gray-600">
                <span>Assessment</span>
              </div>
              <select
                value={selectedAssessment}
                onChange={(e) => setSelectedAssessment(e.target.value)}
                className="border border-[#E0E7FF] rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="all">Todos</option>
                {uniqueAssessments.map(assessment => (
                  <option key={assessment.id} value={assessment.id}>{assessment.name}</option>
                ))}
              </select>
            </>
          )}
        </div>

        {!history || history.length === 0 ? (
          <section className="bg-white/90 backdrop-blur-sm border border-white/60 rounded-2xl p-10 text-center shadow-lg">
            <p className="text-sm text-gray-600">Nenhum assessment encontrado.</p>
          </section>
        ) : (
          <div className="space-y-4">
            {visibleItems.map((item) => {
              const total = item.total_score ?? 0;
              const max = item.max_possible_score ?? 0;
              const percentage = max > 0 ? Math.round((total / max) * 100) : 0;
              
              // Buscar overall_ranges para este assessment_version_id
              const versionRanges = overallRangesCache[item.assessment_version_id] || [];
              const classification = getClassificationFromRanges(percentage, versionRanges);

              const versionNumber = item.assessment_versions?.version_number || '—';
              const assessmentName = item.assessments?.name || 'Assessment';
              const performedBy = item.user_display_name || item.user_id || '—';
              
              // Calcular XP
              const activityType = item.activity_type || 'assessment';
              const totalXp = calculateXP(total, max, activityType);
              
              // Processar indicadores do snapshot
              let indicatorScores = item.indicator_scores_snapshot || {};
              if (typeof indicatorScores === 'string') {
                try { indicatorScores = JSON.parse(indicatorScores); } catch (e) { indicatorScores = {}; }
              }

              return (
                <div 
                  key={item.id} 
                  className="group border border-white/70 rounded-2xl bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/results/${item.id}`)}
                >
                  <div className="p-5">
                    {/* Container com grid de 2 linhas */}
                    <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2">
                      {/* Linha 1 - Esquerda: Título */}
                      <div className="flex-1">
                        <h3 className={`${TOKENS.fonts.serif} text-xl text-[#1E1B4B] font-bold leading-tight`}>
                          {assessmentName}
                        </h3>
                        {isAdmin && (
                          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                            <span>{new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                            <span>•</span>
                            <span>{new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                            <span>•</span>
                            <span>v{versionNumber}</span>
                            <span>•</span>
                            <span>{performedBy}</span>
                          </div>
                        )}
                      </div>

                      {/* Linha 1 - Direita: Percentual */}
                      <div className="flex items-start">
                        <span className="text-4xl font-black text-[#1E1B4B] leading-none">{percentage}%</span>
                      </div>

                      {/* Linha 2 - Esquerda: XP + Indicadores */}
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Quadrado XP */}
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} fill="currentColor" />
                          </div>
                          <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                            {formatXP(totalXp)}
                          </span>
                        </div>

                        {/* Círculos dos indicadores */}
                        {Object.entries(indicatorScores).map(([key, value], idx) => {
                          const score = Number(value?.score ?? value ?? 0);
                          const maxScore = Number(value?.maxScore ?? value?.max_score ?? 0);
                          const indicatorPercentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
                          const indicatorName = value?.name || key;
                          const indicatorId = value?.indicator_id || key;
                          
                          // Buscar metadados (cor e ícone)
                          const meta = indicatorsMeta[indicatorId] || indicatorsMeta[indicatorName] || {};
                          const color = meta.color || '#6366F1';
                          const IconComponent = meta.icon ? getLucideIcon(meta.icon) : Circle;

                          return (
                            <div
                              key={key}
                              className="flex items-center gap-2"
                              title={`${indicatorName}: ${indicatorPercentage}%`}
                            >
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: color }}
                              >
                                <IconComponent className="w-4 h-4 text-white" />
                              </div>
                              <span className="text-sm font-semibold text-gray-700">{indicatorPercentage}%</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Linha 2 - Direita: Badge */}
                      <div className="flex items-center">
                        <div
                          className="px-4 py-2 text-sm font-bold rounded-full whitespace-nowrap shadow-md"
                          style={getIndicatorBadgeStyle(percentage)}
                        >
                          {classification}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
