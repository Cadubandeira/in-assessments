import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useUserRole } from '../hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import { Filter } from 'lucide-react';
import { TOKENS } from '../config/tokens';

function classify(percentage) {
  if (percentage <= 40) return 'Crítico';
  if (percentage <= 70) return 'Moderado';
  return 'Saudável';
}

const getClassificationColor = (classification) => {
  if (classification === 'Crítico') return 'bg-red-100 text-red-700';
  if (classification === 'Moderado') return 'bg-yellow-100 text-yellow-700';
  return 'bg-green-100 text-green-700';
};

export default function History() {
  const navigate = useNavigate();
  const { role, loading: roleLoading, error: roleError } = useUserRole();
  const [history, setHistory] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [viewMode, setViewMode] = useState('latest'); // 'latest'|'all'|'user'
  const [selectedUser, setSelectedUser] = useState(null);
  const [activityType, setActivityType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
            if (role !== 'admin' && data) {
              // Agrupar por assessment_id e pegar apenas o primeiro (mais recente)
              const latestAssessmentsMap = new Map();
              data.forEach((event) => {
                if (!latestAssessmentsMap.has(event.assessment_id)) {
                  latestAssessmentsMap.set(event.assessment_id, event);
                }
              });
              setHistory(Array.from(latestAssessmentsMap.values()));
            } else {
              setHistory(data || []);
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
  const isUserWithOneResult = role !== 'admin' && history.length === 1;
  const isUserWithMultipleResults = role !== 'admin' && history.length > 1;
  // Build a list of unique user ids from history (for admin filter)
  const uniqueUsers = Array.from(
    new Map(
      history
        .filter(h => h.user_id)
        .map(h => [h.user_id, { id: h.user_id, label: h.user_display_name || h.user_id }])
    ).values()
  );

  // Determine which items to show based on viewMode and selectedUser
  let visibleItems = history;
  if (isAdmin) {
    if (viewMode === 'latest') {
      // latest for admin defaults to the most recent overall
      const latestMap = new Map();
      history.forEach((item) => {
        if (!latestMap.has(item.assessment_id)) {
          latestMap.set(item.assessment_id, item);
        }
      });
      visibleItems = Array.from(latestMap.values());
    } else if (viewMode === 'user' && selectedUser) {
      visibleItems = history.filter(h => h.user_id === selectedUser);
    } else if (viewMode === 'all') {
      visibleItems = history;
    }
  } else {
    visibleItems = history;
  }

  if (activityType !== 'all') {
    visibleItems = visibleItems.filter(item => item.assessments?.type === activityType);
  }

  const activityTypes = Array.from(
    new Set(history.map(item => item.assessments?.type).filter(Boolean))
  );

  const typeLabel = (type) => {
    if (!type) return 'Atividade';
    if (type === 'assessment') return 'Assessment';
    if (type === 'real_scenario') return 'Situacoes reais';
    if (type === 'real_scenarios') return 'Situacoes reais';
    return type.replace(/_/g, ' ');
  };

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

        <section className="bg-white/90 backdrop-blur-sm border border-white/60 rounded-2xl p-6 sm:p-8 shadow-lg mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4F46E5]">Resumo</p>
              <h2 className={`${TOKENS.fonts.serif} text-2xl sm:text-3xl text-[#1E1B4B]`}>
                Seus resultados em um so lugar
              </h2>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 text-sm text-gray-600">
                <Filter className="w-4 h-4" />
                <span>Filtrar</span>
              </div>
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="border border-[#E0E7FF] rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="all">Todas atividades</option>
                {activityTypes.map(type => (
                  <option key={type} value={type}>{typeLabel(type)}</option>
                ))}
              </select>
              {isAdmin && (
                <>
                  <select
                    value={viewMode}
                    onChange={(e) => setViewMode(e.target.value)}
                    className="border border-[#E0E7FF] rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    <option value="latest">Mais recente</option>
                    <option value="all">Todos os usuarios</option>
                    <option value="user">Usuario especifico</option>
                  </select>

                  {viewMode === 'user' && (
                    <select
                      className="border border-[#E0E7FF] rounded-lg px-3 py-2 text-sm bg-white"
                      value={selectedUser || ''}
                      onChange={(e) => setSelectedUser(e.target.value)}
                    >
                      <option value="">Selecione usuario</option>
                      {uniqueUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.label}</option>
                      ))}
                    </select>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

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
              const classification = classify(percentage);
              const date = item.created_at
                ? new Date(item.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                : '-';

              const versionNumber = item.assessment_versions?.version_number || '—';
              const assessmentName = item.assessments?.name || 'Assessment';
              const performedBy = item.user_display_name || item.user_id || '—';

              return (
                <div key={item.id} className="p-6 sm:p-8 border border-white/70 rounded-2xl bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-lg transition-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4F46E5]">Resultado</span>
                        <span className="text-xs text-gray-500">{date}</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">v{versionNumber}</span>
                        <div className={`px-3 py-1 text-xs font-medium rounded-full ${getClassificationColor(classification)}`}>
                          {classification}
                        </div>
                        {isAdmin && (
                          <div className="text-xs text-gray-500">
                            Usuario: <span className="font-semibold text-gray-700">{performedBy}</span>
                          </div>
                        )}
                      </div>
                      <h3 className={`${TOKENS.fonts.serif} text-2xl text-[#1E1B4B] mb-2`}>
                        {assessmentName}
                      </h3>
                      <div className="text-lg font-semibold text-gray-800">
                        {percentage}% · {total} de {max} pontos
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/results/${item.id}`)}
                      className="px-4 py-2.5 bg-[#4F46E5] text-white rounded-lg font-semibold hover:bg-[#312E81] transition-colors"
                    >
                      Ver detalhes
                    </button>
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
