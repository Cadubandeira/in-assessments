import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  Brain,
  BrainCircuit,
  CheckCircle2,
  Circle,
  Flame,
  Heart,
  Settings,
  Sparkles,
  Star,
  Tag,
  Target,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { TOKENS } from '../../config/tokens';
import { useUserRole } from '../../hooks/useUserRole';
import { canUserTakeAssessment } from '../../utils/assessmentRules';
import ManagementSkeleton from '../../components/skeletons/admin/ManagementSkeleton';

const iconMap = {
  circle: Circle,
  heart: Heart,
  star: Star,
  zap: Zap,
  flame: Flame,
  target: Target,
  activity: Activity,
  brain: Brain,
  award: Award,
  'trending-up': TrendingUp
};

const isMissingRelationError = (error, relationName) => {
  const message = (error?.message || '').toLowerCase();
  const relation = (relationName || '').toLowerCase();
  const errorCode = error?.code;

  if (errorCode === 'PGRST205') {
    return message.includes(relation);
  }

  return (
    message.includes('could not find the table')
    && message.includes(relation)
  );
};

const Management = ({ user }) => {
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [indicators, setIndicators] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [activeVersions, setActiveVersions] = useState({});
  const [statsByAssessment, setStatsByAssessment] = useState({});
  const [communityReports, setCommunityReports] = useState([]);
  const [error, setError] = useState(null);
  const [hoveredTooltip, setHoveredTooltip] = useState(null);
  const [moderatingReportId, setModeratingReportId] = useState(null);

  useEffect(() => {
    if (!roleLoading && role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);

        const [indRes, assRes, verRes, statsRes, reportsRes] = await Promise.all([
          supabase
            .from('indicators_master')
            .select('id, name, color, icon')
            .order('name', { ascending: true }),
          supabase
            .from('assessments')
            .select('id, name, is_active, version')
            .order('name', { ascending: true }),
          supabase
            .from('assessment_versions')
            .select('assessment_id, version_number, is_active'),
          supabase
            .from('assessment_event_stats')
            .select('assessment_id, total_executions, unique_users, avg_per_user'),
          supabase
            .from('community_post_reports')
            .select('id, post_id, reporter_id, reason, details, status, moderator_notes, created_at')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
        ]);

        if (indRes.error) throw indRes.error;
        if (assRes.error) throw assRes.error;
        if (verRes.error) throw verRes.error;
        if (statsRes.error) throw statsRes.error;
        if (reportsRes.error && !isMissingRelationError(reportsRes.error, 'community_post_reports')) {
          throw reportsRes.error;
        }

        if (!mounted) return;

        setIndicators(indRes.data || []);
        setAssessments(assRes.data || []);

        const versionMap = {};
        (verRes.data || []).forEach((row) => {
          if (row.is_active) {
            versionMap[row.assessment_id] = row.version_number;
          }
        });
        setActiveVersions(versionMap);

        const normalizedStats = {};
        (statsRes.data || []).forEach((row) => {
          if (!row.assessment_id) return;
          normalizedStats[row.assessment_id] = {
            total: Number(row.total_executions || 0),
            uniqueUsers: Number(row.unique_users || 0),
            averagePerUser: Number(row.avg_per_user || 0)
          };
        });

        setStatsByAssessment(normalizedStats);

        const pendingReports = reportsRes.error ? [] : (reportsRes.data || []);
        const postIds = [...new Set(pendingReports.map((report) => report.post_id).filter(Boolean))];
        const userIds = [...new Set(pendingReports.map((report) => report.reporter_id).filter(Boolean))];

        let postsMap = {};
        if (postIds.length > 0) {
          const { data: postsData, error: postsError } = await supabase
            .from('community_posts')
            .select('id, author_id, content, created_at, is_deleted')
            .in('id', postIds);

          if (postsError) throw postsError;

          postsMap = (postsData || []).reduce((acc, post) => {
            acc[post.id] = post;
            return acc;
          }, {});

          postsData?.forEach((post) => {
            if (post.author_id) userIds.push(post.author_id);
          });
        }

        const dedupedUserIds = [...new Set(userIds.filter(Boolean))];
        let profilesMap = {};

        if (dedupedUserIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, display_name')
            .in('id', dedupedUserIds);

          if (profilesError) throw profilesError;

          profilesMap = (profilesData || []).reduce((acc, profile) => {
            acc[profile.id] = profile;
            return acc;
          }, {});
        }

        const enrichedReports = pendingReports.map((report) => {
          const post = postsMap[report.post_id] || null;
          return {
            ...report,
            post,
            reporterName: profilesMap[report.reporter_id]?.display_name || 'Usuário',
            authorName: profilesMap[post?.author_id]?.display_name || 'Autor'
          };
        });

        setCommunityReports(enrichedReports);
      } catch (err) {
        if (mounted) setError(err.message || String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (role === 'admin') load();
    return () => { mounted = false; };
  }, [role, roleLoading, navigate]);

  const handleStart = () => {
    if (!canUserTakeAssessment([], role)) {
      alert('Você não pode iniciar um novo assessment no momento.');
      return;
    }
    navigate('/assessment/active');
  };

  const sortedAssessments = useMemo(() => {
    return [...assessments].sort((a, b) => {
      if (a.is_active !== b.is_active) {
        return a.is_active ? -1 : 1;
      }
      return (a.name || '').localeCompare(b.name || '', 'pt-BR');
    });
  }, [assessments]);

  const handleModerateReport = async (report, action) => {
    setModeratingReportId(report.id);

    try {
      if (action === 'hide' && report.post?.id) {
        const { error: postError } = await supabase
          .from('community_posts')
          .update({ is_deleted: true, updated_at: new Date().toISOString() })
          .eq('id', report.post.id);

        if (postError) throw postError;
      }

      const { error: reportError } = await supabase
        .from('community_post_reports')
        .update({
          status: action === 'hide' ? 'resolved' : 'dismissed',
          moderator_id: user?.id || null,
          moderator_notes: action === 'hide' ? 'Post ocultado pela moderação.' : 'Denúncia descartada pela moderação.',
          resolved_at: new Date().toISOString()
        })
        .eq('id', report.id);

      if (reportError) throw reportError;

      setCommunityReports((current) => current.filter((item) => item.id !== report.id));
    } catch (err) {
      alert(`Não foi possível moderar a denúncia: ${err.message || String(err)}`);
    } finally {
      setModeratingReportId(null);
    }
  };

  if (roleLoading || loading) {
    return <ManagementSkeleton />;
  }

  if (role !== 'admin') {
    return (
      <div className="p-12 text-center text-red-600">
        Acesso negado. Somente admins podem acessar esta página.
      </div>
    );
  }

  if (error) {
    return <div className="p-12 text-center text-red-600">{error}</div>;
  }

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF] overflow-x-hidden"
      role="main"
    >

      <section className="bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] pt-[72px] pb-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute top-16 -left-10 w-48 h-48 md:w-64 md:h-64 bg-white rounded-full blur-3xl" aria-hidden="true"></div>
          <div className="absolute bottom-0 -right-20 w-64 h-64 md:w-96 md:h-96 bg-[#312E81] rounded-full blur-3xl" aria-hidden="true"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 relative z-10 w-full">
          <p className="text-white/80 font-medium mb-2 tracking-wide uppercase text-xs sm:text-sm">
            Bem-vindo administrador
          </p>
          <h1 className={`${TOKENS.fonts.serif} text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 leading-tight`}>
            Painel gerencial<br/>
          </h1>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 -mt-16 relative z-20 w-full">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6 lg:mb-8">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#1E1B4B]">Moderação da comunidade</h2>
              <p className="text-sm text-gray-500">Denúncias pendentes para análise dos moderadores.</p>
            </div>
          </div>

          {communityReports.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma denúncia pendente no momento.</p>
          ) : (
            <div className="space-y-3">
              {communityReports.map((report) => (
                <div key={report.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#1E1B4B]">
                        Denúncia por {report.reporterName} · motivo: {report.reason}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Autor do post: {report.authorName} · {new Date(report.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={moderatingReportId === report.id}
                        onClick={() => handleModerateReport(report, 'dismiss')}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600"
                      >
                        {moderatingReportId === report.id ? 'Processando...' : 'Descartar'}
                      </button>
                      <button
                        type="button"
                        disabled={moderatingReportId === report.id}
                        onClick={() => handleModerateReport(report, 'hide')}
                        className="rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        {moderatingReportId === report.id ? 'Processando...' : 'Ocultar post'}
                      </button>
                    </div>
                  </div>

                  {report.details && (
                    <p className="mt-3 text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{report.details}</p>
                  )}

                  <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Conteúdo denunciado</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{report.post?.content || 'Post não encontrado.'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
          <div className="lg:col-span-7 flex flex-col gap-4 sm:gap-6 lg:gap-8">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#1E1B4B]">Indicadores</h2>
                  <p className="text-sm text-gray-500">Esses são os indicadores mensurados atualmente na plataforma.</p>
                </div>
                <div className="relative">
                  <button
                    onClick={() => navigate('/admin/indicators')}
                    onMouseEnter={() => setHoveredTooltip('indicators')}
                    onMouseLeave={() => setHoveredTooltip(null)}
                    className="p-2 text-gray-600 hover:text-[#4F46E5] transition"
                    aria-label="Configurar indicadores"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                  {hoveredTooltip === 'indicators' && (
                    <div className="absolute right-0 top-10 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      Configurar
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="list" aria-label="Lista de indicadores">
                {indicators.map((indicator) => {
                  const Icon = iconMap[indicator.icon] || Circle;
                  return (
                    <div
                      key={indicator.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-white"
                      role="listitem"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: indicator.color || '#6366F1' }}
                        aria-hidden="true"
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#1E1B4B] truncate">{indicator.name}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* BANNER CTA HISTÓRICO */}
            <div className="bg-gradient-to-r from-[#4F46E5] to-[#6366F1] rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl flex flex-col md:flex-row items-center justify-between text-white gap-4 sm:gap-6 w-full">
              <div className="flex items-center gap-3 sm:gap-4 md:gap-6 w-full md:w-auto">
                <div className="flex-1 min-w-0">
                  <h4 className="text-lg sm:text-xl font-bold">Ver Histórico de Assessments</h4>
                  <p className="text-white/80 text-sm">
                    Acompanhe a evolução dos usuários e os resultados de todos os assessments.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/history')}
                className="bg-white text-[#4F46E5] px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg font-bold text-xs sm:text-sm uppercase tracking-wider hover:scale-105 transition-transform whitespace-nowrap w-full md:w-auto"
              >
                Ver Histórico
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-4 sm:gap-6 lg:gap-8">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#1E1B4B]">Assessments</h2>
                  <p className="text-sm text-gray-500">Esses são todos os assessments ativos ou não na plataforma.</p>
                </div>
                <div className="relative">
                  <button
                    onClick={() => navigate('/admin/assessments/builder')}
                    onMouseEnter={() => setHoveredTooltip('assessments')}
                    onMouseLeave={() => setHoveredTooltip(null)}
                    className="p-2 text-gray-600 hover:text-[#4F46E5] transition"
                    aria-label="Configurar assessments"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                  {hoveredTooltip === 'assessments' && (
                    <div className="absolute right-0 top-10 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      Configurar
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3" role="list" aria-label="Lista de assessments">
                {sortedAssessments.map((assessment) => {
                  const stats = statsByAssessment[assessment.id] || {
                    total: 0,
                    uniqueUsers: 0,
                    averagePerUser: 0
                  };
                  const version = activeVersions[assessment.id] ?? assessment.version ?? '-';

                  return (
                    <div
                      key={assessment.id}
                      className="p-4 rounded-lg border border-gray-100 bg-white"
                      role="listitem"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-[#1E1B4B]">{assessment.name}</h3>
                          <p className="text-xs text-gray-500">
                            Status: {assessment.is_active ? 'Ativo' : 'Desativado'}
                          </p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${assessment.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {assessment.is_active ? 'Ativo' : 'Desativado'}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-gray-600">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-[#4F46E5]" />
                          <span>Versão atual: {version}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-[#4F46E5]" />
                          <span>Pessoas: {stats.uniqueUsers}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-[#4F46E5]" />
                          <span>Execuções: {stats.total}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-[#4F46E5]" />
                          <span>Média por usuário: {stats.averagePerUser.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Management;
