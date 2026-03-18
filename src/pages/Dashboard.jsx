import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Zap, 
  History, 
  Trophy,
  TriangleAlert,
  Sparkles,
  Circle
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { TOKENS } from '../config/tokens';
import { useUserRole } from '../hooks/useUserRole';
import { useTopRanking } from '../hooks/useTopRanking';
import { useCommunityProfile } from '../hooks/useCommunityProfile';
import { canUserTakeAssessment } from '../utils/assessmentRules';
import { 
  formatActivityName, 
  getActivityConfig
} from '../utils/activityUtils';
import {
  getCurrentLevelProgress,
  getLevelBadge,
  getLevelColor,
  formatXP
} from '../utils/gamificationUtils';
import { useUserRanking } from '../hooks/useUserRanking';
import { useDevelopmentMetrics } from '../hooks/useDevelopmentMetrics';
import { getLucideIcon } from '../utils/iconUtils';
import DevelopmentChart from '../components/DevelopmentChart';
import DashboardSkeleton from '../components/skeletons/DashboardSkeleton';
import CallToActionCard from '../components/CallToActionCard';

const slugify = (value) => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)+/g, '');

const VIOLENCIA_ZERO_ORGANIZACIONAL_ID = import.meta.env.VITE_ASSESSMENT_VIOLENCIA_ZERO_ORGANIZACIONAL_ID || null;
const VIOLENCIA_ZERO_INDIVIDUAL_ID = import.meta.env.VITE_ASSESSMENT_VIOLENCIA_ZERO_INDIVIDUAL_ID || null;

const Dashboard = ({ user }) => {
  const navigate = useNavigate();
  const { displayName } = useCommunityProfile(user);

  const getDisplayUserName = (userData) => {
    if (userData?.id && user?.id && userData.id === user.id) {
      return displayName;
    }

    if (!userData) return 'Usuário';

    return userData.display_name
      || userData.user_display_name
      || userData.full_name
      || userData.name
      || userData.email?.split('@')[0]
      || userData.user_email?.split('@')[0]
      || 'Usuário';
  };

  // Mapeamento de indicadores para links de conteúdo
  const indicatorLinks = {
    'Liderança': 'https://open.spotify.com/episode/5MzWj3Z9ncd1PwLEZtgCfm?si=kU-llnAEQYOV5wWwW15EPg',
    'Agradabilidade': 'https://open.spotify.com/episode/3kQZQwK8vQwF5J8h2ZbQ9T?si=abc123',
    'Confiança': 'https://open.spotify.com/episode/1a2b3c4d5e6f7g8h9i0j?si=def456',
    'Visibilidade': 'https://open.spotify.com/episode/7h8i9j0k1l2m3n4o5p6q?si=ghi789',
    'Colaboração': 'https://open.spotify.com/episode/2b3c4d5e6f7g8h9i0j1k?si=jkl012',
    'Expertise': 'https://open.spotify.com/episode/4d5e6f7g8h9i0j1k2l3m?si=mno345',
    'Networking': 'https://open.spotify.com/episode/4bOWea00ODcatY660OOjuc'
  };
  const { role } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [animateXPBar, setAnimateXPBar] = useState(false);
  const [animateLevel, setAnimateLevel] = useState(false);
  const [previousStats, setPreviousStats] = useState(null);
  const [animationTrigger, setAnimationTrigger] = useState(0);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [showRankingModal, setShowRankingModal] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState(null);
  const [userStats, setUserStats] = useState({
    totalAssessments: 0,
    lastScore: 0,
    averageScore: 0,
    recentResults: [],
    level: 1,
    totalXP: 0,
    levelProgress: null
  });
  const [assessmentCards, setAssessmentCards] = useState({
    organizacional: {
      visible: true,
      title: 'Violência Zero - Organizacional',
      description: 'Avalie a maturidade da sua organização no enfrentamento à violência contra a mulher.',
      path: '/assessment/violencia-zero-organizacional'
    },
    individual: {
      visible: true,
      title: 'Violência Zero - Individual',
      description: 'Avalie o seu nível de conhecimento individual sobre o tema da Violência contra Mulheres e Meninas.',
      path: '/assessment/violencia-zero-individual'
    }
  });
  // Hook para carregar ranking do usuário
  const { ranking } = useUserRanking(user?.id);

  // Hook para carregar top 10 ranking global
  const { topUsers } = useTopRanking();

  // Hook para carregar métricas de desenvolvimento
  const { indicators: developmentIndicators } = useDevelopmentMetrics(user?.id);

  // Controlar scroll do body quando ranking modal está aberto
  useEffect(() => {
    if (showRankingModal) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = 'auto';
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.documentElement.style.overflow = 'auto';
      document.body.style.overflow = 'auto';
    };
  }, [showRankingModal]);

  useEffect(() => {
    // Reset animações e previousStats ao trocar usuário
    setAnimateXPBar(false);
    setAnimateLevel(false);
    setPreviousStats(null);
    setAnimationTrigger(0);
    loadUserStats();
  }, [user]);

  // Disparar animações apenas quando há mudança real de XP ou nível
  useEffect(() => {
    if (!loading && userStats.level !== undefined && userStats.totalXP !== undefined) {
      // Se é a primeira vez que carregamos dados (previousStats é null), armazenar sem animar
      if (previousStats === null) {
        setPreviousStats({
          level: userStats.level,
          totalXP: userStats.totalXP
        });
        return;
      }

      // Verificar se houve mudança real
      const levelChanged = userStats.level !== previousStats.level;
      const xpChanged = userStats.totalXP !== previousStats.totalXP;

      if (levelChanged || xpChanged) {
        // Houve mudança! Incrementar trigger para disparar animações
        setAnimationTrigger(prev => prev + 1);

        // Atualizar previousStats
        setPreviousStats({
          level: userStats.level,
          totalXP: userStats.totalXP
        });
      }
    }
  }, [userStats.level, userStats.totalXP, previousStats, loading]);

  // Executar as animações quando animationTrigger mudar
  useEffect(() => {
    if (animationTrigger > 0) {
      // Reset para fazer transition acontecer
      setAnimateLevel(false);
      setAnimateXPBar(false);

      // Pequeno delay para forçar o trigger da animação
      const timer = setTimeout(() => {
        setAnimateLevel(true);
        setTimeout(() => {
          setAnimateXPBar(true);
        }, 300);
      }, 10);

      return () => clearTimeout(timer);
    }
  }, [animationTrigger]);

  const loadUserStats = async () => {
    if (!user) return;

    try {
      const buildViolenceZeroCard = (assessment, fallbackTitle, fallbackPath, fallbackDescription) => ({
        title: assessment?.name || fallbackTitle,
        description: fallbackDescription,
        path: assessment?.id ? `/assessment/${assessment.id}` : fallbackPath
      });

      const violenceZeroIds = [VIOLENCIA_ZERO_ORGANIZACIONAL_ID, VIOLENCIA_ZERO_INDIVIDUAL_ID].filter(Boolean);
      let violenceZeroAssessments = [];
      let violenceZeroAssessmentsError = null;

      if (violenceZeroIds.length > 0) {
        const { data, error } = await supabase
          .from('assessments')
          .select('id, name')
          .eq('is_active', true)
          .in('id', violenceZeroIds);
        violenceZeroAssessments = data || [];
        violenceZeroAssessmentsError = error;
      } else {
        const { data, error } = await supabase
          .from('assessments')
          .select('id, name')
          .eq('is_active', true)
          .ilike('name', '%viol%zero%');
        violenceZeroAssessments = data || [];
        violenceZeroAssessmentsError = error;
      }

      if (violenceZeroAssessmentsError) {
        console.warn('Erro ao carregar assessments Violência Zero:', violenceZeroAssessmentsError);
      } else {
        const assessments = violenceZeroAssessments || [];
        const organizationalAssessment = VIOLENCIA_ZERO_ORGANIZACIONAL_ID
          ? assessments.find((item) => item.id === VIOLENCIA_ZERO_ORGANIZACIONAL_ID)
          : assessments.find((item) => slugify(item.name || '').includes('violencia-zero-organizacional'));
        const individualAssessment = VIOLENCIA_ZERO_INDIVIDUAL_ID
          ? assessments.find((item) => item.id === VIOLENCIA_ZERO_INDIVIDUAL_ID)
          : assessments.find((item) => slugify(item.name || '').includes('violencia-zero-individual'));

        const checkCompleted = async (assessmentId) => {
          if (!assessmentId) return false;
          const { data, error } = await supabase
            .from('assessment_events')
            .select('id')
            .eq('user_id', user.id)
            .eq('assessment_id', assessmentId)
            .limit(1);
          if (error) console.warn('Erro ao verificar conclusão de assessment:', error);
          return (data || []).length > 0;
        };

        const [hasCompletedOrganizational, hasCompletedIndividual] = await Promise.all([
          checkCompleted(organizationalAssessment?.id),
          checkCompleted(individualAssessment?.id)
        ]);

        const buildCard = (assessment, fallbackTitle, fallbackPath, fallbackDescription) =>
          buildViolenceZeroCard(assessment, fallbackTitle, fallbackPath, fallbackDescription);

        setAssessmentCards({
          organizacional: {
            ...buildCard(
              organizationalAssessment,
              'Violência Zero - Organizacional',
              '/assessment/violencia-zero-organizacional',
              'Identifique sinais críticos, avalie decisões e fortaleça uma cultura de segurança no ambiente de trabalho.'
            ),
            visible: !hasCompletedOrganizational
          },
          individual: {
            ...buildCard(
              individualAssessment,
              'Violência Zero - Individual',
              '/assessment/violencia-zero-individual',
              'Avalie seu próprio comportamento, reconheça padrões de risco e desenvolva uma postura mais segura e consciente.'
            ),
            visible: !hasCompletedIndividual
          }
        });
      }

      // Buscar dados de progressão do usuário
      const { data: progressionData, error: progressionError } = await supabase
        .from('user_progression')
        .select('level, total_xp')
        .eq('user_id', user.id)
        .maybeSingle();

      if (progressionError && progressionError.code !== 'PGRST116') {
        console.warn('Erro ao buscar progressão:', progressionError);
      }

      // Buscar histórico de atividades (assessments, quizzes, etc.)
      // Tenta incluir activity_type e activity_name (adicionados na migração)
      // Se não existirem, Supabase ignorará e retornará apenas colunas disponíveis
      const { data: assessmentEvents, error } = await supabase
        .from('assessment_events')
        .select('id, total_score, max_possible_score, executed_at, created_at, indicator_scores_snapshot, activity_type, activity_name')
        .eq('user_id', user.id)
        .order('executed_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Preparar dados de progressão
      const totalXP = progressionData?.total_xp || 0;
      const levelProgress = getCurrentLevelProgress(totalXP);

      if (assessmentEvents && assessmentEvents.length > 0) {
        const percentages = assessmentEvents.map(e => 
          e.max_possible_score > 0 ? Math.round((e.total_score / e.max_possible_score) * 100) : 0
        );

        setUserStats({
          totalAssessments: assessmentEvents.length,
          lastScore: percentages[0] || 0,
          averageScore: Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length),
          recentResults: assessmentEvents.slice(0, 3),
          level: levelProgress.level,
          totalXP: levelProgress.totalXP,
          levelProgress: levelProgress
        });
      } else {
        // Mesmo sem atividades, mostrar nível inicial
        setUserStats(prev => ({
          ...prev,
          level: levelProgress.level,
          totalXP: levelProgress.totalXP,
          levelProgress: levelProgress
        }));
      }
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    if (!canUserTakeAssessment([], role)) {
      alert('Voc\u00ea n\u00e3o pode iniciar um novo assessment no momento.');
      return;
    }
    navigate('/assessment/active');
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF] overflow-x-hidden">
      
      {/* HERO SECTION */}
      <section className="bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] pt-[72px] pb-32 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
          <div className="absolute top-20 -left-10 w-48 h-48 md:w-64 md:h-64 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 -right-20 w-64 h-64 md:w-96 md:h-96 bg-[#312E81] rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 relative z-10 w-full">
          <p className="text-white/80 font-medium mb-2 tracking-wide uppercase text-xs sm:text-sm">
            Olá, {displayName}
          </p>
          <h1 className={`${TOKENS.fonts.serif} text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 leading-tight`}>
            Seu potencial<br/>
            <span className="text-white/90">é ilimitado.</span>
          </h1>
        </div>
      </section>

      {/* CONTE\u00daDO PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 -mt-24 relative z-20 w-full">
        <div className={`grid ${userStats.totalAssessments > 0 ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'} gap-4 sm:gap-6 lg:gap-8`}>
          
          {/* CARDS DE ASSESSMENTS - FULL WIDTH */}
          {/* CARD VIOLÊNCIA ZERO - ORGANIZACIONAL */}
          {assessmentCards.organizacional.visible && (
            <div className={`w-full ${userStats.totalAssessments > 0 ? 'lg:col-span-12' : ''}`}>
            <button
              type="button"
              onClick={() => navigate(assessmentCards.organizacional.path)}
              className="w-full group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#7C2D12] via-[#DC2626] to-[#FB7185] p-[1px] text-left shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(220,38,38,0.35)]"
              aria-label="Ir para o assessment Violência Zero Organizacional"
            >
              <div className="relative overflow-hidden rounded-[calc(theme(borderRadius.2xl)-1px)] bg-[#1F1221] px-5 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7 text-white">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.22),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(251,113,133,0.26),_transparent_30%)] opacity-90" />
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -bottom-12 left-8 h-28 w-28 rounded-full bg-[#FB7185]/20 blur-3xl" />

                <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="max-w-3xl">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-white/85">
                      <span className="h-2 w-2 rounded-full bg-[#FDE68A] animate-pulse" />
                      Novo assessment
                    </div>

                    <h2 className={`${TOKENS.fonts.serif} text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight mb-2`}>
                      {assessmentCards.organizacional.title}
                    </h2>

                    <p className="text-sm sm:text-base lg:text-lg text-white/85 leading-relaxed max-w-2xl">
                      {assessmentCards.organizacional.description}
                    </p>

                    <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black uppercase tracking-[0.18em] text-[#B91C1C] transition-transform duration-300 group-hover:translate-x-1">
                      Realizar agora
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="hidden sm:flex h-20 w-20 lg:h-24 lg:w-24 flex-shrink-0 items-center justify-center rounded-[28px] border border-white/15 bg-white/10 shadow-lg">
                    <TriangleAlert className="h-10 w-10 lg:h-12 lg:w-12 text-white" />
                  </div>
                </div>
              </div>
            </button>
            </div>
            )}

            {/* CARD VIOLÊNCIA ZERO - INDIVIDUAL */}
            {assessmentCards.individual.visible && (
            <div className={`w-full ${userStats.totalAssessments > 0 ? 'lg:col-span-12' : ''}`}>
            <button
              type="button"
              onClick={() => navigate(assessmentCards.individual.path)}
              className="w-full group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#581C87] via-[#7C3AED] to-[#C084FC] p-[1px] text-left shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(124,58,237,0.35)]"
              aria-label="Ir para o assessment Violência Zero Individual"
            >
              <div className="relative overflow-hidden rounded-[calc(theme(borderRadius.2xl)-1px)] bg-[#1A0F2E] px-5 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7 text-white">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.22),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(192,132,252,0.26),_transparent_30%)] opacity-90" />
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -bottom-12 left-8 h-28 w-28 rounded-full bg-[#C084FC]/20 blur-3xl" />

                <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="max-w-3xl">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-white/85">
                      <span className="h-2 w-2 rounded-full bg-[#FDE68A] animate-pulse" />
                      Novo assessment
                    </div>

                    <h2 className={`${TOKENS.fonts.serif} text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight mb-2`}>
                      {assessmentCards.individual.title}
                    </h2>

                    <p className="text-sm sm:text-base lg:text-lg text-white/85 leading-relaxed max-w-2xl">
                      {assessmentCards.individual.description}
                    </p>

                    <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black uppercase tracking-[0.18em] text-[#7C3AED] transition-transform duration-300 group-hover:translate-x-1">
                      Realizar agora
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="hidden sm:flex h-20 w-20 lg:h-24 lg:w-24 flex-shrink-0 items-center justify-center rounded-[28px] border border-white/15 bg-white/10 shadow-lg">
                    <TriangleAlert className="h-10 w-10 lg:h-12 lg:w-12 text-white" />
                  </div>
                </div>
              </div>
            </button>
            </div>
            )}
            
            {/* CARD DE PERFORMANCE E CONTEÚDO - COL ESQUERDA - APENAS COM ASSESSMENTS */}
            {userStats.totalAssessments > 0 && (
            <div className="lg:col-span-8 flex flex-col gap-4 sm:gap-6 lg:gap-8 w-full">

            {/* CARD DE PERFORMANCE */}
            {userStats.totalAssessments > 0 && (
            <div className="bg-white/80 backdrop-blur-sm border border-white/50 p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl shadow-xl w-full">
              <div className="flex flex-col md:flex-row items-center gap-4 sm:gap-6 md:gap-8 relative w-full">
                <div className="w-full md:w-1/3 text-center md:text-left">
                  <p className="text-[#4F46E5] font-bold text-xs uppercase tracking-widest mb-1">
                    Nível atual
                  </p>
                  <h3 
                    className="text-4xl sm:text-5xl font-black text-[#1E1B4B] mb-2 transition-all duration-1000"
                    style={{
                      transform: animateLevel ? 'scale(1)' : 'scale(1)',
                      opacity: 1,
                      textShadow: animateLevel ? '0 0 20px rgba(79, 70, 229, 0.6)' : 'none',
                      filter: animateLevel ? 'drop-shadow(0 0 10px rgba(79, 70, 229, 0.4))' : 'drop-shadow(0 0 0px transparent)'
                    }}
                  >
                    {userStats.level}
                  </h3>
                  <div 
                    className="inline-flex items-center gap-2 px-3 py-1 text-white text-xs font-bold rounded-full uppercase transition-all duration-1000"
                    style={{ 
                      backgroundColor: getLevelColor(userStats.level),
                      transform: animateLevel ? 'scale(1)' : 'scale(1)',
                      opacity: 1,
                      boxShadow: animateLevel ? `0 0 15px ${getLevelColor(userStats.level)}99` : 'none'
                    }}
                  >
                    {getLevelBadge(userStats.level)}
                  </div>
                </div>
                <div className="w-full md:w-2/3 flex flex-col gap-4">
                  {userStats.levelProgress && (
                    <div className="flex flex-col gap-3">
                      {/* Ranking Badge e Progress Info */}
                      <div className="flex items-start justify-between gap-4">
                        {/* Ranking Badge - Esquerda */}
                        <div className="inline-flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-[#4F46E5]/10 to-[#6366F1]/10 border border-[#4F46E5]/20 text-[#4F46E5] text-base font-bold rounded-lg">
                          🏆 Ranking: {ranking?.percentileText || '...'}
                        </div>
                        
                        {/* Percentagem e XP - Direita */}
                        <div className="flex flex-col items-end">
                          <span className="text-lg font-bold text-[#4F46E5]">
                            {Math.round(userStats.levelProgress.progressPercentage)}%
                          </span>
                          <p className="text-xs text-gray-500 font-medium">
                            {userStats.levelProgress.totalXP} / {userStats.levelProgress.nextLevelThreshold} XP
                          </p>
                        </div>
                      </div>

                      {/* XP Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-md">
                        <div 
                          className="bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] h-3 rounded-full transition-all duration-[2000ms] ease-out"
                          style={{ 
                            width: animateXPBar ? `${userStats.levelProgress.progressPercentage}%` : `${userStats.levelProgress.progressPercentage}%`,
                            boxShadow: animateXPBar ? '0 0 15px rgba(79, 70, 229, 0.6)' : 'none'
                          }}
                        />
                      </div>

                     

                      {/* Buttons 
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => setShowRankingModal(true)}
                          className="flex-1 px-4 py-2 text-xs font-bold text-[#4F46E5] border border-[#4F46E5] rounded-lg hover:bg-[#4F46E5]/5 transition-colors"
                        >
                          Ranking
                        </button>
                        <button
                          onClick={() => setShowAchievementsModal(true)}
                          className="flex-1 px-4 py-2 text-xs font-bold text-white bg-[#4F46E5] rounded-lg hover:bg-[#4F46E5]/90 transition-colors"
                        >
                          Ver conquistas
                        </button>
                      </div>
                      */}
                    </div>
                  )}
                
                </div>
              </div>
            </div>
            )}

            

            {/* MEU DESENVOLVIMENTO */}
            {userStats.totalAssessments > 0 && (
            <div className={`bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm w-full overflow-hidden ${developmentIndicators.length > 7 ? 'lg:min-h-[950px]' : ''}`}>
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-bold text-[#1E1B4B]">Meu Desenvolvimento</h3>
                </div>
                <DevelopmentChart 
                  indicators={developmentIndicators} 
                  user={user} 
                  displayNameOverride={displayName}
                  onIndicatorClick={setSelectedIndicator}
                />
              </div>
            </div>
            )}

            {/* BANNER CTA ASSESSMENT */}
            {userStats.totalAssessments > 0 && (
            <CallToActionCard
              icon={<Zap size={32} />}
              title="Pronto para um novo desafio?"
              description="Mapeie seu crescimento em competências e revele insights."
              buttonText="Vamos lá!"
              onButtonClick={() => navigate('/activities')}
            />
            )}

          </div>
          )}

          {/* COLUNA DIREITA - APENAS COM ASSESSMENTS */}
          {userStats.totalAssessments > 0 && (
          <div className="lg:col-span-4 flex flex-col gap-4 sm:gap-6 lg:gap-8 w-full">
            
            {/* ATIVIDADES RECENTES */}
            {userStats.totalAssessments > 0 && (
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 w-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-[#1E1B4B]">Atividades Recentes</h3>
                <History className="text-[#4F46E5] w-6 h-6" />
              </div>
              
              {userStats.recentResults.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {userStats.recentResults.map((result, idx) => {
                    const percentage = result.max_possible_score > 0 
                      ? Math.round((result.total_score / result.max_possible_score) * 100)
                      : 0;
                    const date = new Date(result.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    const time = new Date(result.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    
                    // Get activity configuration based on type (defaults to assessment)
                    const activityType = result.activity_type || 'assessment';
                    const config = getActivityConfig(activityType);
                    const activityName = formatActivityName(result);

                    return (
                      <div 
                        key={idx}
                        className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 border border-transparent hover:border-[#4F46E5]/20 transition-colors cursor-pointer"
                        onClick={() => navigate(`/results/${result.id || result.assessment_id}?from=history`)}
                      >
                        <div 
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold`}
                          style={{ backgroundColor: config.bgColor }}
                        >
                          {percentage}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-[#1E1B4B]">{activityName}</p>
                          <p className="text-xs text-gray-500">{date} • {time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">Nenhuma atividade recente</p>
                  <p className="text-xs mt-1">Comece seu primeiro assessment!</p>
                </div>
              )}
              
              <button 
                onClick={() => navigate('/history')}
                className="w-full mt-6 py-2 text-[#4F46E5] font-bold text-sm border-t border-gray-100 pt-4 hover:text-[#4F46E5]/70"
              >
                Ver Tudo
              </button>
            </div>
            )}

            {/* RECOMENDA\u00c7\u00d5ES */}
            {userStats.totalAssessments > 0 && (
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 w-full">
              <h3 className="text-lg font-bold text-[#1E1B4B] mb-4">Próximos Passos</h3>
              {/* Card de próximos passos como link para conteúdo */}
              {(() => {
                // Seleciona o indicador com menor percentage
                const indicator = developmentIndicators.length > 0
                  ? developmentIndicators.reduce((min, ind) => ind.percentage < min.percentage ? ind : min, developmentIndicators[0])
                  : null;
                const indicatorName = indicator ? indicator.name : 'Liderança';
                const link = indicatorLinks[indicatorName] || null;
                // Imagem de capa do podcast para Liderança
                const coverImages = {
                  'Liderança': 'https://image-cdn-ak.spotifycdn.com/image/ab6772ab000015bef26f30d81cec7cbb9ccea5cc'
                  // Adicione outras imagens de capa conforme necessário
                };
                const cover = indicatorName && coverImages[indicatorName] ? coverImages[indicatorName] : null;
                                // Duração dos episódios em minutos
                                const episodeDurations = {
                                  'Liderança': 47,
                                  'Networking': 51
                                  // Adicione outras durações conforme necessário
                                };
                                const duration = indicatorName && episodeDurations[indicatorName] ? episodeDurations[indicatorName] : 15;
                return (
                  <a
                    href={link || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block cursor-pointer"
                  >
                    {cover ? (
                      <img
                        src={cover}
                        alt={`Capa do podcast sobre ${indicatorName}`}
                        className="w-full aspect-video object-cover rounded-lg mb-4"
                      />
                    ) : (
                      <div className="w-full aspect-video bg-gradient-to-br from-[#4F46E5] to-[#818CF8] rounded-lg mb-4 flex items-center justify-center text-white/20">
                        <Sparkles size={64} />
                      </div>
                    )}
                    <h4 className="font-bold text-[#1E1B4B] group-hover:text-[#4F46E5] transition-colors">
                      Aprenda sobre {indicatorName}
                    </h4>
                    <p className="text-sm text-gray-500 mt-1 mb-3">
                      Escute o podcast sobre {indicatorName} e aumente sua compreensão sobre o tema. Após isso você poderá testar seu conhecimento com uma atividade.
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#4F46E5] px-2 py-1 bg-[#4F46E5]/10 rounded">
                        ~{duration} min
                      </span>
                    </div>
                  </a>
                );
              })()}
            </div>
            )}
          </div>
          )}
        </div>
      </main>

      {/* MODAL DE CONQUISTAS */}
      {showAchievementsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#1E1B4B]">Suas Conquistas</h2>
              <button
                onClick={() => setShowAchievementsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>
            <p className="text-gray-600 text-center py-8">
              Conteúdo das conquistas em desenvolvimento...
            </p>
          </div>
        </div>
      )}

      {/* RANKING MODAL - Side Sheet (Desktop) / Bottom Sheet (Mobile) */}
      {showRankingModal && (
        <>
          {/* Backdrop - Fica entre a página e o sheet */}
          <div 
            className="fixed inset-0 bg-black/40 z-[59] transition-opacity"
            onClick={() => setShowRankingModal(false)}
          />

          {/* Sheet Container - Fica acima do backdrop */}
          <div className="fixed inset-0 z-[60] pointer-events-none">
            {/* Desktop - Side Sheet (Direita) */}
            <div className="hidden md:flex md:fixed md:right-0 md:top-0 md:h-screen md:w-96 md:pointer-events-auto md:flex-col md:bg-white md:shadow-2xl md:animate-in md:slide-in-from-right">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-2xl font-bold text-[#1E1B4B]">🏆 Ranking</h2>
                <button
                  onClick={() => setShowRankingModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors text-xl"
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                {topUsers && topUsers.length > 0 ? (
                  <div className="p-6 space-y-6">
                    {/* TOP 3 - Destacado */}
                    <div>
                      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Pódio</h3>
                      <div className="space-y-3">
                        {topUsers.slice(0, 3).map((user, index) => {
                          const medals = ['🥇', '🥈', '🥉'];
                          return (
                            <div
                              key={user.user_id || index}
                              className="p-4 rounded-lg bg-gradient-to-r from-[#4F46E5]/5 to-transparent border border-[#4F46E5]/20"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-3xl">{medals[index]}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-[#1E1B4B] truncate">{getDisplayUserName(user)}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Lv. {user.level} • {user.total_xp?.toLocaleString('pt-BR')} XP
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* RESTANTE - 4 a 30 */}
                    {topUsers.length > 3 && (
                      <div>
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Ranking</h3>
                        <div className="space-y-2">
                          {topUsers.slice(3).map((user, index) => (
                            <div
                              key={user.user_id || index}
                              className="flex items-center gap-3 p-3 rounded-lg text-sm transition-colors hover:bg-gray-50 border border-transparent"
                            >
                              <span className="font-bold text-gray-400 w-6">{index + 4}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-[#1E1B4B] truncate">{getDisplayUserName(user)}</p>
                                <p className="text-xs text-gray-500">{user.total_xp?.toLocaleString('pt-BR')} XP</p>
                              </div>
                              <span className="text-xs font-bold text-[#4F46E5] flex-shrink-0">Lv. {user.level}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <Trophy size={48} className="mb-3" />
                    <p className="text-sm">Nenhum dado disponível</p>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile - Bottom Sheet */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 max-h-[90vh] w-full pointer-events-auto bg-white rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-2xl font-bold text-[#1E1B4B]">🏆 Ranking</h2>
                <button
                  onClick={() => setShowRankingModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors text-xl"
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
                {topUsers && topUsers.length > 0 ? (
                  <div className="p-6 space-y-6">
                    {/* TOP 3 - Destacado */}
                    <div>
                      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Pódio</h3>
                      <div className="space-y-3">
                        {topUsers.slice(0, 3).map((user, index) => {
                          const medals = ['🥇', '🥈', '🥉'];
                          return (
                            <div
                              key={user.user_id || index}
                              className="p-4 rounded-lg bg-gradient-to-r from-[#4F46E5]/5 to-transparent border border-[#4F46E5]/20"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-3xl">{medals[index]}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-[#1E1B4B] truncate">{getDisplayUserName(user)}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Lv. {user.level} • {user.total_xp?.toLocaleString('pt-BR')} XP
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* RESTANTE - 4 a 30 */}
                    {topUsers.length > 3 && (
                      <div>
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Ranking</h3>
                        <div className="space-y-2">
                          {topUsers.slice(3).map((user, index) => (
                            <div
                              key={user.user_id || index}
                              className="flex items-center gap-3 p-3 rounded-lg text-sm transition-colors hover:bg-gray-50 border border-transparent"
                            >
                              <span className="font-bold text-gray-400 w-6">{index + 4}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-[#1E1B4B] truncate">{getDisplayUserName(user)}</p>
                                <p className="text-xs text-gray-500">{user.total_xp?.toLocaleString('pt-BR')} XP</p>
                              </div>
                              <span className="text-xs font-bold text-[#4F46E5] flex-shrink-0">Lv. {user.level}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <Trophy size={48} className="mb-3" />
                    <p className="text-sm">Nenhum dado disponível</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* FOOTER */}
      <footer className="mt-16 border-t border-[#E2E8F0] py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#475569]">
          <a 
            href="https://www.linkedin.com/in/cadubandeira/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-[#4F46E5] transition-colors"
          >
            © {new Date().getFullYear()} In Assessments · BNDR Design LTDA
          </a>
          <div className="flex items-center gap-4">
            <Link to="/privacy-policy" className="hover:text-[#4F46E5] transition-colors">
              Política de Privacidade
            </Link>
            <span>·</span>
            <Link to="/terms-of-service" className="hover:text-[#4F46E5] transition-colors">
              Termos de Serviço
            </Link>
          </div>
        </div>
      </footer>

      {/* MODAL DE INDICADOR */}
      {selectedIndicator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedIndicator(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#1E1B4B]">{selectedIndicator.name}</h2>
              <button
                onClick={() => setSelectedIndicator(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Indicador com Ícone */}
            <div className="flex flex-col items-center mb-8">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center mb-4 shadow-lg"
                style={{ backgroundColor: selectedIndicator.color }}
              >
                {(() => {
                  const Icon = getLucideIcon(selectedIndicator.icon);
                  return Icon ? (
                    <Icon className="w-12 h-12 text-white" />
                  ) : (
                    <Circle className="w-12 h-12 text-white" />
                  );
                })()}
              </div>
              <p className="text-md text-gray-600 mb-4">Desempenho: {selectedIndicator.percentage}%</p>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-3 rounded-full transition-all duration-700"
                  style={{
                    width: `${selectedIndicator.percentage}%`,
                    backgroundColor: selectedIndicator.color
                  }}
                />
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-4">
              <div>
                <h3 className="text-md font-bold text-[#1E1B4B] mb-2">Sobre este indicador</h3>
                <p className="text-md text-gray-800 leading-relaxed">
                  {selectedIndicator.description || 'Indicador de desenvolvimento profissional.'}
                </p>
              </div>

            </div>

            {/* Button */}
            <button
              onClick={() => setSelectedIndicator(null)}
              className="w-full mt-6 px-4 py-2 bg-[#4F46E5] text-white font-bold rounded-lg hover:bg-[#4F46E5]/90 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
