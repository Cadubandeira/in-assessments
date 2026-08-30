import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, Building2, CalendarRange, Loader2, Users } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { TOKENS } from '../config/tokens';

const percentage = (event) => {
  const max = Number(event.max_possible_score || 0);
  return max ? (Number(event.total_score || 0) / max) * 100 : 0;
};

const formatExperienceStatus = (status) => status === 'open' ? 'Em andamento' : 'Encerrada';

const ExperienceDetail = () => {
  const { experienceId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const { data: sessionData, error: sessionError } = await supabase
          .from('assessment_application_sessions')
          .select('id, public_token, assessment_id, assessment_version_id, name, status, created_at, closed_at, expires_at, assessments(name)')
          .eq('id', experienceId)
          .single();

        if (sessionError) throw sessionError;
        setSession(sessionData);

        const { data: eventData, error: eventError } = await supabase
          .from('assessment_events')
          .select('id, user_id, user_display_name, total_score, max_possible_score, indicator_scores_snapshot, executed_at')
          .eq('application_session_id', experienceId)
          .order('executed_at', { ascending: false });

        if (eventError) throw eventError;
        setEvents(eventData || []);
      } catch (loadError) {
        setError(loadError.message || 'Não foi possível carregar a experiência.');
      } finally {
        setLoading(false);
      }
    };

    if (experienceId) load();
  }, [experienceId]);

  const metrics = useMemo(() => {
    const indicatorValues = {};
    events.forEach((event) => {
      Object.values(event.indicator_scores_snapshot || {}).forEach((indicator) => {
        if (!indicator?.name) return;
        const max = Number(indicator.maxScore ?? indicator.max_score ?? 0);
        const value = Number(indicator.percentage ?? (max ? (Number(indicator.score || 0) / max) * 100 : 0));
        if (!indicatorValues[indicator.name]) indicatorValues[indicator.name] = [];
        indicatorValues[indicator.name].push(value);
      });
    });

    return {
      average: events.length ? events.reduce((sum, event) => sum + percentage(event), 0) / events.length : 0,
      indicators: Object.entries(indicatorValues)
        .map(([name, values]) => ({
          name,
          average: values.reduce((sum, value) => sum + value, 0) / values.length
        }))
        .sort((left, right) => right.average - left.average),
      participants: events.length
    };
  }, [events]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F3EC]">
        <Loader2 className="h-8 w-8 animate-spin text-[#4F46E5]" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-[#F5F3EC] px-4 py-12">
        <div className="mx-auto max-w-2xl rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
          {error || 'Experiência não encontrada.'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F3EC] px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <button type="button" onClick={() => navigate('/experiences')} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#312E81]">
          <ArrowLeft className="h-4 w-4" />
          Voltar para experiências
        </button>

        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-600">Experiência</p>
              <h1 className={`${TOKENS.fonts.serif} mt-2 text-3xl font-bold text-[#1E1B4B] sm:text-4xl`}>
                {session.name}
              </h1>
              <p className="mt-2 text-sm text-slate-500">{session.assessments?.name || 'Assessment'} · {formatExperienceStatus(session.status)}</p>
            </div>

            <div className="rounded-full bg-emerald-100 px-3 py-2 text-sm font-bold text-emerald-700">
              {formatExperienceStatus(session.status)}
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-3 text-slate-500">
                <Users className="h-5 w-5 text-indigo-600" />
                <span className="text-sm">Participantes</span>
              </div>
              <p className="mt-3 text-3xl font-bold text-[#1E1B4B]">{metrics.participants}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-3 text-slate-500">
                <BarChart3 className="h-5 w-5 text-indigo-600" />
                <span className="text-sm">Média geral</span>
              </div>
              <p className="mt-3 text-3xl font-bold text-[#1E1B4B]">{metrics.average.toFixed(1)}%</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-3 text-slate-500">
                <CalendarRange className="h-5 w-5 text-indigo-600" />
                <span className="text-sm">Última atividade</span>
              </div>
              <p className="mt-3 text-lg font-bold text-[#1E1B4B]">
                {events[0]?.executed_at ? new Date(events[0].executed_at).toLocaleDateString('pt-BR') : 'Ainda não houve respostas'}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-indigo-600" />
              <h2 className="text-xl font-bold text-[#1E1B4B]">Indicadores</h2>
            </div>

            <div className="mt-6 space-y-4">
              {metrics.indicators.length ? metrics.indicators.map((indicator) => (
                <div key={indicator.name}>
                  <div className="mb-1 flex items-center justify-between text-sm text-slate-700">
                    <span>{indicator.name}</span>
                    <strong>{indicator.average.toFixed(1)}%</strong>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100">
                    <div className="h-2.5 rounded-full bg-gradient-to-r from-[#4F46E5] to-[#818CF8]" style={{ width: `${Math.min(100, Math.max(0, indicator.average))}%` }} />
                  </div>
                </div>
              )) : (
                <p className="text-sm text-slate-500">Ainda não há indicadores calculados para esta experiência.</p>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
              <h2 className="text-xl font-bold text-[#1E1B4B]">Insights</h2>
            </div>

            <div className="mt-6 space-y-4 text-sm text-slate-600">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-semibold text-[#1E1B4B]">Comparação por grupo</p>
                <p className="mt-2">Os resultados permitem comparar performance entre participantes, equipes e diferentes segmentos da experiência.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-semibold text-[#1E1B4B]">Indicadores mais relevantes</p>
                <p className="mt-2">A combinação dos dados ajuda a identificar pontos de atenção e oportunidades de intervenção.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-semibold text-[#1E1B4B]">Decisão por dados</p>
                <p className="mt-2">O painel oferece visão coletiva para orientar workshops, programas e ações de desenvolvimento.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-[#1E1B4B]">Participantes</h2>
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">Participante</th>
                  <th className="px-4 py-3 font-semibold">Resultado</th>
                  <th className="px-4 py-3 font-semibold">Concluído em</th>
                </tr>
              </thead>
              <tbody>
                {events.length ? events.map((event) => (
                  <tr key={event.id} className="border-t border-slate-200 last:border-0">
                    <td className="px-4 py-3 font-medium text-[#1E1B4B]">{event.user_display_name || 'Usuário'}</td>
                    <td className="px-4 py-3">{percentage(event).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(event.executed_at).toLocaleString('pt-BR')}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="3" className="px-4 py-6 text-center text-slate-500">Nenhum participante respondeu ainda.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ExperienceDetail;
