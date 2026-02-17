import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  BrainCircuit, 
  History, 
  Trophy,
  Target,
  Sparkles
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { TOKENS } from '../config/tokens';
import { useUserRole } from '../hooks/useUserRole';
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

const Dashboard = ({ user }) => {
  const navigate = useNavigate();
  const { role } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [animateXPBar, setAnimateXPBar] = useState(false);
  const [animateLevel, setAnimateLevel] = useState(false);
  const [previousStats, setPreviousStats] = useState(null);
  const [animationTrigger, setAnimationTrigger] = useState(0);
  const [userStats, setUserStats] = useState({
    totalAssessments: 0,
    lastScore: 0,
    averageScore: 0,
    recentResults: [],
    level: 1,
    totalXP: 0,
    levelProgress: null
  });
  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.display_name || 
    user?.user_metadata?.full_name || 
    user?.email?.split('@')[0] || 
    'Usuário'
  );

  useEffect(() => {
    // Atualiza nome base do metadata ao mudar usuário
    setDisplayName(
      user?.user_metadata?.display_name || 
      user?.user_metadata?.full_name || 
      user?.email?.split('@')[0] || 
      'Usuário'
    );
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

    // Tentar buscar display_name da tabela profiles de forma segura
    supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.display_name) {
          setDisplayName(data.display_name);
        }
      })
      .catch(() => {}); // Ignora erro se tabela não existir

    try {
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
        .select('total_score, max_possible_score, executed_at, indicator_scores_snapshot, activity_type, activity_name')
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#4F46E5]/20 border-t-[#4F46E5] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF] overflow-x-hidden">
      
      {/* HERO SECTION */}
      <section className="bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] pt-8 pb-32 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
          <div className="absolute top-20 -left-10 w-48 h-48 md:w-64 md:h-64 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 -right-20 w-64 h-64 md:w-96 md:h-96 bg-[#312E81] rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 w-full">
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
          
          {/* COLUNA ESQUERDA */}
          <div className="lg:col-span-8 flex flex-col gap-4 sm:gap-6 lg:gap-8 w-full">
            
            {/* CARD DE PERFORMANCE */}
            <div className="bg-white/80 backdrop-blur-sm border border-white/50 p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl shadow-xl w-full">
              <div className="flex flex-col md:flex-row items-center gap-4 sm:gap-6 md:gap-8 relative w-full">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Trophy size={120} />
                </div>
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
                  <p className="text-gray-600 text-xs mt-3 font-medium">
                    {formatXP(userStats.totalXP)}
                  </p>
                </div>
                <div className="w-full md:w-2/3 flex flex-col gap-4">
                  {userStats.levelProgress && (
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600 font-medium">Progresso para Nível {userStats.level + 1}</span>
                        <span className="text-gray-500">{userStats.levelProgress.currentLevelXP} / {userStats.levelProgress.nextLevelXP}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden shadow-md">
                        <div 
                          className="bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] h-2.5 rounded-full transition-all duration-[2000ms] ease-out"
                          style={{ 
                            width: animateXPBar ? `${userStats.levelProgress.progressPercentage}%` : `${userStats.levelProgress.progressPercentage}%`,
                            boxShadow: animateXPBar ? '0 0 15px rgba(79, 70, 229, 0.6)' : 'none'
                          }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between items-end">
                    <div className="text-left">
                      <p className="text-gray-600 text-sm font-medium">
                        Assessments Realizados: <span className="text-[#1E1B4B] font-bold">{userStats.totalAssessments}</span>
                      </p>
                      <p className="text-gray-500 text-xs">
                        Média: {userStats.averageScore}%
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-2">
                    <button
                      onClick={() => navigate('/history')}
                      className="bg-white text-[#4F46E5] border border-[#4F46E5] px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-[#4F46E5] hover:text-white transition-all"
                    >
                      Ver Histórico
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* BANNER CTA ASSESSMENT */}
            <div className="bg-gradient-to-r from-[#4F46E5] to-[#6366F1] rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl flex flex-col md:flex-row items-center justify-between text-white gap-4 sm:gap-6 w-full">
              <div className="flex items-center gap-3 sm:gap-4 md:gap-6 w-full md:w-auto">
                <div className="bg-white/20 p-3 sm:p-4 rounded-lg flex-shrink-0">
                  <BrainCircuit size={32} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-lg sm:text-xl font-bold">Pronto para uma novo desafio?</h4>
                  <p className="text-white/80 text-sm">
                    Mapeie seu crescimento em competências e desbloqueie novos insights.
                  </p>
                </div>
              </div>
              <button
                onClick={handleStart}
                className="bg-white text-[#4F46E5] px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg font-bold text-xs sm:text-sm uppercase tracking-wider hover:scale-105 transition-transform whitespace-nowrap w-full md:w-auto"
              >
                Vamos lá!
              </button>
            </div>

            {/* GR\u00c1FICO PLACEHOLDER */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm w-full">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-2xl font-bold text-[#1E1B4B]">Evolução de Competências</h3>
              </div>
              <div className="h-80 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <Target size={64} className="mx-auto mb-4 opacity-20" />
                  <p className="font-medium italic">Gráficos de evolução em breve</p>
                </div>
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA */}
          <div className="lg:col-span-4 flex flex-col gap-4 sm:gap-6 lg:gap-8 w-full">
            
            {/* ATIVIDADES RECENTES */}
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
                    const date = new Date(result.executed_at).toLocaleDateString('pt-BR', { 
                      day: '2-digit', 
                      month: 'short' 
                    });
                    
                    // Get activity configuration based on type (defaults to assessment)
                    const activityType = result.activity_type || 'assessment';
                    const config = getActivityConfig(activityType);
                    const activityName = formatActivityName(result);

                    return (
                      <div 
                        key={idx}
                        className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 border border-transparent hover:border-[#4F46E5]/20 transition-colors"
                      >
                        <div 
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold`}
                          style={{ backgroundColor: config.bgColor }}
                        >
                          {percentage}%
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-[#1E1B4B]">{activityName}</p>
                          <p className="text-xs text-gray-500">{date}</p>
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

            {/* RECOMENDA\u00c7\u00d5ES */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 w-full">
              <h3 className="text-lg font-bold text-[#1E1B4B] mb-4">Próximos Passos</h3>
              <div className="group cursor-pointer" onClick={handleStart}>
                <div className="w-full aspect-video bg-gradient-to-br from-[#4F46E5] to-[#818CF8] rounded-lg mb-4 flex items-center justify-center text-white/20">
                  <Sparkles size={64} />
                </div>
                <h4 className="font-bold text-[#1E1B4B] group-hover:text-[#4F46E5] transition-colors">
                  Aprenda sobre %Indicador%
                </h4>
                <p className="text-sm text-gray-500 mt-1 mb-3">
                  Escute o podcast sobre %indicador% e aumente sua compreensão sobre o tema. Após isso você poderá testar seu conhecimento com uma atividade..
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#4F46E5] px-2 py-1 bg-[#4F46E5]/10 rounded">
                    ~15 min
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
