import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
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

const Management = ({ user }) => {
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [indicators, setIndicators] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [activeVersions, setActiveVersions] = useState({});
  const [statsByAssessment, setStatsByAssessment] = useState({});
  const [error, setError] = useState(null);
  const [hoveredTooltip, setHoveredTooltip] = useState(null);

  useEffect(() => {
    if (!roleLoading && role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);

        const [indRes, assRes, verRes, statsRes] = await Promise.all([
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
            .select('assessment_id, total_executions, unique_users, avg_per_user')
        ]);

        if (indRes.error) throw indRes.error;
        if (assRes.error) throw assRes.error;
        if (verRes.error) throw verRes.error;
        if (statsRes.error) throw statsRes.error;

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

  if (roleLoading || loading) {
    return <div className="p-12 text-center">Carregando...</div>;
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
    <div className="min-h-screen bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF] overflow-x-hidden">

      <section className="bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] pt-8 pb-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
          <div className="absolute top-16 -left-10 w-48 h-48 md:w-64 md:h-64 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 -right-20 w-64 h-64 md:w-96 md:h-96 bg-[#312E81] rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 w-full">
          <p className="text-white/80 font-medium mb-2 tracking-wide uppercase text-xs sm:text-sm">
            Bem-vindo administrador
          </p>
          <h1 className={`${TOKENS.fonts.serif} text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 leading-tight`}>
            Painel gerencial<br/>
          </h1>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 -mt-16 relative z-20 w-full">
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
                    title="Configurar"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {indicators.map((indicator) => {
                  const Icon = iconMap[indicator.icon] || Circle;
                  return (
                    <div
                      key={indicator.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-white"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: indicator.color || '#6366F1' }}
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
                    title="Configurar"
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

              <div className="space-y-3">
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
