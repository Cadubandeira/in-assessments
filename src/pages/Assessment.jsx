import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAssessment } from '../hooks/useAssessment';
import { useXPRewards } from '../hooks/useXPRewards';
import { TOKENS } from '../config/tokens';
import { ArrowRight, CheckCircle, Zap, Info } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { getLucideIcon } from '../utils/iconUtils';
import XPRewardsCard from '../components/XP/XPRewardsCard';
import AssessmentSkeleton from '../components/skeletons/AssessmentSkeleton';

const Assessment = () => {
  const { id } = useParams();
  const { 
    assessment, 
    loading, 
    error, 
    answers, 
    handleAnswerChange, 
    submitAssessment, 
    submitting,
    introductionHtml,
    preAssessmentFields,
    preAssessmentAnswers,
    setPreAssessmentAnswers,
    gamifyXp,
    xpCompletion,
    xpScore80,
    xpScore90,
    xpScore100
  } = useAssessment({ assessmentIdOrSlug: id });

  // XP Hooks - will be overridden by assessment-specific config if gamifyXp is true
  let { baseXP, bonusThresholds, rewards } = useXPRewards('assessment');

  // Override with assessment-specific XP config if gamification is enabled
  if (gamifyXp && xpCompletion > 0) {
    const customRewards = [
      {
        label: 'Completar o assessment',
        xp: xpCompletion,
        dotColor: 'rgb(129, 140, 248)',
        className: 'bg-white/60 backdrop-blur-sm',
        textClassName: 'text-gray-600 flex-1',
        valueClassName: 'font-bold text-indigo-700'
      },
      {
        label: 'Resultado de 80 a 89%',
        xp: xpScore80,
        dotColor: 'rgb(168, 85, 247)',
        className: 'bg-white/40',
        textClassName: 'text-gray-600 flex-1',
        valueClassName: 'font-semibold text-purple-600'
      },
      {
        label: 'Resultado de 90 a 99%',
        xp: xpScore90,
        dotColor: 'rgb(168, 85, 247)',
        className: 'bg-white/40',
        textClassName: 'text-gray-600 flex-1',
        valueClassName: 'font-semibold text-purple-600'
      },
      {
        label: 'Resultado de 100% 🎯',
        xp: xpScore100,
        dotColor: 'rgb(168, 85, 247)',
        className: 'bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-300/50',
        textClassName: 'text-gray-700 font-medium flex-1',
        valueClassName: 'font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600'
      }
    ];
    baseXP = xpCompletion;
    bonusThresholds = {
      80: xpScore80,
      90: xpScore90,
      100: xpScore100
    };
    rewards = customRewards;
  }

  // Phase state machine: 'intro' | 'pre-assessment' | 'indicator-intro' | 'question'
  const [phase, setPhase] = useState('intro');
  const [currentIndicatorIndex, setCurrentIndicatorIndex] = useState(0);
  const [currentQuestionIndexInIndicator, setCurrentQuestionIndexInIndicator] = useState(0);
  const [indicatorsMeta, setIndicatorsMeta] = useState({});
  const nextButtonRef = useRef(null);

  console.log('Assessment Page Debug:', { loading, error, assessment });

  // Scroll to top when phase or question changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [phase, currentIndicatorIndex, currentQuestionIndexInIndicator]);

  // Wrapper function to handle answer change and scroll to next button
  const handleAnswerChangeWithScroll = (questionId, value) => {
    handleAnswerChange(questionId, value);
    // Small delay to allow the UI to update before scrolling
    setTimeout(() => {
      if (nextButtonRef.current) {
        nextButtonRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // Defesas contra formatos inesperados vindos do backend
  const indicators = Array.isArray(assessment?.indicators) ? assessment.indicators : [];
  const levels = Array.isArray(assessment?.levels) ? assessment.levels : [];
  const isNiveisSchema = assessment?.schema === 'niveis';

  // Usar níveis ou indicadores dependendo do schema
  const items = isNiveisSchema ? levels : indicators;
  const itemType = isNiveisSchema ? 'level' : 'indicator';

  // Fetch indicator metadata (color, icon) from indicators_master
  useEffect(() => {
    if (isNiveisSchema || !indicators.length) return;
    const fetchMeta = async () => {
      const masterIds = indicators
        .map(ind => ind.indicator_master_id)
        .filter(Boolean);
      if (!masterIds.length) return;

      const { data } = await supabase
        .from('indicators_master')
        .select('id, name, color, icon')
        .in('id', masterIds);

      if (data) {
        const metaMap = {};
        data.forEach(item => {
          metaMap[item.id] = item;
        });
        setIndicatorsMeta(metaMap);
      }
    };
    fetchMeta();
  }, [indicators]);

  if (loading) {
    return <AssessmentSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF]">
        <div className="text-center p-8 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Erro ao carregar</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#4F46E5] text-white rounded-lg font-semibold hover:bg-[#312E81] transition"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF]">
        <div className="text-center">
          <p className="text-gray-500 text-lg mb-4">Não foi possível carregar o assessment.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#4F46E5] text-white rounded-lg font-semibold hover:bg-[#312E81] transition"
          >
            Recarregar Página
          </button>
        </div>
      </div>
    );
  }

  const currentIndicator = indicators[currentIndicatorIndex];
  const currentLevel = levels[currentIndicatorIndex]; // Usar o mesmo índice para níveis
  const currentItem = isNiveisSchema ? currentLevel : currentIndicator;
  const currentQuestions = currentItem?.questions || [];
  const currentQuestion = currentQuestions[currentQuestionIndexInIndicator];
  const indicatorMeta = currentIndicator?.indicator_master_id ? indicatorsMeta[currentIndicator.indicator_master_id] : null;
  const IconComponent = indicatorMeta?.icon ? getLucideIcon(indicatorMeta.icon) : null;

  // Calculate progress
  const totalQuestions = items.reduce((sum, item) => sum + (item.questions?.length || 0), 0);
  let answeredQuestions = 0;
  items.forEach((item, iIdx) => {
    if (iIdx < currentIndicatorIndex) {
      answeredQuestions += item.questions?.length || 0;
    } else if (iIdx === currentIndicatorIndex) {
      answeredQuestions += currentQuestionIndexInIndicator;
    }
  });
  const progressPercentage = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  const handleNext = () => {
    if (phase === 'intro') {
      // Ao clicar em "Começar" na intro, verificar se tem pré-assessment
      if (preAssessmentFields?.length > 0) {
        setPhase('pre-assessment');
      } else {
        setPhase('indicator-intro');
      }
    } else if (phase === 'pre-assessment') {
      // Validar campos obrigatórios do pré-assessment
      const requiredFields = preAssessmentFields.filter(f => f.is_required);
      const missingFields = requiredFields.filter(f => !preAssessmentAnswers[f.id]?.trim());
      
      if (missingFields.length > 0) {
        alert('Por favor, preencha todos os campos obrigatórios antes de continuar.');
        return;
      }
      setPhase('indicator-intro');
    } else if (phase === 'indicator-intro') {
      setPhase('question');
      setCurrentQuestionIndexInIndicator(0);
    } else if (phase === 'question') {
      if (currentQuestionIndexInIndicator < currentQuestions.length - 1) {
        setCurrentQuestionIndexInIndicator(prev => prev + 1);
      } else {
        // Finished all questions for current item (indicator or level)
        if (currentIndicatorIndex < items.length - 1) {
          setCurrentIndicatorIndex(prev => prev + 1);
          setPhase('indicator-intro');
          setCurrentQuestionIndexInIndicator(0);
        } else {
          // Finished entire assessment - submit and redirect to Results
          console.log('🎯 Assessment finalizado! Submetendo...');
          submitAssessment();
        }
      }
    }
  };

  const canProceed = () => {
    if (phase === 'pre-assessment') {
      // Verificar se campos obrigatórios estão preenchidos
      const requiredFields = preAssessmentFields?.filter(f => f.is_required) || [];
      return requiredFields.every(f => preAssessmentAnswers[f.id]?.trim());
    }
    if (phase === 'intro' || phase === 'indicator-intro') return true;
    if (phase === 'question' && currentQuestion) {
      return answers[currentQuestion.id] !== undefined && answers[currentQuestion.id] !== null;
    }
    return false;
  };

  // Função para renderizar campos do pré-assessment
  const renderPreAssessmentField = (field) => {
    const value = preAssessmentAnswers[field.id] || '';
    const handleChange = (newValue) => {
      setPreAssessmentAnswers(prev => ({
        ...prev,
        [field.id]: newValue
      }));
    };

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder || ''}
            required={field.is_required}
            className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-[#4F46E5] focus:outline-none transition-colors"
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder || ''}
            required={field.is_required}
            rows={4}
            className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-[#4F46E5] focus:outline-none transition-colors resize-none"
          />
        );

      case 'dropdown':
        return (
          <select
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            required={field.is_required}
            className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-[#4F46E5] focus:outline-none transition-colors"
          >
            <option value="">Selecione...</option>
            {field.options?.map((option, idx) => (
              <option key={idx} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF] overflow-x-hidden">
      {/* Progress Bar with Counter */}
      {phase !== 'intro' && phase !== 'pre-assessment' && (
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-white/60 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#4F46E5]">
                Progresso
              </span>
              <span className="text-sm font-semibold text-[#1E1B4B]">
                {answeredQuestions} de {totalQuestions} perguntas
              </span>
            </div>
            <div className="relative w-full bg-[#E0E7FF] h-3 rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] transition-all duration-700 ease-out rounded-full shadow-lg" 
                style={{ width: `${progressPercentage}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 sm:pb-16">
        {/* PRÉ-ASSESSMENT PHASE */}
        {phase === 'pre-assessment' && preAssessmentFields?.length > 0 && (
          <div className="max-w-3xl mx-auto pt-8">
            <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-8 shadow-lg">
              <div className="text-center mb-8">
                <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-white bg-gradient-to-r from-[#4F46E5] to-[#6366F1] px-4 py-2 rounded-full mb-4 shadow-md">
                  Antes de Começar
                </span>
                <h2 className={`${TOKENS.fonts.serif} text-3xl font-bold text-[#1E1B4B] mb-3`}>
                  Informações Contextuais
                </h2>
                <p className="text-gray-600">
                  Por favor, preencha as informações abaixo para contextualizar melhor sua avaliação.
                </p>
              </div>
              
              <div className="space-y-6 mb-8">
                {preAssessmentFields.map((field) => (
                  <div key={field.id}>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {field.label}
                      {field.is_required ? (
                        <span className="text-red-500 ml-1">*</span>
                      ) : (
                        <span className="text-gray-500 ml-1">(opcional)</span>
                      )}
                    </label>
                    {renderPreAssessmentField(field)}
                  </div>
                ))}
              </div>

              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className={`w-full px-6 py-4 rounded-lg font-semibold text-lg transition-all shadow-md ${
                  canProceed()
                    ? 'bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white hover:shadow-xl'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Continuar para o Assessment
              </button>
            </div>
          </div>
        )}

        {/* INTRO PHASE */}
        {phase === 'intro' && (
          <div className="space-y-10 pt-8">
            <div className="text-center mb-12">
              <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-white bg-gradient-to-r from-[#4F46E5] to-[#6366F1] px-4 py-2 rounded-full mb-6 shadow-md">
                Assessment
              </span>
              <h2 className={`${TOKENS.fonts.serif} font-serif text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#1E1B4B] mb-4 leading-tight`}>
                {assessment.name}
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                {assessment.description}
              </p>
            </div>

            {/* Grid Layout: Introdução à esquerda, Indicadores e Perguntas à direita */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Card de Introdução */}
              <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 sm:p-8 shadow-sm h-fit">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-[#6366F1]/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-[#6366F1] italic">i</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4F46E5] mb-1">Introdução</p>
                    <p className="text-sm text-gray-600">Se prepare para o assessment</p>
                  </div>
                </div>
                {introductionHtml ? (
                  <div 
                    className="prose prose-sm max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: introductionHtml }}
                  />
                ) : (
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Este assessment avaliará suas competências através de perguntas organizadas por indicadores. Responda com honestidade para obter um resultado mais preciso.
                  </p>
                )}
              </div>

              {/* Coluna direita: Indicadores e Perguntas */}
              <div className="space-y-6">
                {/* Card de Indicadores / Níveis */}
                <div className="bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-sm border border-white/60 rounded-2xl p-6 sm:p-8 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#4F46E5]/10 flex items-center justify-center">
                      <span className="text-2xl font-bold text-[#4F46E5]">{items.length}</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4F46E5] mb-1">
                        {isNiveisSchema ? 'Níveis' : 'Indicadores'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {isNiveisSchema ? 'Níveis de conquista' : 'Avaliados ao longo do assessment'}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Card de Perguntas */}
                <div className="bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-sm border border-white/60 rounded-2xl p-6 sm:p-8 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#6366F1]/10 flex items-center justify-center">
                      <span className="text-2xl font-bold text-[#6366F1]">{totalQuestions}</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4F46E5] mb-1">Perguntas</p>
                      <p className="text-sm text-gray-600">Tempo estimado: {Math.ceil(totalQuestions * 1.2)} min</p>
                    </div>
                  </div>
                </div>

                {/* Card de Recompensas XP */}
                {gamifyXp && (
                  <XPRewardsCard 
                    baseXP={baseXP}
                    bonusThresholds={bonusThresholds}
                    title="Ganhe XP"
                    subtitle="Complete e suba de nível"
                    rewardsList={rewards}
                  />
                )}
              </div>
            </div>


            <div className="flex justify-center pt-4">
              <button
                onClick={handleNext}
                className="group inline-flex items-center gap-3 px-12 py-4 bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white rounded-xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 shadow-xl"
              >
                Começar <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* INDICATOR INTRO PHASE */}
        {phase === 'indicator-intro' && currentItem && (
          <div className="space-y-10 pt-8">
            <div className="text-center">
              <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-[#4F46E5] bg-[#4F46E5]/10 px-4 py-2 rounded-full">
                {isNiveisSchema ? 'Nível' : 'Indicador'} {currentIndicatorIndex + 1} de {items.length}
              </span>
            </div>

            <div className="relative bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-md border border-white/60 rounded-3xl p-4 sm:p-12 shadow-sm overflow-hidden">
              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
                  {!isNiveisSchema && IconComponent && indicatorMeta?.color && (
                    <div 
                      className="w-20 h-20 rounded-full flex items-center justify-center shadow-xl"
                      style={{ backgroundColor: indicatorMeta.color }}
                    >
                      <IconComponent className="w-10 h-10 text-white" strokeWidth={2} />
                    </div>
                  )}
                  <div className="text-center sm:text-left">
                    <h2 className={`${TOKENS.fonts.serif} text-2xl sm:text-4xl text-[#1E1B4B] leading-snug sm:leading-tight mb-2`}>
                      {currentItem.name}
                    </h2>
                    {!isNiveisSchema && indicatorMeta?.color && (
                      <div 
                        className="inline-block h-1.5 w-24 rounded-full"
                        style={{ backgroundColor: indicatorMeta.color }}
                      ></div>
                    )}
                  </div>
                </div>

                {currentItem.conceptual_description || currentItem.description ? (
                  <div className="bg-white/50 backdrop-blur-sm rounded-xl p-0 sm:p-6 mb-6">
                    <p className="text-base sm:text-lg text-gray-700 leading-normal sm:leading-relaxed">
                      {currentItem.conceptual_description || currentItem.description}
                    </p>
                  </div>
                ) : null}

                <div className="flex items-center gap-3 pt-6 border-t border-gray-200">
                  <div className="flex-shrink-0 rounded-lg bg-[#EEF2FF] px-4 py-2 flex items-center justify-center">
                    <span className="text-sm font-bold text-[#4F46E5] whitespace-nowrap">
                      {currentQuestions.length} {currentQuestions.length === 1 ? 'pergunta' : 'perguntas'} 
                      {isNiveisSchema ? ' neste nível' : ' neste indicador'}
                    </span>
                  </div>
              
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="group inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white rounded-xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                Avançar <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* QUESTION PHASE */}
        {phase === 'question' && currentQuestion && (
          <div className="space-y-8 pt-8">
            {/* Question Header */}
            <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  {!isNiveisSchema && IconComponent && indicatorMeta?.color && (
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: indicatorMeta.color }}
                    >
                      <IconComponent className="w-6 h-6 text-white" strokeWidth={2} />
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4F46E5] mb-1">
                      {currentItem?.name || 'Sem nome'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Pergunta {currentQuestionIndexInIndicator + 1} de {currentQuestions.length}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-1">
                    Progresso {isNiveisSchema ? 'do nível' : 'do indicador'}
                  </p>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: currentQuestions.length }).map((_, idx) => (
                      <div
                        key={idx}
                        className={`h-2 w-8 rounded-full transition-all ${
                          idx < currentQuestionIndexInIndicator
                            ? 'bg-[#4F46E5]'
                            : idx === currentQuestionIndexInIndicator
                            ? 'bg-gradient-to-r from-[#4F46E5] to-[#6366F1] animate-pulse'
                            : 'bg-gray-200'
                        }`}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Question Card - Mobile Optimized */}
            <div className="space-y-5">
              {/* Question Text - Lighter design on mobile */}
              <div className="bg-white/60 sm:bg-gradient-to-br sm:from-white/90 sm:to-white/70 backdrop-blur-md border border-white/60 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-sm">
                <h3 className={`${TOKENS.fonts.serif} text-base sm:text-xl text-[#1E1B4B] leading-relaxed sm:leading-tight`}>
                  {currentQuestion.text}
                </h3>
              </div>

              {/* Alternatives - Compact design */}
              <div className="space-y-2.5 sm:space-y-4">
                {(currentQuestion.alternatives || []).map((alt, idx) => {
                  const isSelected = answers[currentQuestion.id] === alt.score_value;
                  return (
                    <button
                      key={alt.id}
                      onClick={() => handleAnswerChangeWithScroll(currentQuestion.id, alt.score_value)}
                      className={`group w-full text-left p-3 sm:p-6 rounded-xl sm:rounded-2xl border transition-all duration-300 ${
                        isSelected
                          ? 'border-[#4F46E5] bg-gradient-to-r from-[#EEF2FF] to-[#E0E7FF] shadow-md sm:shadow-lg sm:scale-[1.02]'
                          : 'border-gray-200 bg-white/90 hover:border-[#4F46E5]/50 hover:shadow-sm sm:hover:shadow-md sm:hover:scale-[1.01]'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                        <div className={`flex-shrink-0 w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all ${
                          isSelected
                            ? 'bg-[#4F46E5] text-white'
                            : 'bg-gray-100 text-gray-500 group-hover:bg-[#4F46E5]/10 group-hover:text-[#4F46E5]'
                        }`}>
                          {isSelected ? <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6" /> : String.fromCharCode(65 + idx)}
                        </div>
                        <span className={`text-sm sm:text-lg leading-relaxed sm:leading-normal transition-colors flex-1 ${
                          isSelected ? 'text-[#1E1B4B] font-medium' : 'text-gray-700'
                        }`}>
                          {alt.text}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Navigation */}
            <div ref={nextButtonRef} className="flex justify-center pt-4">
              <button
                onClick={handleNext}
                disabled={!canProceed() || submitting}
                className="group inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white rounded-xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Processando...
                  </>
                ) : (
                  <>
                    {currentQuestionIndexInIndicator === currentQuestions.length - 1 && currentIndicatorIndex === indicators.length - 1 ? 'Finalizar Assessment' : 'Próxima pergunta'}
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Assessment;