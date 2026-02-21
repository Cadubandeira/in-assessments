import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Send, Flame } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { TOKENS } from '../config/tokens';
import ActivitiesSkeleton from '../components/skeletons/ActivitiesSkeleton';

const slugify = (value) => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)+/g, '');

const AssessmentCard = ({ assessment, onStart }) => (
  <button
    type="button"
    onClick={() => onStart(assessment)}
    className="group p-6 sm:p-8 border border-white/60 bg-white/80 backdrop-blur-sm rounded-2xl flex flex-col h-full text-left transition-all hover:border-[#4F46E5]/40 shadow-sm hover:shadow-lg"
    aria-label={`Iniciar assessment: ${assessment.name}`}
  >
    <div className="flex-grow">
      <p className="text-[#4F46E5] text-xs font-bold uppercase tracking-widest mb-2">
        Disponivel
      </p>
      <h3 className={`${TOKENS.fonts.serif} text-2xl mb-3 leading-tight text-[#1E1B4B]`}>
        {assessment.name}
      </h3>
      <p className="text-sm text-gray-600 leading-relaxed">
        {assessment.description}
      </p>
    </div>
    <div className="flex items-center justify-between mt-6">
      <span className="text-xs font-bold text-[#4F46E5] px-2 py-1 bg-[#4F46E5]/10 rounded">
        Iniciar agora
      </span>
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#4F46E5]">
        Ver detalhes <ArrowRight className="w-4 h-4" />
      </span>
    </div>
  </button>
);

const RealScenarioCard = ({ onOpen }) => (
  <button
    type="button"
    onClick={onOpen}
    className="group p-6 sm:p-8 border border-white/60 bg-white/80 backdrop-blur-sm rounded-2xl flex flex-col h-full text-left transition-all hover:border-[#4F46E5]/40 shadow-sm hover:shadow-lg"
    aria-label="Abrir simulação adaptativa com IA"
  >
    <div className="flex-grow space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#4F46E5]">
          Situacoes reais
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#312E81] bg-[#E0E7FF] px-2 py-1 rounded-full">
          Powered by IA
        </span>
      </div>
      <h3 className={`${TOKENS.fonts.serif} text-2xl sm:text-3xl leading-tight text-[#1E1B4B]`}>
        Simulacao Adaptativa com IA + Pressao Contextual Real
      </h3>
      <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
        <p>
          Em vez de questionario: voce cria um cenario vivo, que muda conforme as decisoes da pessoa.
        </p>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4F46E5] mb-2">Exemplos</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Conflito entre dois colaboradores</li>
            <li>Meta sob risco</li>
            <li>Dilema etico</li>
            <li>Cliente insatisfeito</li>
            <li>Crise reputacional</li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4F46E5] mb-2">A cada decisao</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>O sistema altera o cenario</li>
            <li>Introduz pressao (tempo, novas informacoes, ambiguidade)</li>
            <li>Mede padroes decisorios</li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4F46E5] mb-2">O diferencial</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Nao mede resposta correta</li>
            <li>Mede processo cognitivo</li>
            <li>Mapeia heuristicas</li>
            <li>Identifica vieses</li>
          </ul>
        </div>
        <p>
          Isso conecta com estudos sobre tomada de decisao de Daniel Kahneman. E praticamente um "mini laboratorio comportamental".
        </p>
      </div>
    </div>
    <div className="flex items-center justify-between mt-6">
      <span className="text-xs font-bold text-[#4F46E5] px-2 py-1 bg-[#4F46E5]/10 rounded">
        Abrir simulacao
      </span>
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#4F46E5]">
        Ver detalhes <ArrowRight className="w-4 h-4" />
      </span>
    </div>
  </button>
);

const Activities = () => {
  const [assessments, setAssessments] = useState([]);
  const [highlightAssessment, setHighlightAssessment] = useState(null);
  const [aiSuggestion, setAiSuggestion] = useState({
    assessment: null,
    indicatorName: null,
    reason: null
  });
  const [aiLoading, setAiLoading] = useState(true);
  const [aiRequested, setAiRequested] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('assessments')
        .select('id, name, description, is_active, published_at, created_at')
        .eq('is_active', true);

      let sorted = [];
      if (data) {
        setAssessments(data);
        sorted = [...data].sort((a, b) => {
          const dateA = new Date(a.published_at || a.created_at || 0).getTime();
          const dateB = new Date(b.published_at || b.created_at || 0).getTime();
          return dateB - dateA;
        });
        setHighlightAssessment(sorted[0] || null);
      }

      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        setAiLoading(false);
        return;
      }

      if (sorted.length > 0) {
        const { data: assessmentEvents } = await supabase
          .from('assessment_events')
          .select('assessment_id')
          .eq('user_id', user.id);

        const completedIds = new Set((assessmentEvents || []).map(item => item.assessment_id));
        const missingAssessment = sorted.find(assessment => !completedIds.has(assessment.id));
        setHighlightAssessment(missingAssessment || sorted[0]);
      }

      const { data: indicators } = await supabase
        .from('indicators_master')
        .select('id, name');

      const { data: scores } = await supabase
        .from('user_indicator_scores')
        .select('indicator_id, percentage')
        .eq('user_id', user.id);

      if (!indicators || indicators.length === 0) {
        setAiLoading(false);
        return;
      }

      const scoreMap = new Map((scores || []).map(score => [score.indicator_id, score.percentage ?? 0]));
      const missing = indicators.filter(indicator => !scoreMap.has(indicator.id));

      let targetIndicator = null;
      let reason = null;

      if (missing.length > 0) {
        targetIndicator = missing[0];
        reason = 'Voce ainda nao tem resultado para este indicador.';
      } else {
        let lowest = null;
        indicators.forEach(indicator => {
          const value = scoreMap.get(indicator.id) ?? 0;
          if (!lowest || value < lowest.value) {
            lowest = { indicator, value };
          }
        });
        targetIndicator = lowest?.indicator || indicators[0];
        reason = 'Seu menor resultado atual esta aqui. Vale reforcar este ponto.';
      }

      let suggestedAssessment = null;
      if (targetIndicator) {
        const { data: indicatorAssessments } = await supabase
          .from('indicators')
          .select('assessment_id, assessments (id, name, description, is_active)')
          .eq('indicator_master_id', targetIndicator.id);

        if (indicatorAssessments && indicatorAssessments.length > 0) {
          const active = indicatorAssessments
            .map(item => item.assessments)
            .filter(assessment => assessment?.is_active);
          suggestedAssessment = active[0] || null;
        }
      }

      setAiSuggestion({
        assessment: suggestedAssessment,
        indicatorName: targetIndicator?.name || null,
        reason
      });
      setAiLoading(false);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return <ActivitiesSkeleton />;
  }

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF] overflow-x-hidden"
      aria-busy={aiLoading}
    >
      <section className="bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] pt-[72px] pb-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute top-16 -left-10 w-48 h-48 md:w-64 md:h-64 bg-white rounded-full blur-3xl" aria-hidden="true"></div>
          <div className="absolute bottom-0 -right-20 w-64 h-64 md:w-96 md:h-96 bg-[#312E81] rounded-full blur-3xl" aria-hidden="true"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 relative z-10 w-full text-left">
          <h2 className={`${TOKENS.fonts.serif} text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight`}>
            Atividades 
          </h2>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 -mt-16 relative z-20 w-full pb-16">
        <section className="mb-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <button
              type="button"
              onClick={() => highlightAssessment && navigate(`/assessment/${slugify(highlightAssessment.name || '')}`)}
              className="group text-left rounded-3xl p-[1px] bg-gradient-to-br from-[#4F46E5] via-[#7C6FF6] to-[#C4B5FD] shadow-xl"
            >
              <div className="h-full rounded-3xl bg-gradient-to-br from-[#EDE9FF] via-[#F8F7FF] to-[#EEF2FF] border border-white/70 p-6 sm:p-8 transition-all hover:shadow-2xl">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1E1B4B] bg-[#FDE68A] px-3 py-1 rounded-full">
                      Recomendação
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1E1B4B] bg-[#FDE68A] px-3 py-1 rounded-full">
                      XP em dobro
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#4F46E5]/15 text-[#4F46E5] flex items-center justify-center">
                    <Flame className="w-7 h-7 sm:w-8 sm:h-8" fill="currentColor" strokeWidth={0} />
                  </div>
                  <div>
                    <h3 className={`${TOKENS.fonts.serif}`}>
                      {highlightAssessment?.name}
                    </h3>
                    <p className="text-sm text-gray-600 max-w-xl">
                  Uma experiência inédita pode revelar um indicador que você ainda não conhece.
                </p>
                  </div>
                </div>
                <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#4F46E5]">
                  Ver atividade <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </button>

            <div className="bg-[#1B1633] border border-[#2E2A4A] rounded-2xl p-6 sm:p-8 shadow-lg text-[#EDEBFF]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B7A6FF]">IA</span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#E6E1FF] bg-[#3A2E6B] px-2 py-1 rounded-full">
                  Powered by IA
                </span>
              </div>
              <div className="space-y-4">
                <div className="bg-[#2B2450] text-[#EDEBFF] rounded-2xl rounded-bl-md px-4 py-3 text-sm">
                  Sou a IA da sua jornada. Posso sugerir a proxima atividade com base nos seus indicadores.
                </div>
                <div className="relative">
                  <div className="bg-[#221C3F] border border-[#3B3560] rounded-full px-4 py-2.5 text-sm text-[#C8C1F5] pr-12">
                    Qual atividade devo fazer a seguir?
                  </div>
                  <button
                    type="button"
                    onClick={() => setAiRequested(true)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#6D5CF6] text-white shadow hover:shadow-lg transition"
                    aria-label="Enviar pergunta"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>

                {aiRequested && (
                  <div className="bg-[#2B2450] border border-[#3B3560] rounded-2xl rounded-br-md px-4 py-3 text-sm text-[#F2F0FF]">
                    {aiLoading ? 'Analisando seus indicadores para encontrar a melhor proxima atividade.' : (
                      aiSuggestion.assessment
                        ? `Recomendacao: ${aiSuggestion.assessment.name} (${aiSuggestion.indicatorName}).`
                        : `Recomendacao: indicador ${aiSuggestion.indicatorName || 'em definicao'}.`
                    )}
                    {aiSuggestion.reason && !aiLoading && (
                      <span className="block mt-2 text-[#EDEBFF] font-semibold">
                        {aiSuggestion.reason}
                      </span>
                    )}
                    {aiSuggestion.assessment && !aiLoading && (
                      <button
                        type="button"
                        onClick={() => navigate(`/assessment/${slugify(aiSuggestion.assessment.name || '')}`)}
                        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#B7A6FF]"
                      >
                        Ir para a atividade <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
        <section className="mb-12 sm:mb-16">
          <div className="mb-6">
            <h3 className={`${TOKENS.fonts.serif} text-2xl sm:text-3xl text-[#1E1B4B]`}>Assessments</h3>
            <p className="text-sm text-gray-600 max-w-2xl">
              Escolha um assessment para mapear suas competencias e evoluir.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {assessments.map(a => (
              <AssessmentCard
                key={a.id}
                assessment={a}
                onStart={() => navigate(`/assessment/${slugify(a.name || '')}`)}
              />
            ))}
          </div>
        </section>

        <section>
          <div className="mb-6">
            <h3 className={`${TOKENS.fonts.serif} text-2xl sm:text-3xl text-[#1E1B4B]`}>Situacoes reais</h3>
            <p className="text-sm text-gray-600 max-w-2xl">
              Experiêcias guiadas por IA para avaliar sua tomada de decisão nos mais diversos contextos.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <RealScenarioCard onOpen={() => navigate('/activities/real-scenarios')} />
          </div>
        </section>
      </main>
    </div>
  );
};

export default Activities;
