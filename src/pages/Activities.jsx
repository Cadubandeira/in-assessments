import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Zap } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { TOKENS } from '../config/tokens';
import ActivitiesSkeleton from '../components/skeletons/ActivitiesSkeleton';
import CallToActionCard from '../components/CallToActionCard';
import { useUserRole } from '../hooks/useUserRole';

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
      <h3 className={`${TOKENS.fonts.serif} text-2xl mb-3 leading-tight text-[#1E1B4B]`}>
        {assessment.name}
      </h3>
      <p className="text-sm text-gray-600 leading-relaxed">
        {assessment.description}
      </p>
    </div>
    <div className="flex justify-end mt-6">
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#4F46E5]">
        Ver detalhes <ArrowRight className="w-4 h-4" />
      </span>
    </div>
  </button>
);

const RealScenarioSimpleCard = ({ title, description, scenarioId }) => (
  <button
    type="button"
    onClick={() => window.location.hash = `/activities/real-scenarios/${scenarioId}`}
    className="group p-6 sm:p-8 border border-white/60 bg-white/80 backdrop-blur-sm rounded-2xl flex flex-col h-full text-left transition-all hover:border-[#4F46E5]/40 shadow-sm hover:shadow-lg"
    aria-label={`Abrir: ${title}`}
  >
    <div className="flex-grow">
      <h3 className={`${TOKENS.fonts.serif} text-2xl mb-3 leading-tight text-[#1E1B4B]`}>
        {title}
      </h3>
      <p className="text-sm text-gray-600 leading-relaxed">
        {description}
      </p>
    </div>
    <div className="flex justify-end mt-6">
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#4F46E5]">
        Ver detalhes <ArrowRight className="w-4 h-4" />
      </span>
    </div>
  </button>
);

const Activities = () => {
  const [assessments, setAssessments] = useState([]);
  const [highlightAssessment, setHighlightAssessment] = useState(null);
  const [specificScenario, setSpecificScenario] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { role } = useUserRole();
  const isAdmin = role === 'admin';

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('assessments')
        .select('id, name, description, is_active, published_at, created_at, display_order')
        .eq('is_active', true);

      let sorted = [];
      if (data) {
        setAssessments(data);
        sorted = [...data].sort((a, b) => {
          const ao = a.display_order ?? 9999;
          const bo = b.display_order ?? 9999;
          if (ao !== bo) return ao - bo;
          const dateA = new Date(a.published_at || a.created_at || 0).getTime();
          const dateB = new Date(b.published_at || b.created_at || 0).getTime();
          return dateB - dateA;
        });
        setHighlightAssessment(sorted[0] || null);
      }

      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (user && sorted.length > 0) {
        const { data: assessmentEvents } = await supabase
          .from('assessment_events')
          .select('assessment_id')
          .eq('user_id', user.id);

        const completedIds = new Set((assessmentEvents || []).map(item => item.assessment_id));
        const missingAssessment = sorted.find(assessment => !completedIds.has(assessment.id));
        setHighlightAssessment(missingAssessment || sorted[0]);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    const fetchScenario = async () => {
      const { data } = await supabase
        .from('scenario_simulations')
        .select('id, title, description')
        .eq('id', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
        .single();

      if (data) {
        setSpecificScenario(data);
      }
    };
    fetchScenario();
  }, [isAdmin]);

  if (loading) {
    return <ActivitiesSkeleton />;
  }

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF] overflow-x-hidden"
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
          <div className="grid grid-cols-1 gap-6 sm:gap-8">
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
                  </div>
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#4F46E5]/15 text-[#4F46E5] flex items-center justify-center">
                    <Zap className="w-7 h-7 sm:w-8 sm:h-8" fill="currentColor" strokeWidth={0} />
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
          </div>
        </section>
        <section className="mb-12 sm:mb-16">
          <div className="mb-8">
            <h3 className={`${TOKENS.fonts.serif} text-2xl sm:text-3xl text-[#1E1B4B] mb-3`}>Assessments</h3>
            <p className="text-base text-gray-600 max-w-2xl">
              Escolha um assessment para mapear suas competências e evoluir.
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

        {isAdmin && (
          <section>
            <div className="mb-8">
              <CallToActionCard
                icon={<Zap size={32} />}
                title="Situações reais desafiadoras"
                description="Teste suas habilidades em cenários reais com pressão contextual e análise comportamental."
                buttonText="SAIBA MAIS"
                onButtonClick={() => navigate('/activities/real-scenarios')}
                gradientFrom="from-red-600"
                gradientTo="to-orange-500"
                buttonTextColor="text-red-600"
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {specificScenario && (
                <RealScenarioSimpleCard 
                  title={specificScenario.title}
                  description={specificScenario.description}
                  scenarioId="a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                />
              )}
            </div>
          </section>
        )}

        {!isAdmin && (
          <section>
            <div className="mb-8">
              <div className="bg-gradient-to-r from-red-600 to-orange-500 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl flex flex-col md:flex-row items-center justify-between text-white gap-4 sm:gap-6 w-full">
                <div className="flex items-center gap-3 sm:gap-4 md:gap-6 w-full md:w-auto">
                  <div className="bg-white/20 p-3 sm:p-4 rounded-lg flex-shrink-0">
                    <Zap size={32} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg sm:text-xl font-bold">Situações reais desafiadoras</h4>
                    <p className="text-white/80 text-base">
                      Teste suas habilidades em cenários reais com pressão contextual e análise comportamental.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled
                  className="border border-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg font-bold text-xs sm:text-sm uppercase tracking-wider whitespace-nowrap w-full md:w-auto cursor-default"
                >
                  EM BREVE
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Activities;
