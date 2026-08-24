import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { TOKENS } from '../config/tokens';
import LoginScreen from './LoginScreen';

const ApplicationSession = ({ user }) => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [authenticatedUser, setAuthenticatedUser] = useState(user || null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [existingResultCheckedKey, setExistingResultCheckedKey] = useState(null);
  const [existingResultId, setExistingResultId] = useState(null);
  const [error, setError] = useState(null);

  const currentUser = user || authenticatedUser;
  const existingResultKey = currentUser && session ? `${currentUser.id}:${session.id}` : null;

  useEffect(() => {
    if (token) {
      sessionStorage.setItem('auth_return_path', `/apply/${token}`);
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted && data?.session?.user) setAuthenticatedUser(data.session.user);
    });

    const { data: authSubscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setAuthenticatedUser(nextSession?.user || null);
    });

    return () => {
      mounted = false;
      authSubscription?.subscription?.unsubscribe();
    };
  }, [token]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data, error: sessionError } = await supabase
        .rpc('get_application_session', { p_token: token });
      if (!mounted) return;
      const nextSession = Array.isArray(data) ? data[0] : data;
      if (sessionError || !nextSession) {
        setError('Esta sessão de aplicação não existe ou não está disponível.');
      } else {
        setSession(nextSession);
      }
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, [token]);

  useEffect(() => {
    if (!currentUser || !session || existingResultCheckedKey !== existingResultKey) return;

    if (existingResultId) {
      sessionStorage.removeItem('auth_return_path');
      navigate(`/results/${existingResultId}`, { replace: true });
      return;
    }

    if (session.status === 'open' && (!session.expires_at || new Date(session.expires_at) > new Date())) {
      sessionStorage.removeItem('auth_return_path');
      navigate(`/assessment/${session.assessment_id}?application_session=${encodeURIComponent(token)}`, { replace: true });
    }
  }, [currentUser, session, existingResultCheckedKey, existingResultKey, existingResultId, token, navigate]);

  useEffect(() => {
    if (!currentUser || !session) return undefined;

    let mounted = true;
    supabase
      .from('assessment_events')
      .select('id')
      .eq('application_session_id', session.id)
      .eq('user_id', currentUser.id)
      .maybeSingle()
      .then(({ data, error: resultError }) => {
        if (!mounted) return;
        if (resultError) setError(resultError.message || 'Não foi possível verificar sua resposta.');
        setExistingResultId(data?.id || null);
        setExistingResultCheckedKey(existingResultKey);
      });

    return () => { mounted = false; };
  }, [currentUser, session, existingResultKey]);

  const handleAuthenticated = async () => {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.user) {
      setAuthenticatedUser(data.session.user);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F5F3EC]">Carregando aplicação...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center bg-[#F5F3EC] p-6"><p className="text-red-600 text-center">{error}</p></div>;

  if (!currentUser) {
    return (
      <div>
        <div className="fixed top-4 left-4 z-20 rounded-lg bg-white/90 px-3 py-2 text-sm font-semibold text-[#1E1B4B] shadow-sm">
          Aplicação: {session.name}
        </div>
        <LoginScreen onAuthenticated={handleAuthenticated} />
      </div>
    );
  }

  if (existingResultCheckedKey !== existingResultKey) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F5F3EC]">Verificando sua participação...</div>;
  }

  if (session.status !== 'open' || (session.expires_at && new Date(session.expires_at) <= new Date())) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F3EC] p-6">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <h1 className={`${TOKENS.fonts.serif} text-3xl text-[#1E1B4B]`}>Aplicação encerrada</h1>
          <p className="mt-3 text-gray-600">Esta sessão foi encerrada. Você ainda pode responder o assessment individualmente.</p>
          <button
            type="button"
            onClick={() => navigate(`/assessment/${session.assessment_id}`)}
            className="mt-6 rounded-lg bg-[#4F46E5] px-5 py-3 font-semibold text-white"
          >
            Responder individualmente
          </button>
        </div>
      </div>
    );
  }

  return <div className="min-h-screen flex items-center justify-center bg-[#F5F3EC]">Abrindo assessment...</div>;
};

export default ApplicationSession;