import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, PlayCircle, Loader2 } from 'lucide-react';
import { TOKENS } from '../config/tokens';
import { supabase } from '../supabaseClient';
import { useScenarioSession } from '../hooks/useScenarioSession';
import DecisionNode from '../components/DecisionNode';
import ConsequenceScreen from '../components/ConsequenceScreen';
import ScenarioResults from '../components/ScenarioResults';
import XPRewardWidget from '../components/XPRewardWidget';
import RealScenariosSkeleton from '../components/skeletons/RealScenariosSkeleton';

const RealScenarios = () => {
  const navigate = useNavigate();
  const { scenarioId } = useParams();

  // State management
  const [phase, setPhase] = useState('list'); // 'list' | 'intro' | 'running' | 'results'
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [loadingScenarios, setLoadingScenarios] = useState(true);
  const [showConsequence, setShowConsequence] = useState(false);
  const [consequenceData, setConsequenceData] = useState(null);
  const [completionData, setCompletionData] = useState(null);
  const [userTotalXP, setUserTotalXP] = useState(0);

  // Hook de sessão (só ativa quando scenarioId está presente)
  const {
    loading: sessionLoading,
    error: sessionError,
    scenario,
    currentNode,
    decisions,
    makeDecision,
    completeSession,
    abandonSession,
    isComplete
  } = useScenarioSession({ 
    scenarioId: phase === 'running' ? selectedScenario?.id : null 
  });

  // Load available scenarios
  useEffect(() => {
    const loadScenarios = async () => {
      try {
        setLoadingScenarios(true);
        const { data, error } = await supabase
          .from('scenario_simulations')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setScenarios(data || []);
      } catch (err) {
        console.error('Error loading scenarios:', err);
      } finally {
        setLoadingScenarios(false);
      }
    };

    // Also load user's current total XP from user_progression
    const loadUserXP = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: progression } = await supabase
            .from('user_progression')
            .select('total_xp')
            .eq('user_id', user.id)
            .single();
          
          if (progression) {
            setUserTotalXP(progression.total_xp || 0);
          }
        }
      } catch (err) {
        console.error('Error loading user XP:', err);
      }
    };

    loadScenarios();
    loadUserXP();
  }, []);

  // Auto-complete when reaching final node
  useEffect(() => {
    const finishScenario = async () => {
      if (currentNode?.node_type === 'final' && phase === 'running' && !completionData) {
        console.log('Final node reached, completing session...');
        const results = await completeSession();
        if (results) {
          setCompletionData(results);
          setPhase('results');
        } else {
          console.error('Failed to complete session');
        }
      }
    };

    finishScenario();
  }, [currentNode, phase, completeSession, completionData]);

  // Handle scenario selection from URL
  useEffect(() => {
    if (scenarioId && scenarios.length > 0) {
      const found = scenarios.find(s => s.id === scenarioId);
      if (found) {
        setSelectedScenario(found);
        setPhase('intro');
      }
    }
  }, [scenarioId, scenarios]);

  const handleStartScenario = (scenarioData) => {
    setSelectedScenario(scenarioData);
    setPhase('intro');
    navigate(`/activities/real-scenarios/${scenarioData.id}`);
  };

  const handleBeginSession = () => {
    setPhase('running');
  };

  const handleDecision = async (optionIndex, metadata) => {
    const success = await makeDecision(optionIndex, metadata);
    
    if (success) {
      // Show consequence screen if available
      if (currentNode?.decision_options?.[optionIndex]?.consequence_text) {
        setConsequenceData({
          content: currentNode.decision_options[optionIndex].consequence_text,
          pressureIndicators: currentNode.decision_options[optionIndex].pressure_changes || []
        });
        setShowConsequence(true);
      }
      // If next node is final, it will be detected by useEffect
    }
  };

  const handleContinueAfterConsequence = () => {
    setShowConsequence(false);
    setConsequenceData(null);
  };

  const handleBackToList = async () => {
    if (phase === 'running') {
      await abandonSession();
    }
    setPhase('list');
    setSelectedScenario(null);
    setCompletionData(null);
    navigate('/activities/real-scenarios');
  };

  const handleBackToActivities = () => {
    navigate('/activities');
  };

  // Render: Consequence screen
  if (showConsequence && consequenceData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF] pt-[72px] pb-16 px-4 sm:px-6">
        <main className="max-w-4xl mx-auto pt-8">
          <ConsequenceScreen
            content={consequenceData.content}
            pressureIndicators={consequenceData.pressureIndicators}
            onContinue={handleContinueAfterConsequence}
          />
        </main>
      </div>
    );
  }

  // Render: Results screen
  if (phase === 'results' && completionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF] pt-[72px] pb-16 px-4 sm:px-6">
        <main className="max-w-5xl mx-auto pt-8">
          <ScenarioResults
            analysis={completionData.analysis}
            sessionMetadata={{
              totalTime: completionData.totalTime,
              decisionsCount: completionData.decisionsCount,
              avgDecisionTime: completionData.totalTime / (completionData.decisionsCount || 1)
            }}
            totalXP={userTotalXP}
            onClose={handleBackToActivities}
          />
        </main>
      </div>
    );
  }

  // Render: Running scenario
  if (phase === 'running' && scenario && currentNode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF] pt-[72px] pb-16 px-4 sm:px-6">
        <main className="max-w-4xl mx-auto pt-8">
          <button
            type="button"
            onClick={handleBackToList}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#4F46E5] mb-6 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Abandonar cenário
          </button>

          {sessionLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-[#4F46E5] animate-spin" />
            </div>
          ) : currentNode.node_type === 'decision' ? (
            <DecisionNode
              node={currentNode}
              onDecision={handleDecision}
            />
          ) : currentNode.node_type === 'final' ? (
            <div className="text-center py-12">
              <p className="text-xl text-gray-800 mb-6">Finalizando análise...</p>
              <Loader2 className="w-8 h-8 text-[#4F46E5] animate-spin mx-auto" />
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center">
              <p className="text-gray-600">Tipo de nó não reconhecido: {currentNode.node_type}</p>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Render: Intro screen
  if (phase === 'intro' && selectedScenario) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF] overflow-x-hidden">
        <section className="bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] pt-[72px] pb-24 px-4 sm:px-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
            <div className="absolute top-16 -left-10 w-48 h-48 md:w-64 md:h-64 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 -right-20 w-64 h-64 md:w-96 md:h-96 bg-[#312E81] rounded-full blur-3xl"></div>
          </div>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-16 relative z-10 w-full text-left">
            <button
              type="button"
              onClick={handleBackToList}
              className="inline-flex items-center gap-2 text-sm font-semibold text-white/90 mb-6 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
              Simulação Adaptativa
            </p>
            <h2 className={`${TOKENS.fonts.serif} text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mt-2 mb-4 leading-tight`}>
              {selectedScenario.title}
            </h2>
            <p className="text-white/90 text-base sm:text-lg max-w-3xl">
              {selectedScenario.description}
            </p>
          </div>
        </section>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 -mt-16 relative z-20 w-full pb-16">
          <div className="bg-white/90 backdrop-blur-sm border border-white/60 rounded-2xl p-6 sm:p-10 shadow-lg space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4F46E5] mb-2">Contexto Inicial</p>
              <div 
                className="text-sm sm:text-base text-gray-700 leading-relaxed prose max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedScenario.initial_context }}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4">
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Duração estimada</p>
                <p className="text-lg font-bold text-gray-800">{selectedScenario.estimated_duration_minutes} min</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Dificuldade</p>
                <p className="text-lg font-bold text-gray-800 capitalize">{selectedScenario.difficulty_level}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Indicadores</p>
                <p className="text-lg font-bold text-gray-800">{selectedScenario.target_indicators?.length || 0}</p>
              </div>
            </div>

            <XPRewardWidget 
              difficulty={selectedScenario.difficulty_level}
            />

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={handleBeginSession}
                className="group inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white rounded-xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 shadow-xl"
              >
                <PlayCircle className="w-6 h-6" />
                Iniciar Simulação
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Render: List of scenarios (default)
  if (loadingScenarios) {
    return <RealScenariosSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF] overflow-x-hidden">
      <section className="bg-gradient-to-r from-red-600 to-orange-500 pt-[72px] pb-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
          <div className="absolute top-16 -left-10 w-48 h-48 md:w-64 md:h-64 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 -right-20 w-64 h-64 md:w-96 md:h-96 bg-[#312E81] rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-16 relative z-10 w-full text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
            Situações Reais
          </p>
          <h2 className={`${TOKENS.fonts.serif} text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mt-2 mb-4 leading-tight`}>
            Suas ações à prova <br/> em ambiente seguro.
          </h2>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 -mt-16 relative z-20 w-full pb-16">
        {scenarios.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-sm border border-white/60 rounded-2xl p-8 shadow-lg text-center">
            <p className="text-gray-600 mb-4">Nenhum cenário disponível no momento.</p>
            <p className="text-sm text-gray-500">
              Os cenários estão sendo preparados. Volte em breve!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white backdrop-blur-sm border border-white/80 rounded-3xl p-8 sm:p-10 shadow-lg overflow-hidden relative">
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#4F46E5]/5 rounded-full blur-3xl -z-10"></div>
              
              <div className="mb-8">
                <h3 className={`${TOKENS.fonts.serif} text-2xl sm:text-3xl text-[#1E1B4B] mb-3`}>
                  Como funciona?
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  A vida real não tem respostas prontas. Você enfrenta ambiguidade, pressão e consequências. Por isso, nossas simulações <span className="font-semibold text-[#4F46E5]">evoluem com suas decisões</span>, revelando como você realmente pensa e age sob pressão.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="bg-white/60 rounded-2xl p-5 border border-[#4F46E5]/10 hover:border-[#4F46E5]/30 transition-all">
                  <div className="text-3xl mb-3">🧠</div>
                  <p className="font-bold text-[#1E1B4B] mb-2">Avalia seu processo real</p>
                  <p className="text-sm text-gray-700">Não julgamos suas respostas, analisamos como você pensa e decide em tempo real.</p>
                </div>
                <div className="bg-white/60 rounded-2xl p-5 border border-[#4F46E5]/10 hover:border-[#4F46E5]/30 transition-all">
                  <div className="text-3xl mb-3">🔄</div>
                  <p className="font-bold text-[#1E1B4B] mb-2">Ambiente dinâmico e realista</p>
                  <p className="text-sm text-gray-700">Cada ação muda o contexto, criando a pressão e ambiguidade que você encontra todos os dias.</p>
                </div>
                 <div className="bg-white/60 rounded-2xl p-5 border border-[#4F46E5]/10 hover:border-[#4F46E5]/30 transition-all">
                  <div className="text-3xl mb-3">🏆</div>
                  <p className="font-bold text-[#1E1B4B] mb-2">Embasamento digno de nobel</p>
                  <p className="text-sm text-gray-700">Inspirado na obra de D. Kahneman, Prêmio Nobel de Economia. Uma abordagem científica para entender como as pessoas realmente tomam decisões.</p>
                </div>
                <div className="bg-white/60 rounded-2xl p-5 border border-[#4F46E5]/10 hover:border-[#4F46E5]/30 transition-all">
                  <div className="text-3xl mb-3">📊</div>
                  <p className="font-bold text-[#1E1B4B] mb-2">Descubra seus padrões</p>
                  <p className="text-sm text-gray-700">Identifique seus vieses, heurísticas e seu estilo único para tomada de decisão.</p>
                </div>
               
              </div>
            </div>

            <div className="mt-10">
              <h3 className={`${TOKENS.fonts.serif} text-2xl text-[#1E1B4B] mb-4`}>
                Cenários disponíveis
              </h3>
              <div className="grid gap-4 sm:gap-6">
                {scenarios.map((scenario) => (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => handleStartScenario(scenario)}
                    className="group bg-white border border-gray-200 rounded-2xl p-6 text-left hover:border-[#4F46E5]/40 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-grow">
                        <h4 className={`${TOKENS.fonts.serif} text-xl text-[#1E1B4B] mb-2`}>
                          {scenario.title}
                        </h4>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {scenario.description}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-[#4F46E5]/10 flex items-center justify-center group-hover:bg-[#4F46E5] group-hover:text-white transition-colors">
                          <PlayCircle className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 items-center">
                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-700">
                        {scenario.estimated_duration_minutes} min
                      </span>
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        scenario.difficulty_level === 'easy' 
                          ? 'bg-green-100 text-green-700'
                          : scenario.difficulty_level === 'hard'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {scenario.difficulty_level === 'easy' ? 'Fácil' : 
                         scenario.difficulty_level === 'hard' ? 'Difícil' : 'Médio'}
                      </span>
                      {scenario.target_indicators && scenario.target_indicators.length > 0 && (
                        <span className="text-xs text-gray-500">
                          {scenario.target_indicators.length} indicador{scenario.target_indicators.length > 1 ? 'es' : ''}
                        </span>
                      )}
                      <span className="ml-auto inline-flex items-center gap-2 text-sm font-semibold text-[#4F46E5] group-hover:translate-x-1 transition-transform">
                        Iniciar <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default RealScenarios;
