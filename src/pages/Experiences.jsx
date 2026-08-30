import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BarChart3, Briefcase, Building2, CheckCircle2, ChevronRight, Copy, Loader2, Maximize2, Minimize2, Plus, RefreshCw, UserPlus, Users, Wand2, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useUserRole } from '../hooks/useUserRole';
import { TOKENS } from '../config/tokens';

const createToken = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID().replaceAll('-', '');
  return `${Date.now()}${Math.random().toString(36).slice(2)}`;
};

const percentage = (event) => {
  const max = Number(event.max_possible_score || 0);
  return max ? (Number(event.total_score || 0) / max) * 100 : 0;
};

const isCorporateAccess = (role) => role === 'admin' || role === 'corporate';

const formatExperienceStatus = (status) => status === 'open' ? 'Em andamento' : 'Encerrada';

const getEffectiveDisplayName = (profile) => {
  if (!profile) return 'Usuário sem nome';
  const fallback = profile.display_name || profile.email?.split('@')[0];
  return fallback?.trim() || 'Usuário sem nome';
};

const Experiences = ({ user }) => {
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();
  const [assessments, setAssessments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionStats, setSessionStats] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({ assessmentId: '', name: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [isInvitePopoverOpen, setIsInvitePopoverOpen] = useState(false);
  const [isInviteFullScreen, setIsInviteFullScreen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [filter, setFilter] = useState('all');
  const [profiles, setProfiles] = useState([]);
  const [selectedCorporateUserIds, setSelectedCorporateUserIds] = useState([]);
  const [draftCorporateUserIds, setDraftCorporateUserIds] = useState([]);
  const [savingAccess, setSavingAccess] = useState(false);
  const [accessSearch, setAccessSearch] = useState('');

  const isAdmin = role === 'admin';
  const isCorporate = role === 'corporate';
  const canViewDashboard = isCorporateAccess(role);

  useEffect(() => {
    const loadProfiles = async () => {
      if (!isAdmin) return;

      const { data: profileRows, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name, role, email')
        .order('display_name', { ascending: true });

      if (profileError) {
        console.error('Failed to load profiles:', profileError);
        setProfiles([]);
        return;
      }

      setProfiles((profileRows || []).map((row) => ({
        ...row,
        email: row.email || null,
        display_name: getEffectiveDisplayName(row)
      })));
    };

    loadProfiles();
  }, [isAdmin]);

  useEffect(() => {
    const loadAssignedUsers = async () => {
      if (!selectedId || !isAdmin) {
        setSelectedCorporateUserIds([]);
        return;
      }

      const { data, error } = await supabase
        .from('experience_access')
        .select('user_id')
        .eq('application_session_id', selectedId)
        .eq('is_active', true);

      if (!error) {
        setSelectedCorporateUserIds((data || []).map((entry) => entry.user_id).filter(Boolean));
      }
    };

    loadAssignedUsers();
  }, [selectedId, isAdmin]);

  useEffect(() => {
    const shouldLockScroll = isAccessModalOpen || isInviteFullScreen;
    if (!shouldLockScroll) {
      document.body.style.overflow = '';
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isAccessModalOpen, isInviteFullScreen]);

  useEffect(() => {
    if (!canViewDashboard) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);

        const [{ data: assessmentData, error: assessmentError }] = await Promise.all([
          supabase.from('assessments').select('id, name').eq('is_active', true).order('name')
        ]);

        if (assessmentError) throw assessmentError;
        setAssessments(assessmentData || []);
        if (assessmentData?.[0]) {
          setForm((current) => ({ ...current, assessmentId: current.assessmentId || assessmentData[0].id }));
        }

        let accessibleSessionIds = null;
        if (isCorporate) {
          const currentUserId = user?.id || (await supabase.auth.getUser()).data.user?.id;
          if (!currentUserId) {
            setSessions([]);
            setSelectedId(null);
            setSessionStats({});
            return;
          }

          const { data: accessData, error: accessError } = await supabase
            .from('experience_access')
            .select('application_session_id')
            .eq('user_id', currentUserId)
            .eq('is_active', true);

          if (accessError) {
            const missingTable = accessError.code === '42P01' || accessError.code === '42703' || accessError.message?.toLowerCase().includes('does not exist');
            if (!missingTable) throw accessError;
            accessibleSessionIds = [];
          } else {
            accessibleSessionIds = (accessData || []).map((item) => item.application_session_id).filter(Boolean);
          }
        }

        let sessionQuery = supabase
          .from('assessment_application_sessions')
          .select('id, public_token, assessment_id, assessment_version_id, name, status, created_at, closed_at, expires_at, assessments(name)');

        if (!isAdmin && isCorporate) {
          if (!accessibleSessionIds?.length) {
            setSessions([]);
            setSelectedId(null);
            setSessionStats({});
            return;
          }
          sessionQuery = sessionQuery.in('id', accessibleSessionIds);
        }

        const { data: sessionData, error: sessionError } = await sessionQuery.order('created_at', { ascending: false });

        if (sessionError) throw sessionError;
        setSessions(sessionData || []);
        if ((sessionData || []).length) {
          setSelectedId((sessionData || [])[0].id);
        } else {
          setSelectedId(null);
        }

        const ids = (sessionData || []).map((session) => session.id);
        if (!ids.length) {
          setSessionStats({});
          return;
        }

        const { data: eventData, error: eventError } = await supabase
          .from('assessment_events')
          .select('application_session_id, total_score, max_possible_score, executed_at')
          .in('application_session_id', ids);

        if (eventError) throw eventError;

        const nextStats = {};
        (eventData || []).forEach((event) => {
          const sessionId = event.application_session_id;
          const current = nextStats[sessionId] || { participants: 0, completion: 0, lastActivity: null };
          const score = Number(event.total_score || 0);
          const max = Number(event.max_possible_score || 0);
          const completion = max ? (score / max) * 100 : 0;

          current.participants += 1;
          current.completion = current.participants ? (current.completion + completion) / 2 : completion;
          current.lastActivity = current.lastActivity && new Date(current.lastActivity) > new Date(event.executed_at)
            ? current.lastActivity
            : event.executed_at;

          nextStats[sessionId] = current;
        });

        setSessionStats(nextStats);
      } catch (loadError) {
        setError(loadError.message || 'Não foi possível carregar as avaliações em grupo.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [canViewDashboard]);

  useEffect(() => {
    setEvents([]);
    if (!selectedId) return undefined;

    const loadSessionEvents = async () => {
      const { data, error: eventError } = await supabase
        .from('assessment_events')
        .select('id, user_id, user_display_name, total_score, max_possible_score, indicator_scores_snapshot, executed_at')
        .eq('application_session_id', selectedId)
        .order('executed_at', { ascending: false });

      if (eventError) throw eventError;
      setEvents(data || []);
    };

    loadSessionEvents().catch((loadError) => setError(loadError.message));
    const interval = window.setInterval(() => loadSessionEvents().catch(() => {}), 5000);
    return () => window.clearInterval(interval);
  }, [selectedId]);

  const filteredSessions = useMemo(() => {
    if (filter === 'open') return sessions.filter((session) => session.status === 'open');
    if (filter === 'closed') return sessions.filter((session) => session.status === 'closed');
    return sessions;
  }, [filter, sessions]);

  const sortedProfiles = useMemo(() => {
    return [...profiles]
      .filter((profile) => profile.role !== 'admin')
      .sort((left, right) => {
        const leftName = (getEffectiveDisplayName(left) || 'Usuário').toLowerCase();
        const rightName = (getEffectiveDisplayName(right) || 'Usuário').toLowerCase();
        return leftName.localeCompare(rightName);
      });
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    const search = accessSearch.trim().toLowerCase();
    const baseList = sortedProfiles;
    if (!search) return baseList;

    return baseList.filter((profile) => {
      const name = (profile.display_name || '').toLowerCase();
      const email = (profile.email || '').toLowerCase();
      return name.includes(search) || email.includes(search);
    });
  }, [sortedProfiles, accessSearch]);

  const visibleProfiles = filteredProfiles;

  const selectedSession = sessions.find((session) => session.id === selectedId) || null;

  useEffect(() => {
    if (!isAdmin || !selectedSession || selectedSession.status !== 'open') {
      return;
    }

    setIsInvitePopoverOpen(true);
    setIsInviteFullScreen(false);
  }, [isAdmin, selectedSession]);

  const syncCorporateRoles = async (applicationSessionId, userIds) => {
    const cleanedIds = [...new Set((userIds || []).filter(Boolean))];

    const { data: allAccessRows, error: accessError } = await supabase
      .from('experience_access')
      .select('user_id')
      .eq('is_active', true);

    if (accessError) throw accessError;

    const activeUserIds = new Set((allAccessRows || []).map((entry) => entry.user_id).filter(Boolean));
    const targetIds = [...new Set([...cleanedIds, ...Array.from(activeUserIds)])];

    if (!targetIds.length) {
      return;
    }

    const { data: profileRows, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .in('id', targetIds);

    if (profileError) throw profileError;

    for (const profile of profileRows || []) {
      if (profile.role === 'admin') continue;
      const nextRole = activeUserIds.has(profile.id) ? 'corporate' : 'user';
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: nextRole })
        .eq('id', profile.id)
        .neq('role', 'admin');

      if (updateError) throw updateError;
    }
  };

  const saveExperienceAccess = async (applicationSessionId, userIds) => {
    if (!applicationSessionId || !Array.isArray(userIds)) return;

    const cleanedIds = [...new Set((userIds || []).filter(Boolean))];
    const currentUserId = user?.id || (await supabase.auth.getUser()).data.user?.id;
    if (!currentUserId) return;

    const { error: rpcError } = await supabase.rpc('replace_experience_access', {
      p_application_session_id: applicationSessionId,
      p_user_ids: cleanedIds
    });

    if (rpcError) throw rpcError;

    await syncCorporateRoles(applicationSessionId, cleanedIds);
  };

  const refreshSessions = async () => {
    const { data: sessionData, error: sessionError } = await supabase
      .from('assessment_application_sessions')
      .select('id, public_token, assessment_id, assessment_version_id, name, status, created_at, closed_at, expires_at, assessments(name)')
      .order('created_at', { ascending: false });

    if (sessionError) throw sessionError;

    setSessions(sessionData || []);
    if (sessionData?.length) {
      setSelectedId((currentSelectedId) => currentSelectedId || sessionData[0].id);
    } else {
      setSelectedId(null);
    }
  };

  const closeSession = async () => {
    if (!selectedSession || selectedSession.status !== 'open') return;

    const { error: closeError } = await supabase
      .from('assessment_application_sessions')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', selectedSession.id);

    if (closeError) {
      setError(closeError.message || 'Não foi possível encerrar a avaliação em grupo.');
      return;
    }

    setIsCloseModalOpen(false);
    setIsInvitePopoverOpen(false);
    setIsInviteFullScreen(false);
    await refreshSessions();
  };

  const copyApplicationLink = async () => {
    if (!selectedSession) return;

    const publicUrl = `${window.location.origin}${window.location.pathname}#/apply/${selectedSession.public_token}`;
    if (!navigator.clipboard) return;

    try {
      await navigator.clipboard.writeText(publicUrl);
      setIsLinkCopied(true);
      window.setTimeout(() => setIsLinkCopied(false), 2500);
    } catch {
      setError('Não foi possível copiar o link da avaliação em grupo.');
    }
  };

  const createSession = async (event) => {
    event.preventDefault();
    if (!isAdmin || !form.assessmentId || !form.name.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const { data: version, error: versionError } = await supabase
        .from('assessment_versions')
        .select('id')
        .eq('assessment_id', form.assessmentId)
        .eq('is_active', true)
        .single();

      if (versionError) throw versionError;

      const { data: createdSession, error: insertError } = await supabase.from('assessment_application_sessions').insert({
        public_token: createToken(),
        assessment_id: form.assessmentId,
        assessment_version_id: version.id,
        created_by: user?.id || (await supabase.auth.getUser()).data.user.id,
        name: form.name.trim()
      }).select('id').single();

      if (insertError) throw insertError;

      setForm((current) => ({ ...current, name: '' }));
      setIsCreateModalOpen(false);

      const convertToIds = (selectedProfiles) => selectedProfiles
        .map((entry) => entry.id)
        .filter(Boolean);

      await saveExperienceAccess(createdSession.id, convertToIds(selectedCorporateUserIds));

      const { data: sessionData, error: sessionError } = await supabase
        .from('assessment_application_sessions')
        .select('id, public_token, assessment_id, assessment_version_id, name, status, created_at, closed_at, expires_at, assessments(name)')
        .order('created_at', { ascending: false });

      if (sessionError) throw sessionError;
      setSessions(sessionData || []);
      setSelectedId((sessionData || [])[0]?.id || null);
      setSelectedCorporateUserIds([]);
    } catch (saveError) {
      setError(saveError.message || 'Não foi possível criar a avaliação em grupo.');
    } finally {
      setSaving(false);
    }
  };

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
      indicators: Object.entries(indicatorValues).map(([name, values]) => ({
        name,
        average: values.reduce((sum, value) => sum + value, 0) / values.length
      })).sort((left, right) => right.average - left.average),
      participants: events.length
    };
  }, [events]);

  const renderCommercialLanding = () => (
    <div className="min-h-screen bg-[#F5F3EC] text-[#1E1B4B]">
      <section className="relative overflow-hidden bg-gradient-to-r from-[#312E81] via-[#4F46E5] to-[#6366F1] text-white">
        <div className="absolute inset-0 opacity-20" aria-hidden="true">
          <div className="absolute left-[-80px] top-12 h-40 w-40 rounded-full bg-white blur-3xl" />
          <div className="absolute right-[-60px] bottom-[-40px] h-48 w-48 rounded-full bg-[#A5B4FC] blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              
              <h1 className={`${TOKENS.fonts.serif} mt-6 text-4xl font-extrabold leading-tight sm:text-5xl`}>
                Avaliações em grupo
              </h1>
              <p className="mt-5 max-w-xl text-lg text-indigo-100">
                Descubra como estão os conhecimentos, habilidades e atitudes de sua equipe para que possa transformar a realidade do seu ambiente de trabalho. Analise os resultados de forma coletiva, comparando indicadores e diferentes perfis de seu grupo.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button type="button" onClick={() => window.open('https://wa.me/5541992082713?text=Ol%C3%A1%2C%20quero%20solicitar%20uma%20aplica%C3%A7%C3%A3o%20de%20avalia%C3%A7%C3%A3o%20em%20grupo%20para%20%5Btema%5D.', '_blank', 'noopener,noreferrer')} className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#312E81] shadow-lg transition hover:bg-indigo-50">
                  Solicitar
                </button>
                <button type="button" onClick={() => window.location.hash = '#como-funciona'} className="rounded-xl border border-white/30 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10">
                  Como funciona
                </button>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur-sm">
              <div className="rounded-[22px] bg-white p-5 text-[#1E1B4B] shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">Dashboard coletivo</p>
                    <h3 className="mt-2 text-xl font-bold">Workshop de liderança</h3>
                  </div>
                  <div className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">Em andamento</div>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="rounded-xl bg-indigo-50 p-3">
                    <div className="flex items-center justify-between text-sm text-indigo-700">
                      <span>Participantes</span>
                      <strong>72</strong>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-indigo-100">
                      <div className="h-2 w-[72%] rounded-full bg-indigo-600" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-slate-500">Liderança</p>
                      <p className="mt-2 text-xl font-bold text-slate-900">74%</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-slate-500">Colaboração</p>
                      <p className="mt-2 text-xl font-bold text-slate-900">68%</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 p-3">
                    <p className="text-sm font-semibold text-indigo-700">Comparação por time</p>
                    <div className="mt-3 space-y-2">
                      {['Gestão', 'Operação', 'Comercial'].map((team, idx) => (
                        <div key={team} className="flex items-center justify-between text-xs text-slate-600">
                          <span>{team}</span>
                          <div className="flex w-24 items-center gap-2">
                            <div className="h-2 flex-1 rounded-full bg-slate-200">
                              <div className="h-2 rounded-full bg-indigo-600" style={{ width: `${72 - idx * 6}%` }} />
                            </div>
                            <span>{72 - idx * 6}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <section className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-600">Casos de uso</p>
          <h2 className={`${TOKENS.fonts.serif} mt-3 text-3xl font-bold text-[#1E1B4B] sm:text-4xl`}>
            Avaliações em grupo para diferentes momentos corporativos
          </h2>
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Briefcase,
              theme: 'Liderança',
              title: 'Workshop de Liderança',
              description: 'Aplicar assessment para líderes e times em eventos presenciais e obter comparação entre grupos, níveis e indicadores-chave.'
            },
            {
              icon: Users,
              theme: 'Colaboração',
              title: 'Programa de Desenvolvimento',
              description: 'Acompanhar evolução de pessoas em programas de desenvolvimento, identificar lacunas e medir impacto em ciclos.'
            },
            {
              icon: Wand2,
              theme: 'Personalização',
              title: 'Crie sua própria avaliação em grupo',
              description: 'Use assessments existentes ou solicite um assessment personalizado ou sob demanda para a sua realidade e objetivos.'
            }
          ].map(({ icon: Icon, theme, title, description }) => (
            <article key={title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-[#1E1B4B]">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
            </article>
          ))}
        </section>

        <section id="como-funciona" className="mt-20 rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-600">Como funciona</p>
            <h2 className={`${TOKENS.fonts.serif} mt-3 text-3xl font-bold text-[#1E1B4B]`}>
              Um fluxo simples para medir grupos e gerar insights
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-4">
            {[
              'Escolher assessment',
              'Criar avaliação em grupo',
              'Convidar participantes',
              'Analisar resultados'
            ].map((step, idx) => (
              <div key={step} className="rounded-2xl bg-slate-50 p-5 text-left">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#4F46E5] text-sm font-bold text-white">0{idx + 1}</div>
                <p className="text-base font-bold text-[#1E1B4B]">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 grid items-center gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-600">Benefícios</p>
            <h2 className={`${TOKENS.fonts.serif} mt-3 text-3xl font-bold text-[#1E1B4B]`}>
              Compare grupos, indicadores e resultados com clareza
            </h2>
            <ul className="mt-6 space-y-4 text-slate-600">
              {[
                'Comparar performance entre equipes, lideranças ou unidades.',
                'Identificar padrões e indicadores com maior impacto por grupo.',
                'Acompanhar evolução em tempo real durante programas e workshops.',
                'Transformar dados em insights acionáveis para decisões.'
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-600">Comparação</p>
                <h3 className="mt-2 text-xl font-bold text-[#1E1B4B]">Indicadores por grupo</h3>
              </div>
              <BarChart3 className="h-8 w-8 text-indigo-600" />
            </div>
            <div className="mt-6 space-y-5">
              {[
                { name: 'Liderança', value: 82 },
                { name: 'Colaboração', value: 74 },
                { name: 'Resiliência', value: 69 },
                { name: 'Autoconhecimento', value: 77 }
              ].map((item) => (
                <div key={item.name}>
                  <div className="mb-1 flex items-center justify-between text-sm text-slate-600">
                    <span>{item.name}</span>
                    <strong>{item.value}%</strong>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-gradient-to-r from-[#4F46E5] to-[#818CF8]" style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contato" className="mt-20 rounded-[32px] bg-gradient-to-r from-[#312E81] via-[#4F46E5] to-[#6366F1] px-6 py-12 text-center text-white shadow-xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-100">Pronto para testar?</p>
          <h2 className={`${TOKENS.fonts.serif} mt-3 text-3xl font-bold sm:text-4xl`}>
            Descubra como uma avaliação em grupo pode transformar a sua organização.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-indigo-100">
            A equipe pode criar avaliações em grupo personalizadas para workshops, programas de desenvolvimento, treinamentos e outras iniciativas corporativas.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a href="https://wa.me/5541992082713" target="_blank" rel="noreferrer" className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#312E81] transition hover:bg-indigo-50">
              Falar no WhatsApp
            </a>
            <button type="button" onClick={() => window.location.hash = '#top'} className="rounded-xl border border-white/30 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10">
              Entender o fluxo
            </button>
          </div>
        </section>
      </main>
    </div>
  );

  const closeAccessModal = () => {
    setIsAccessModalOpen(false);
    setSelectedCorporateUserIds([]);
    setDraftCorporateUserIds([]);
    setAccessSearch('');
  };

  const openAccessModal = async (sessionId) => {
    setSelectedId(sessionId);
    setAccessSearch('');

    try {
      const { data, error } = await supabase
        .from('experience_access')
        .select('user_id')
        .eq('application_session_id', sessionId)
        .eq('is_active', true);

      if (!error) {
        setDraftCorporateUserIds((data || []).map((entry) => entry.user_id).filter(Boolean));
      } else {
        setDraftCorporateUserIds(selectedCorporateUserIds);
      }
    } catch {
      setDraftCorporateUserIds(selectedCorporateUserIds);
    }

    setIsAccessModalOpen(true);
  };

  const renderDashboard = () => {
    const showNoAccessMarketing = !isAdmin && sessions.length === 0;

    return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF]">
      <section className="relative overflow-hidden bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] px-4 pb-24 pt-[72px] sm:px-6">
        <div className="pointer-events-none absolute inset-0 opacity-10" aria-hidden="true">
          <div className="absolute -left-10 top-20 h-48 w-48 rounded-full bg-white blur-3xl md:h-64 md:w-64" />
          <div className="absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-[#312E81] blur-3xl md:h-96 md:w-96" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-4 pt-8 sm:px-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/80">Avaliações em grupo</p>
              <h1 className={`${TOKENS.fonts.serif} mb-4 text-3xl font-extrabold leading-tight text-white sm:text-4xl md:text-5xl`}>
                Avaliações em grupo
              </h1>
              <p className="mt-3 max-w-3xl text-base text-white/90 sm:text-lg">
                Crie avaliações em grupo para workshops, programas e eventos, aplique assessments ao seu grupo e descubra como seus participantes estão se saindo.
              </p>
            </div>

          </div>
        </div>
      </section>

      <main className="relative z-20 mx-auto -mt-16 w-full max-w-7xl px-4 pb-16 sm:px-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {showNoAccessMarketing ? (
          <div className="space-y-6">
            
            <div className="grid gap-5 xl:grid-cols-3">
              {[
                {
                  title: 'Workshops de liderança',
                  description: 'Crie experiências de liderança com diagnóstico claro, comparação por equipe e insights acionáveis para decisões de gestão.',
                  accent: 'from-[#312E81] to-[#4F46E5]',
                  bullets: ['Diagnóstico estratégico', 'Comparativo por time', 'Ações de desenvolvimento']
                },
                {
                  title: 'Programas de desenvolvimento',
                  description: 'Acompanhe evolução de pessoas e equipes em ciclos de desenvolvimento com indicadores de progresso e vantagem competitiva.',
                  accent: 'from-[#0F172A] to-[#334155]',
                  bullets: ['Acompanhamento em ciclo', 'Indicadores de evolução', 'Alinhamento de talentos']
                },
                {
                  title: 'Avaliação de conhecimentos',
                  description: 'Avalie maturidade, conhecimento e performance de grupos em contextos de treinamento, seleção e certificação.',
                  accent: 'from-[#1D4ED8] to-[#60A5FA]',
                  bullets: ['Conhecimento por grupo', 'Benchmark de performance', 'Resultados claros e comparáveis']
                }
              ].map((card) => (
                <article key={card.title} className="flex h-full flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-lg shadow-indigo-100/60">
                  <div className={`bg-gradient-to-r ${card.accent} px-5 py-5 text-white`}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/90">
                        {card.theme}
                      </span>
                    </div>
                    <h3 className="mt-4 text-2xl font-bold leading-tight">{card.title}</h3>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <p className="text-sm leading-7 text-slate-600">{card.description}</p>

                    <ul className="mt-5 space-y-3 text-sm text-slate-700">
                      {card.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-3">
                          <span className="mt-1.5 h-2 w-2 rounded-full bg-[#4F46E5]" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-6 pt-5">
                      <button
                        type="button"
                        onClick={() => window.open('https://wa.me/5541992082713?text=Ol%C3%A1%2C%20quero%20solicitar%20uma%20aplica%C3%A7%C3%A3o%20de%20avalia%C3%A7%C3%A3o%20em%20grupo%20para%20%5Btema%5D.', '_blank', 'noopener,noreferrer')}
                        className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#4F46E5] to-[#6366F1] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-transform hover:-translate-y-0.5"
                      >
                        Solicitar aplicação
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="h-fit space-y-4 lg:col-span-1 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-gray-900">Histórico</h2>
                {isAdmin && (
                  <button type="button" onClick={() => setIsCreateModalOpen(true)} className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-[#4F46E5] to-[#6366F1] p-2.5 text-white shadow-lg transition hover:shadow-xl" aria-label="Criar nova avaliação em grupo" title="Criar nova avaliação em grupo">
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>
               <div className="mb-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {[
                { key: 'all', label: 'Todas' },
                { key: 'open', label: 'Em andamento' },
                { key: 'closed', label: 'Encerradas' }
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setFilter(option.key)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${filter === option.key ? 'border-[#4F46E5] bg-[#4F46E5] text-white shadow-md' : 'border-slate-200 bg-white text-slate-600 hover:border-[#c7d2fe]'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>

          </div>
        </div>
              <div className="space-y-2">
                {filteredSessions.length ? filteredSessions.map((session) => {
                  const stats = sessionStats[session.id] || { participants: 0, lastActivity: null };
                  const isSelected = selectedId === session.id;

                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => setSelectedId(session.id)}
                      className={`w-full rounded-lg border-2 p-4 text-left transition-all ${isSelected ? 'border-[#4F46E5] bg-gradient-to-r from-[#4F46E5] to-[#6366F1] shadow-lg' : 'border-gray-200 bg-white hover:border-[#4F46E5]'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className={`text-base font-bold ${isSelected ? 'text-white' : 'text-[#1E1B4B]'}`}>{session.name}</h3>
                          <p className={`mt-1 text-xs ${isSelected ? 'text-white/75' : 'text-slate-500'}`}>{session.assessments?.name || 'Assessment'}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${session.status === 'open' ? (isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700') : (isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600')}`}>
                          {formatExperienceStatus(session.status)}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className={`${isSelected ? 'text-white/75' : 'text-slate-500'}`}>Participantes</p>
                          <p className={`mt-1 font-bold ${isSelected ? 'text-white' : 'text-[#1E1B4B]'}`}>{stats.participants}</p>
                        </div>
                        <div>
                          <p className={`${isSelected ? 'text-white/75' : 'text-slate-500'}`}>Atualizado em</p>
                          <p className={`mt-1 font-bold ${isSelected ? 'text-white' : 'text-[#1E1B4B]'}`}>
                            {stats.lastActivity ? new Date(stats.lastActivity).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                }) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
                    {isCorporate
                      ? 'Você ainda não tem acesso a nenhuma avaliação em grupo atribuída.'
                      : 'Nenhuma avaliação em grupo encontrada para este filtro.'}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-6 lg:col-span-2">
            {!selectedSession ? (
              <div className="rounded-2xl bg-white p-12 text-center text-gray-500 shadow-lg">
                Selecione uma avaliação em grupo para acompanhar os indicadores e os participantes.
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-[#1E1B4B]">{selectedSession.name}</h2>
                      <p className="text-sm text-gray-500">{selectedSession.assessments?.name} · {selectedSession.status === 'open' ? 'coleta aberta' : 'coleta encerrada'}</p>
                    </div>
                    {isAdmin && (
                      <div className="flex flex-wrap items-center gap-3">
                        {selectedSession.status === 'open' && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setIsInvitePopoverOpen(true);
                                setIsInviteFullScreen(false);
                              }}
                              className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-5 py-3 text-sm font-bold uppercase tracking-wider text-indigo-700 hover:bg-indigo-50"
                            >
                              <UserPlus className="h-4 w-4" />
                              Convidar
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsCloseModalOpen(true)}
                              className="rounded-lg border border-indigo-200 bg-white px-5 py-3 text-sm font-bold uppercase tracking-wider text-indigo-700 hover:bg-indigo-50"
                            >
                              Encerrar avaliação em grupo
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => openAccessModal(selectedSession.id)}
                          className="rounded-lg border border-indigo-200 bg-white px-5 py-3 text-sm font-bold uppercase tracking-wider text-indigo-700 hover:bg-indigo-50"
                        >
                          Definir administradores
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-white p-5 shadow-sm">
                    <Users className="h-5 w-5 text-indigo-600" />
                    <p className="mt-2 text-2xl font-bold">{sessionStats[selectedSession.id]?.participants || 0}</p>
                    <p className="text-sm text-gray-500">Participantes</p>
                  </div>
                  <div className="rounded-xl bg-white p-5 shadow-sm">
                    <p className="text-sm font-semibold text-[#1E1B4B]">{selectedSession.status === 'open' ? 'Em andamento' : 'Encerrada'}</p>
                    <p className="mt-2 text-sm text-gray-500">{selectedSession.assessments?.name || 'Assessment'}</p>
                  </div>
                  <div className="rounded-xl bg-white p-5 shadow-sm">
                    <RefreshCw className="h-5 w-5 text-indigo-600" />
                    <p className="mt-2 text-sm font-semibold text-[#1E1B4B]">Atualização automática</p>
                    <p className="mt-1 text-sm text-gray-500">A cada 5 segundos</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <h3 className="mb-4 font-bold text-[#1E1B4B]">Indicadores</h3>
                  {metrics.indicators.length ? (
                    <div className="space-y-3">
                      {metrics.indicators.map((indicator) => (
                        <div key={indicator.name}>
                          <div className="mb-1 flex justify-between text-sm">
                            <span>{indicator.name}</span>
                            <strong>{indicator.average.toFixed(1)}%</strong>
                          </div>
                          <div className="h-2 rounded-full bg-indigo-100">
                            <div className="h-2 rounded-full bg-indigo-600" style={{ width: `${Math.min(100, Math.max(0, indicator.average))}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Os indicadores aparecerão após a primeira resposta.</p>
                  )}
                </div>

                <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
                  <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                    <h3 className="text-lg font-bold text-[#1E1B4B]">Participantes</h3>
                  </div>
                  <div className="overflow-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b bg-slate-50">
                        <tr>
                          <th className="p-3 font-semibold text-slate-700">Participante</th>
                          <th className="p-3 font-semibold text-slate-700">Resultado</th>
                          <th className="p-3 font-semibold text-slate-700">Concluído em</th>
                        </tr>
                      </thead>
                      <tbody>
                        {events.length ? events.map((event) => (
                          <tr key={event.id} className="border-b last:border-0">
                            <td className="p-3 font-medium text-slate-800">{event.user_display_name || 'Usuário'}</td>
                            <td className="p-3 text-slate-700">{percentage(event).toFixed(1)}%</td>
                            <td className="p-3 text-slate-500">{new Date(event.executed_at).toLocaleString('pt-BR')}</td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={3} className="p-6 text-center text-sm text-slate-500">Nenhum participante respondeu ainda.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
        )}
      </main>

      {isCreateModalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="create-experience-title">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-600">Nova avaliação em grupo</p>
                <h2 id="create-experience-title" className="mt-2 text-2xl font-bold text-[#1E1B4B]">Criar avaliação em grupo</h2>
              </div>
              <button type="button" onClick={() => setIsCreateModalOpen(false)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">✕</button>
            </div>

            <form onSubmit={createSession} className="space-y-5">
              <label className="block text-sm font-semibold text-slate-700">
                Assessment
                <select value={form.assessmentId} onChange={(event) => setForm({ ...form, assessmentId: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-[#4F46E5]">
                  {assessments.map((assessment) => (
                    <option key={assessment.id} value={assessment.id}>{assessment.name}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Nome da avaliação em grupo
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex.: Workshop de liderança Q3" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-[#4F46E5]" autoFocus />
              </label>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-700">Usuários com acesso corporativo</p>
                <p className="mt-1 text-xs text-slate-500">Selecione os usuários que poderão visualizar esta avaliação em grupo no painel corporativo.</p>
                <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
                  {profiles.filter((profile) => profile.role !== 'admin').map((profile) => {
                    const isChecked = selectedCorporateUserIds.includes(profile.id);
                    return (
                      <label key={profile.id} className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                        <span>{getEffectiveDisplayName(profile)}</span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(event) => {
                            const next = event.target.checked
                              ? [...selectedCorporateUserIds, profile.id]
                              : selectedCorporateUserIds.filter((id) => id !== profile.id);
                            setSelectedCorporateUserIds(next);
                          }}
                          className="h-4 w-4 accent-[#4F46E5]"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700">Cancelar</button>
                <button type="submit" disabled={saving || !form.assessmentId || !form.name.trim()} className="rounded-xl bg-gradient-to-r from-[#4F46E5] to-[#6366F1] px-5 py-3 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60">
                  {saving ? 'Criando...' : 'Criar avaliação em grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCloseModalOpen && selectedSession && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="close-experience-title">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="rounded-t-2xl bg-gradient-to-r from-red-500 via-red-600 to-red-700 px-6 py-5">
              <h2 id="close-experience-title" className="text-xl font-bold text-white">Encerrar avaliação em grupo</h2>
            </div>
            <div className="p-6">
              <p className="text-lg font-semibold text-gray-900">Deseja encerrar esta avaliação em grupo?</p>
              <div className="mt-4 rounded-xl border-2 border-red-200 bg-red-50 p-4">
                <p className="font-bold text-red-900">{selectedSession.name}</p>
                <p className="mt-1 text-sm text-red-800">{selectedSession.assessments?.name}</p>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-gray-600">Após o encerramento, novos participantes não serão vinculados a esta avaliação em grupo e os resultados já enviados continuarão disponíveis.</p>
            </div>
            <div className="flex gap-3 rounded-b-2xl border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button type="button" onClick={() => setIsCloseModalOpen(false)} className="flex-1 rounded-lg border-2 border-gray-300 px-4 py-2.5 font-semibold text-gray-700 transition-colors hover:bg-gray-100">Cancelar</button>
              <button type="button" onClick={closeSession} className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-red-700">Encerrar avaliação em grupo</button>
            </div>
          </div>
        </div>
      )}

      {isInvitePopoverOpen && selectedSession && selectedSession.status === 'open' && (
        <div className={isInviteFullScreen ? 'fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm' : 'fixed bottom-3 right-3 z-40'} role="dialog" aria-modal={isInviteFullScreen} aria-labelledby="invite-experience-title">
          <div className={isInviteFullScreen ? 'max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-white/70 bg-white p-6 shadow-2xl ring-1 ring-black/5 sm:p-10' : 'w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-white/70 bg-white p-5 shadow-2xl ring-1 ring-black/5'}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id="invite-experience-title" className="text-lg font-bold text-[#1E1B4B]">Convidar participantes</h2>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setIsInviteFullScreen((current) => !current)} className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-700" aria-label={isInviteFullScreen ? 'Reduzir convite' : 'Maximizar convite'} title={isInviteFullScreen ? 'Reduzir' : 'Maximizar'}>{isInviteFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</button>
                <button type="button" onClick={() => { setIsInvitePopoverOpen(false); setIsInviteFullScreen(false); }} className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-700" aria-label="Fechar convite"><X className="h-4 w-4" /></button>
              </div>
            </div>

            <div className={isInviteFullScreen ? 'grid grid-cols-1 items-start gap-8 md:grid-cols-2' : ''}>
              <div>
                <div className={`${isInviteFullScreen ? 'aspect-square w-full p-0' : 'p-3'} flex justify-center rounded-xl bg-gray-50`}>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`${window.location.origin}${window.location.pathname}#/apply/${selectedSession.public_token}`)}`} alt="QR Code da avaliação em grupo" className={`${isInviteFullScreen ? 'h-full w-full' : 'h-[180px] w-[180px]'} rounded-lg bg-white object-contain`} />
                </div>
                <button type="button" onClick={copyApplicationLink} className={`mx-auto mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-white px-4 py-3 text-sm font-bold uppercase tracking-wider text-indigo-700 transition hover:bg-indigo-50 active:bg-indigo-100 ${isInviteFullScreen ? '' : 'max-w-[20rem]'}`}>
                  <Copy className="h-4 w-4" />
                  {isLinkCopied ? 'Link copiado' : 'Copiar link'}
                </button>
              </div>

              {isInviteFullScreen && (
                <section className="flex aspect-square min-h-0 flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/80 p-5 shadow-lg backdrop-blur-sm" aria-labelledby="invite-participants-card-title">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50"><Users className="h-5 w-5 text-indigo-600" /></div>
                      <div>
                        <h3 id="invite-participants-card-title" className="text-lg font-bold text-[#1E1B4B]">Participantes</h3>
                        <p className="text-sm text-gray-500">Acompanhamento da avaliação em grupo</p>
                      </div>
                    </div>
                    <span className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700">{events.length}</span>
                  </div>
                  <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-gray-100">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b bg-gray-50">
                        <tr>
                          <th className="p-3">Participante</th>
                          <th className="p-3">Resultado</th>
                          <th className="p-3">Concluído em</th>
                        </tr>
                      </thead>
                      <tbody>
                        {events.map((event) => (
                          <tr key={`invite-${event.id}`} className="border-b last:border-0">
                            <td className="p-3 font-medium text-gray-800">{event.user_display_name || 'Usuário'}</td>
                            <td className="p-3 text-gray-700">{percentage(event).toFixed(1)}%</td>
                            <td className="p-3 text-gray-500">{new Date(event.executed_at).toLocaleString('pt-BR')}</td>
                          </tr>
                        ))}
                        {events.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-sm text-gray-500">Nenhum participante concluiu ainda.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}

      {isAccessModalOpen && isAdmin && selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="experience-access-title">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 id="experience-access-title" className="text-2xl font-bold text-[#1E1B4B]">Definir administradores</h2>
              </div>
              <button type="button" onClick={closeAccessModal} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">✕</button>
            </div>

            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Atenção:</p>
              <p className="mt-1 leading-6">
                Ao marcar um usuário aqui, o perfil dele será atualizado para <strong>corporate</strong> e ele passa a ter acesso a esta avaliação em grupo no painel corporativo. Esse fluxo é diferente de convidar participantes da avaliação em grupo, que respondem ao assessment e não passam a ter acesso administrativo ao painel.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3">
                <label className="block text-sm font-semibold text-slate-700">
                  Buscar usuário
                  <input
                    type="text"
                    value={accessSearch}
                    onChange={(event) => setAccessSearch(event.target.value)}
                    placeholder="Nome ou e-mail"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#4F46E5]"
                  />
                </label>
              </div>

              <div className="mb-3 flex items-center justify-between text-xs font-medium text-slate-500">
                <span>{draftCorporateUserIds.length} usuário(s) selecionado(s)</span>
              </div>

              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {visibleProfiles.map((profile) => {
                  const isChecked = draftCorporateUserIds.includes(profile.id);
                  return (
                    <label key={profile.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-800">{getEffectiveDisplayName(profile)}</p>
                        <p className="truncate text-xs text-slate-500">{profile.email || 'Sem e-mail cadastrado'}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${isChecked ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {isChecked ? 'corporate' : 'usuário'}
                        </span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(event) => {
                            const next = event.target.checked
                              ? [...new Set([...draftCorporateUserIds, profile.id])]
                              : draftCorporateUserIds.filter((id) => id !== profile.id);
                            setDraftCorporateUserIds(next);
                          }}
                          className="h-4 w-4 accent-[#4F46E5]"
                        />
                      </div>
                    </label>
                  );
                })}

                {!visibleProfiles.length && (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center text-sm text-slate-500">
                    Nenhum usuário encontrado para esta busca.
                  </div>
                )}
              </div>

              <div className="mt-3 text-right text-xs text-slate-500">
                {filteredProfiles.length} usuário(s) encontrado(s)
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={async () => {
                  try {
                    setSavingAccess(true);
                    setSelectedCorporateUserIds(draftCorporateUserIds);
                    await saveExperienceAccess(selectedSession.id, draftCorporateUserIds);
                    closeAccessModal();
                  } catch (accessError) {
                    setError(accessError.message || 'Não foi possível aplicar os administradores da avaliação em grupo.');
                  } finally {
                    setSavingAccess(false);
                  }
                }}
                className="rounded-xl bg-gradient-to-r from-[#4F46E5] to-[#6366F1] px-5 py-3 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                disabled={savingAccess}
              >
                {savingAccess ? 'Salvando...' : 'Aplicar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

  if (roleLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#F5F3EC]"><Loader2 className="h-8 w-8 animate-spin text-[#4F46E5]" /></div>;
  }

  if (!user) {
    return renderCommercialLanding();
  }

  return canViewDashboard ? renderDashboard() : renderCommercialLanding();
};

export default Experiences;
