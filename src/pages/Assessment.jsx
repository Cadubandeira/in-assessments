import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAssessment } from '../hooks/useAssessment';
import { TOKENS } from '../config/tokens';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { getLucideIcon } from '../utils/iconUtils';

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
    introductionHtml
  } = useAssessment({ assessmentIdOrSlug: id });

  // Phase state machine: 'intro' | 'indicator-intro' | 'question'
  const [phase, setPhase] = useState('intro');
  const [currentIndicatorIndex, setCurrentIndicatorIndex] = useState(0);
  const [currentQuestionIndexInIndicator, setCurrentQuestionIndexInIndicator] = useState(0);
  const [indicatorsMeta, setIndicatorsMeta] = useState({});

  console.log('Assessment Page Debug:', { loading, error, assessment });

  // Defesas contra formatos inesperados vindos do backend
  const indicators = Array.isArray(assessment?.indicators) ? assessment.indicators : [];

  // Fetch indicator metadata (color, icon) from indicators_master
  useEffect(() => {
    if (!indicators.length) return;
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4F46E5] mx-auto mb-4"></div>
          <p className="text-[#1E1B4B] font-medium animate-pulse">Carregando Assessment...</p>
        </div>
      </div>
    );
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
  const currentQuestions = currentIndicator?.questions || [];
  const currentQuestion = currentQuestions[currentQuestionIndexInIndicator];
  const indicatorMeta = currentIndicator?.indicator_master_id ? indicatorsMeta[currentIndicator.indicator_master_id] : null;
  const IconComponent = indicatorMeta?.icon ? getLucideIcon(indicatorMeta.icon) : null;

  // Calculate progress
  const totalQuestions = indicators.reduce((sum, ind) => sum + (ind.questions?.length || 0), 0);
  let answeredQuestions = 0;
  indicators.forEach((ind, iIdx) => {
    if (iIdx < currentIndicatorIndex) {
      answeredQuestions += ind.questions?.length || 0;
    } else if (iIdx === currentIndicatorIndex) {
      answeredQuestions += currentQuestionIndexInIndicator;
    }
  });
  const progressPercentage = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  const handleNext = () => {
    if (phase === 'intro') {
      setPhase('indicator-intro');
    } else if (phase === 'indicator-intro') {
      setPhase('question');
      setCurrentQuestionIndexInIndicator(0);
    } else if (phase === 'question') {
      if (currentQuestionIndexInIndicator < currentQuestions.length - 1) {
        setCurrentQuestionIndexInIndicator(prev => prev + 1);
      } else {
        // Finished all questions for current indicator
        if (currentIndicatorIndex < indicators.length - 1) {
          setCurrentIndicatorIndex(prev => prev + 1);
          setPhase('indicator-intro');
          setCurrentQuestionIndexInIndicator(0);
        } else {
          // Finished entire assessment
          submitAssessment();
        }
      }
    }
  };

  const canProceed = () => {
    if (phase === 'intro' || phase === 'indicator-intro') return true;
    if (phase === 'question' && currentQuestion) {
      return answers[currentQuestion.id] !== undefined && answers[currentQuestion.id] !== null;
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF] overflow-x-hidden">
      {/* Progress Bar with Counter */}
      {phase !== 'intro' && (
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
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[#312E81]">
                {progressPercentage}%
              </span>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* INTRO PHASE */}
        {phase === 'intro' && (
          <div className="space-y-10">
            <div className="text-center mb-12">
              <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-white bg-gradient-to-r from-[#4F46E5] to-[#6366F1] px-4 py-2 rounded-full mb-6 shadow-md">
                Assessment
              </span>
              <h1 className={`${TOKENS.fonts.serif} text-5xl sm:text-6xl md:text-7xl font-extrabold text-[#1E1B4B] mb-6 leading-[1.1]`}>
                {assessment.name}
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                {assessment.description}
              </p>
            </div>

            {introductionHtml && (
              <div 
                className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-8 sm:p-10 shadow-xl prose prose-base max-w-none"
                dangerouslySetInnerHTML={{ __html: introductionHtml }}
              />
            )}

            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-sm border border-white/60 rounded-2xl p-6 sm:p-8 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-[#4F46E5]/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-[#4F46E5]">{indicators.length}</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4F46E5] mb-1">Indicadores</p>
                    <p className="text-sm text-gray-600">Dimensões avaliadas</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-sm border border-white/60 rounded-2xl p-6 sm:p-8 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-[#6366F1]/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-[#6366F1]">{totalQuestions}</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6366F1] mb-1">Perguntas</p>
                    <p className="text-sm text-gray-600">Tempo estimado: {Math.ceil(totalQuestions * 0.5)} min</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#EEF2FF] to-[#E0E7FF] border border-[#C7D2FE] rounded-2xl p-6 sm:p-8">
              <p className="text-sm text-[#312E81] leading-relaxed">
                💡 Você será apresentado a cada indicador antes de responder suas perguntas. Responda com calma e honestidade.
              </p>
            </div>

            <div className="flex justify-center pt-4">
              <button
                onClick={handleNext}
                className="group inline-flex items-center gap-3 px-12 py-4 bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white rounded-xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 shadow-xl"
              >
                Começar Assessment <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* INDICATOR INTRO PHASE */}
        {phase === 'indicator-intro' && currentIndicator && (
          <div className="space-y-10">
            <div className="text-center">
              <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-[#4F46E5] bg-[#4F46E5]/10 px-4 py-2 rounded-full">
                Indicador {currentIndicatorIndex + 1} de {indicators.length}
              </span>
            </div>

            <div className="relative bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-md border border-white/60 rounded-3xl p-10 sm:p-12 shadow-2xl overflow-hidden">
              {/* Background decoration */}
              {indicatorMeta?.color && (
                <div 
                  className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-10"
                  style={{ backgroundColor: indicatorMeta.color }}
                ></div>
              )}
              
              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
                  {IconComponent && indicatorMeta?.color && (
                    <div 
                      className="w-24 h-24 rounded-2xl flex items-center justify-center shadow-xl transform hover:scale-110 transition-transform duration-300"
                      style={{ 
                        backgroundColor: `${indicatorMeta.color}15`, 
                        color: indicatorMeta.color,
                        border: `3px solid ${indicatorMeta.color}30`
                      }}
                    >
                      <IconComponent className="w-12 h-12" strokeWidth={2.5} />
                    </div>
                  )}
                  <div className="text-center sm:text-left">
                    <h2 className={`${TOKENS.fonts.serif} text-4xl sm:text-5xl text-[#1E1B4B] leading-tight mb-2`}>
                      {currentIndicator.name}
                    </h2>
                    {indicatorMeta?.color && (
                      <div 
                        className="inline-block h-1.5 w-24 rounded-full"
                        style={{ backgroundColor: indicatorMeta.color }}
                      ></div>
                    )}
                  </div>
                </div>

                {currentIndicator.conceptual_description && (
                  <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 mb-6">
                    <p className="text-lg text-gray-700 leading-relaxed">
                      {currentIndicator.conceptual_description}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-6 border-t border-gray-200">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#EEF2FF] flex items-center justify-center">
                    <span className="text-lg font-bold text-[#4F46E5]">{currentQuestions.length}</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {currentQuestions.length === 1 ? 'Uma pergunta' : `${currentQuestions.length} perguntas`} neste indicador
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="group inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white rounded-xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                Iniciar Perguntas <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* QUESTION PHASE */}
        {phase === 'question' && currentQuestion && (
          <div className="space-y-8">
            {/* Question Header */}
            <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  {IconComponent && indicatorMeta?.color && (
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ 
                        backgroundColor: `${indicatorMeta.color}15`, 
                        color: indicatorMeta.color
                      }}
                    >
                      <IconComponent className="w-6 h-6" strokeWidth={2.5} />
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4F46E5] mb-1">
                      {currentIndicator.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      Pergunta {currentQuestionIndexInIndicator + 1} de {currentQuestions.length}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-1">Progresso do indicador</p>
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

            {/* Question Card */}
            <div className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-md border border-white/60 rounded-3xl p-8 sm:p-12 shadow-2xl">
              <h3 className={`${TOKENS.fonts.serif} text-3xl sm:text-4xl text-[#1E1B4B] mb-10 leading-tight`}>
                {currentQuestion.text}
              </h3>

              <div className="space-y-4">
                {(currentQuestion.alternatives || []).map((alt, idx) => {
                  const isSelected = answers[currentQuestion.id] === alt.score_value;
                  return (
                    <button
                      key={alt.id}
                      onClick={() => handleAnswerChange(currentQuestion.id, alt.score_value)}
                      className={`group w-full text-left p-6 rounded-2xl border-2 transition-all duration-300 ${
                        isSelected
                          ? 'border-[#4F46E5] bg-gradient-to-r from-[#EEF2FF] to-[#E0E7FF] shadow-lg scale-[1.02]'
                          : 'border-gray-200 bg-white/80 hover:border-[#4F46E5]/50 hover:shadow-md hover:scale-[1.01]'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                          isSelected
                            ? 'bg-[#4F46E5] text-white'
                            : 'bg-gray-100 text-gray-400 group-hover:bg-[#4F46E5]/10 group-hover:text-[#4F46E5]'
                        }`}>
                          {isSelected ? <CheckCircle className="w-6 h-6" /> : String.fromCharCode(65 + idx)}
                        </div>
                        <span className={`text-lg font-medium transition-colors ${
                          isSelected ? 'text-[#1E1B4B]' : 'text-gray-700'
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
            <div className="flex justify-center pt-4">
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
                    {currentQuestionIndexInIndicator === currentQuestions.length - 1 && currentIndicatorIndex === indicators.length - 1 ? 'Finalizar Assessment' : 'Próxima Pergunta'}
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