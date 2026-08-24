import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Copy, Loader2, Maximize2, Minimize2, Plus, QrCode, UserPlus, Users, X } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useUserRole } from '../../hooks/useUserRole';
import { TOKENS } from '../../config/tokens';

const createToken = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID().replaceAll('-', '');
  return `${Date.now()}${Math.random().toString(36).slice(2)}`;
};

const percentage = (event) => {
  const max = Number(event.max_possible_score || 0);
  return max ? (Number(event.total_score || 0) / max) * 100 : 0;
};

const ApplicationsAdmin = () => {
  const { role, loading: roleLoading } = useUserRole();
  const [assessments, setAssessments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({ assessmentId: '', name: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isInvitePopoverOpen, setIsInvitePopoverOpen] = useState(false);
  const [isInviteFullScreen, setIsInviteFullScreen] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

  const loadSessions = async () => {
    const { data, error: loadError } = await supabase
      .from('assessment_application_sessions')
      .select('id, public_token, assessment_id, assessment_version_id, name, status, created_at, closed_at, expires_at, assessments(name)')
      .order('created_at', { ascending: false });
    if (loadError) throw loadError;
    setSessions(data || []);
  };

  useEffect(() => {
    if (role !== 'admin') return;
    const load = async () => {
      try {
        setLoading(true);
        const [{ data: assessmentData, error: assessmentError }] = await Promise.all([
          supabase.from('assessments').select('id, name').eq('is_active', true).order('name')
        ]);
        if (assessmentError) throw assessmentError;
        setAssessments(assessmentData || []);
        if (assessmentData?.[0]) setForm((current) => ({ ...current, assessmentId: current.assessmentId || assessmentData[0].id }));
        await loadSessions();
      } catch (loadError) {
        setError(loadError.message || 'Não foi possível carregar as sessões.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [role]);

  const selectedSession = sessions.find((session) => session.id === selectedId) || null;

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
    const timer = window.setInterval(() => loadSessionEvents().catch(() => {}), 5000);
    return () => window.clearInterval(timer);
  }, [selectedId]);

  useEffect(() => {
    if (!isInviteFullScreen) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousDocumentOverflow;
    };
  }, [isInviteFullScreen]);

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
      })).sort((left, right) => right.average - left.average)
    };
  }, [events]);

  const createSession = async (event) => {
    event.preventDefault();
    if (!form.assessmentId || !form.name.trim()) return;
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
      const { error: insertError } = await supabase.from('assessment_application_sessions').insert({
        public_token: createToken(),
        assessment_id: form.assessmentId,
        assessment_version_id: version.id,
        created_by: (await supabase.auth.getUser()).data.user.id,
        name: form.name.trim()
      });
      if (insertError) throw insertError;
      setForm((current) => ({ ...current, name: '' }));
      setIsCreateModalOpen(false);
      await loadSessions();
    } catch (saveError) {
      setError(saveError.message || 'Não foi possível criar a sessão.');
    } finally {
      setSaving(false);
    }
  };

  const closeSession = async () => {
    if (!selectedSession || selectedSession.status !== 'open') return;
    const { error: closeError } = await supabase.from('assessment_application_sessions')
      .update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', selectedSession.id);
    if (closeError) setError(closeError.message);
    else {
      setIsCloseModalOpen(false);
      setIsInvitePopoverOpen(false);
      setIsInviteFullScreen(false);
      await loadSessions();
    }
  };

  if (roleLoading || loading) return <div className="p-12 text-center"><Loader2 className="mx-auto animate-spin" /></div>;
  if (role !== 'admin') return <div className="p-12 text-center text-red-600">Acesso negado.</div>;

  const publicUrl = selectedSession ? `${window.location.origin}${window.location.pathname}#/apply/${selectedSession.public_token}` : '';
  const qrUrl = publicUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(publicUrl)}` : '';

  const copyApplicationLink = async () => {
    if (!publicUrl || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setIsLinkCopied(true);
      window.setTimeout(() => setIsLinkCopied(false), 2500);
    } catch {
      setError('Não foi possível copiar o link.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF]">
      <section className="relative overflow-hidden bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] px-4 pb-24 pt-[72px] sm:px-6">
        <div className="pointer-events-none absolute inset-0 opacity-10" aria-hidden="true">
          <div className="absolute -left-10 top-20 h-48 w-48 rounded-full bg-white blur-3xl md:h-64 md:w-64" />
          <div className="absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-[#312E81] blur-3xl md:h-96 md:w-96" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-4 pt-8 sm:px-6">
          <button type="button" onClick={() => window.history.back()} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-white/90 transition-colors hover:text-white"><ArrowLeft className="h-4 w-4" />Dashboard</button>
          <h1 className={`${TOKENS.fonts.serif} mb-4 text-3xl font-extrabold leading-tight text-white sm:text-4xl md:text-5xl`}>Aplicações de assessments</h1>
          <p className="mt-3 max-w-3xl text-base text-white/90 sm:text-lg">Crie uma aplicação, compartilhe o acesso e acompanhe os resultados em tempo real.</p>
        </div>
      </section>
      <main className="relative z-20 mx-auto -mt-16 w-full max-w-7xl px-4 pb-16 sm:px-6">
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="h-fit space-y-4 lg:col-span-1 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Histórico de aplicações</h2>
                <button type="button" onClick={() => setIsCreateModalOpen(true)} className="rounded-lg bg-gradient-to-r from-[#4F46E5] to-[#6366F1] p-2 text-white transition-all hover:shadow-lg" title="Criar nova aplicação" aria-label="Criar nova aplicação"><Plus className="h-4 w-4" /></button>
              </div>
              <div className="space-y-2">{sessions.map((session) => <div key={session.id} className={`flex items-center justify-between rounded-lg border-2 transition-all ${selectedId === session.id ? 'border-[#4F46E5] bg-gradient-to-r from-[#4F46E5] to-[#6366F1] shadow-lg' : 'border-gray-200 bg-white hover:border-[#4F46E5]'}`}><button type="button" onClick={() => { setSelectedId(session.id); setIsInvitePopoverOpen(session.status === 'open'); setIsInviteFullScreen(false); }} className={`flex-1 truncate px-4 py-3 text-left text-sm font-medium ${selectedId === session.id ? 'text-white' : 'text-gray-800'}`}><span className="block truncate">{session.name}</span><span className={`mt-0.5 block truncate text-xs ${selectedId === session.id ? 'text-white/75' : 'text-gray-400'}`}>{session.assessments?.name}</span></button><span className={`mr-3 shrink-0 text-xs font-medium ${selectedId === session.id ? 'text-white/80' : session.status === 'open' ? 'text-green-600' : 'text-gray-400'}`}>{session.status === 'open' ? 'Aberta' : 'Encerrada'}</span></div>)}</div>
              {sessions.length === 0 && <p className="text-sm text-gray-500">Nenhuma aplicação criada ainda.</p>}
            </div>
          </section>
          <section className="space-y-6 lg:col-span-2">
            {!selectedSession ? <div className="rounded-2xl bg-white p-12 text-center text-gray-500">Selecione uma aplicação para acompanhar os resultados.</div> : <>
              <div className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-bold text-[#1E1B4B]">{selectedSession.name}</h2><p className="text-sm text-gray-500">{selectedSession.assessments?.name} · {selectedSession.status === 'open' ? 'coleta aberta' : 'coleta encerrada'}</p></div><div className="flex flex-wrap items-center gap-3">{selectedSession.status === 'open' && <button type="button" onClick={() => { setIsInvitePopoverOpen(true); setIsInviteFullScreen(false); }} className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-5 py-3 text-sm font-bold uppercase tracking-wider text-indigo-700 hover:bg-indigo-50"><UserPlus className="h-4 w-4" />Convidar</button>}{selectedSession.status === 'open' && <button type="button" onClick={() => setIsCloseModalOpen(true)} className="rounded-lg border border-indigo-200 bg-white px-5 py-3 text-sm font-bold uppercase tracking-wider text-indigo-700 hover:bg-indigo-50">Encerrar aplicação</button>}</div></div></div>
              <div className="grid gap-4 sm:grid-cols-3"><div className="rounded-xl bg-white p-5 shadow-sm"><Users className="h-5 w-5 text-indigo-600" /><p className="mt-2 text-2xl font-bold">{events.length}</p><p className="text-sm text-gray-500">Participantes</p></div><div className="rounded-xl bg-white p-5 shadow-sm"><p className="text-2xl font-bold">{metrics.average.toFixed(1)}%</p><p className="text-sm text-gray-500">Média geral</p></div><div className="rounded-xl bg-white p-5 shadow-sm"><QrCode className="h-5 w-5 text-indigo-600" /><p className="mt-2 text-sm font-semibold">{selectedSession.status === 'open' ? 'Atualização automática' : 'Resultado consolidado'}</p><p className="text-sm text-gray-500">{selectedSession.status === 'open' ? 'A cada 5 segundos' : 'Sessão encerrada'}</p></div></div>
              <div className="rounded-2xl bg-white p-5 shadow-sm"><h3 className="mb-4 font-bold text-[#1E1B4B]">Média por indicador</h3>{metrics.indicators.length ? <div className="space-y-3">{metrics.indicators.map((indicator) => <div key={indicator.name}><div className="mb-1 flex justify-between text-sm"><span>{indicator.name}</span><strong>{indicator.average.toFixed(1)}%</strong></div><div className="h-2 rounded-full bg-indigo-100"><div className="h-2 rounded-full bg-indigo-600" style={{ width: `${Math.min(100, Math.max(0, indicator.average))}%` }} /></div></div>)}</div> : <p className="text-sm text-gray-500">Os indicadores aparecerão após a primeira resposta.</p>}</div>
              <div className="overflow-auto rounded-2xl bg-white shadow-sm"><table className="min-w-full text-left text-sm"><thead className="border-b bg-gray-50"><tr><th className="p-3">Participante</th><th className="p-3">Resultado</th><th className="p-3">Concluído em</th></tr></thead><tbody>{events.map((event) => <tr key={event.id} className="border-b last:border-0"><td className="p-3 font-medium">{event.user_display_name || 'Usuário'}</td><td className="p-3">{percentage(event).toFixed(1)}%</td><td className="p-3 text-gray-500">{new Date(event.executed_at).toLocaleString('pt-BR')}</td></tr>)}</tbody></table></div>
            </>}
          </section>
        </div>
      </main>
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="create-application-title">
          <div className="w-full max-w-lg rounded-2xl border border-white/60 bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4F46E5]">Nova aplicação</p><h2 id="create-application-title" className="mt-1 text-2xl font-bold text-[#1E1B4B]">Criar aplicação de assessment</h2><p className="mt-2 text-sm text-gray-500">Defina o assessment que será aplicado e identifique este evento.</p></div>
              <button type="button" onClick={() => setIsCreateModalOpen(false)} className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-700" aria-label="Fechar modal"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={createSession} className="space-y-5">
              <label className="block text-sm font-semibold text-gray-700">Assessment<select value={form.assessmentId} onChange={(event) => setForm({ ...form, assessmentId: event.target.value })} className="mt-2 w-full rounded-lg border-2 border-gray-200 bg-white p-3 font-normal outline-none transition-colors focus:border-[#4F46E5]">{assessments.map((assessment) => <option key={assessment.id} value={assessment.id}>{assessment.name}</option>)}</select></label>
              <label className="block text-sm font-semibold text-gray-700">Nome da aplicação<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex.: Workshop de agosto" className="mt-2 w-full rounded-lg border-2 border-gray-200 p-3 font-normal outline-none transition-colors focus:border-[#4F46E5]" autoFocus /></label>
              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={saving || !form.assessmentId || !form.name.trim()} className="rounded-lg bg-gradient-to-r from-[#4F46E5] to-[#6366F1] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Criando...' : 'Criar aplicação'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isCloseModalOpen && selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="close-application-title">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="rounded-t-2xl bg-gradient-to-r from-red-500 via-red-600 to-red-700 px-6 py-5">
              <h2 id="close-application-title" className="text-xl font-bold text-white">Encerrar aplicação</h2>
            </div>
            <div className="p-6">
              <p className="text-lg font-semibold text-gray-900">Deseja encerrar esta aplicação?</p>
              <div className="mt-4 rounded-xl border-2 border-red-200 bg-red-50 p-4">
                <p className="font-bold text-red-900">{selectedSession.name}</p>
                <p className="mt-1 text-sm text-red-800">{selectedSession.assessments?.name}</p>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-gray-600">Após o encerramento, novos participantes não serão vinculados a esta aplicação. Os resultados já enviados continuarão disponíveis.</p>
            </div>
            <div className="flex gap-3 rounded-b-2xl border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button type="button" onClick={() => setIsCloseModalOpen(false)} className="flex-1 rounded-lg border-2 border-gray-300 px-4 py-2.5 font-semibold text-gray-700 transition-colors hover:bg-gray-100">Cancelar</button>
              <button type="button" onClick={closeSession} className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-red-700">Encerrar aplicação</button>
            </div>
          </div>
        </div>
      )}
      {isInvitePopoverOpen && selectedSession && selectedSession.status === 'open' && (
        <div className={isInviteFullScreen ? 'fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm' : 'fixed bottom-3 right-3 z-40'} role="dialog" aria-modal={isInviteFullScreen} aria-labelledby="invite-application-title">
          <div className={isInviteFullScreen ? 'max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-white/70 bg-white p-6 shadow-2xl ring-1 ring-black/5 sm:p-10' : 'w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-white/70 bg-white p-5 shadow-2xl ring-1 ring-black/5'}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 id="invite-application-title" className="text-lg font-bold text-[#1E1B4B]">Convidar participantes</h2>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setIsInviteFullScreen((current) => !current)} className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-700" aria-label={isInviteFullScreen ? 'Reduzir convite' : 'Maximizar convite'} title={isInviteFullScreen ? 'Reduzir' : 'Maximizar'}>{isInviteFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</button>
              <button type="button" onClick={() => { setIsInvitePopoverOpen(false); setIsInviteFullScreen(false); }} className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-700" aria-label="Fechar convite"><X className="h-4 w-4" /></button>
            </div>
          </div>
          <div className={isInviteFullScreen ? 'grid grid-cols-1 items-start gap-8 md:grid-cols-2' : ''}>
            <div>
              <div className={`${isInviteFullScreen ? 'aspect-square w-full p-0' : 'p-3'} flex justify-center rounded-xl bg-gray-50`}><img src={qrUrl} alt="QR Code da aplicação" className={`${isInviteFullScreen ? 'h-full w-full' : 'h-[180px] w-[180px]'} rounded-lg bg-white object-contain`} /></div>
              <button type="button" onClick={copyApplicationLink} className={`mx-auto mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-white px-4 py-3 text-sm font-bold uppercase tracking-wider text-indigo-700 transition hover:bg-indigo-50 active:bg-indigo-100 ${isInviteFullScreen ? '' : 'max-w-[20rem]'}`}><Copy className="h-4 w-4" />Copiar link</button>
            </div>
          {isInviteFullScreen && (
            <section className="flex aspect-square min-h-0 flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/80 p-5 shadow-lg backdrop-blur-sm" aria-labelledby="invite-participants-card-title">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50"><Users className="h-5 w-5 text-indigo-600" /></div><div><h3 id="invite-participants-card-title" className="text-lg font-bold text-[#1E1B4B]">Participantes</h3><p className="text-sm text-gray-500">Acompanhamento da aplicação</p></div></div>
                <span className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700">{events.length}</span>
              </div>
              <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-gray-100">
                <table className="min-w-full text-left text-sm"><thead className="border-b bg-gray-50"><tr><th className="p-3">Participante</th><th className="p-3">Resultado</th><th className="p-3">Concluído em</th></tr></thead><tbody>{events.map((event) => <tr key={`invite-${event.id}`} className="border-b last:border-0"><td className="p-3 font-medium text-gray-800">{event.user_display_name || 'Usuário'}</td><td className="p-3 text-gray-700">{percentage(event).toFixed(1)}%</td><td className="p-3 text-gray-500">{new Date(event.executed_at).toLocaleString('pt-BR')}</td></tr>)}</tbody></table>
                {events.length === 0 && <p className="p-6 text-center text-sm text-gray-500">Nenhum participante concluiu ainda.</p>}
              </div>
            </section>
          )}
          </div>
          </div>
        </div>
      )}
      {isLinkCopied && <div className="fixed bottom-5 left-1/2 z-[120] -translate-x-1/2 rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-lg" role="status">Link copiado para a área de transferência.</div>}
    </div>
  );
};

export default ApplicationsAdmin;