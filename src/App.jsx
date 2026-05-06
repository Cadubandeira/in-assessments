import React, { useState, useEffect } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { 
  LogOut, 
  ArrowRight,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { TOKENS } from './config/tokens';
import Logo from './components/ui/Logo';
import Button from './components/ui/Button';
import MobileHeader from './components/mobile/Header';
import DesktopHeader from './components/desktop/Header';
import MobileBottomNav from './components/mobile/BottomNav';
import { useUserRole } from './hooks/useUserRole';
import { canUserTakeAssessment } from './utils/assessmentRules';
import LoginScreen from './pages/LoginScreen';
import Dashboard from './pages/Dashboard';
import Assessment from './pages/Assessment';
import Results from './pages/Results';
import PublicResults from './pages/PublicResults';
import History from './pages/History';
import Activities from './pages/Activities';
import RealScenarios from './pages/RealScenarios';
import Community from './pages/Community';
import CommunityFeed from './pages/community/CommunityFeed';
import CommunityProfile from './pages/community/CommunityProfile';
import CommunityFollowing from './pages/community/CommunityFollowing';
import CommunityNotifications from './pages/community/CommunityNotifications';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import IndicatorsAdmin from './pages/admin/IndicatorsAdmin';
import AssessmentBuilder from './pages/admin/AssessmentBuilder';
import Management from './pages/admin/Management';
import Panel from './pages/admin/Panel';

// Scroll to top on route change
const ScrollToTop = () => {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return null;
};

const AssessmentRunner = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssessment = async () => {
      const { data } = await supabase.from('assessments').select('*').eq('id', id).single();
      setAssessment(data);
      setLoading(false);
    };
    fetchAssessment();
  }, [id]);

  const handleAnswer = async (val) => {
    const questionId = assessment.questions[currentQuestionIdx].id;
    const nextAnswers = { ...answers, [questionId]: val };
    setAnswers(nextAnswers);
    
    if (currentQuestionIdx < assessment.questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
    } else {
      // Salvar e navegar
      setLoading(true);
      navigate('/results');
    }
  };

  if (loading) return <div className="p-20 text-center">Carregando teste...</div>;
  if (!assessment) return <div className="p-20 text-center">Teste não encontrado.</div>;
  // Proteção contra estrutura de dados antiga ou incompleta
  if (!assessment.questions || !assessment.questions.length) return <div className="p-20 text-center">Dados do assessment incompletos ou formato incompatível.</div>;

  const question = assessment.questions[currentQuestionIdx];
  const progress = ((currentQuestionIdx + 1) / assessment.questions.length) * 100;

    return (
      <div className="max-w-2xl mx-auto px-6 py-20">
        <div className="mb-12 text-center md:text-left">
          <div className="w-full bg-[#C7D2FE] h-1 rounded-full mb-8">
            <div className="bg-[#4F46E5] h-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
          </div>
          <span className="text-[#4F46E5] font-bold text-xs uppercase tracking-[0.2em]">{question.indicator}</span>
          <h2 className={`${TOKENS.fonts.serif} text-3xl md:text-4xl mt-4 leading-tight`}>{question.text}</h2>
        </div>
        <div className="space-y-4">
          {question.options?.map((opt, i) => (
            <button 
              key={i} 
              onClick={() => handleAnswer(opt.value)}
              className="w-full text-left p-6 border border-[#C7D2FE] bg-white rounded-2xl hover:border-[#1E1B4B] hover:shadow-md transition-all active:scale-[0.98] group"
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium text-[#1E1B4B]">{opt.text}</span>
                <ChevronRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity text-[#4F46E5]" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

const ResultsSummary = () => {
  const navigate = useNavigate();
  return (
    <div className="max-w-2xl mx-auto px-6 py-20 text-center">
      <div className="inline-flex items-center justify-center w-24 h-24 bg-[#312E81] text-white rounded-full mb-8 shadow-2xl animate-bounce">
        <CheckCircle2 className="w-12 h-12" />
      </div>
      <h2 className={`${TOKENS.fonts.serif} text-5xl mb-4`}>Teste Concluído!</h2>
      <p className={`${TOKENS.colors.muted} mb-12 text-lg`}>Seus dados foram processados com sucesso. Os indicadores do seu dashboard já foram atualizados.</p>
      <Button onClick={() => navigate('/dashboard')} icon={ArrowRight} className="mx-auto shadow-xl">
        Voltar ao Dashboard
      </Button>
    </div>
  );
};

// --- LAYOUT PROTEGIDO ---
const ProtectedLayout = ({ user, children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useUserRole();
  const search = new URLSearchParams(location.search || '');
  const isPdfMode = search.get('pdf') === '1' || search.get('hideHeader') === '1';
  const routePersistenceKey = location.pathname.startsWith('/comunidade')
    ? '/comunidade'
    : location.pathname;

  if (!user) return <Navigate to="/" replace />;
  if (location.pathname.startsWith('/comunidade') && role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  if (location.pathname.startsWith('/activities/real-scenarios') && role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const handleStart = () => {
    if (!canUserTakeAssessment([], role)) {
      alert('Você não pode iniciar um novo assessment no momento.');
      return;
    }
    navigate('/assessment/active');
  };

  return (
    <div className={`min-h-screen ${TOKENS.colors.bg} pb-20 md:pb-0`}>
      {!isPdfMode && <MobileHeader user={user} role={role} />}
      {!isPdfMode && <DesktopHeader user={user} role={role} onStartAssessment={handleStart} />}
      <main key={routePersistenceKey} className={isPdfMode ? '' : 'pt-[72px]'}>
        {children}
      </main>
      {!isPdfMode && <MobileBottomNav onStartAssessment={handleStart} role={role} />}
    </div>
  );
};

// --- APLICAÇÃO PRINCIPAL ---

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession()
      .then(res => {
        const session = res?.data?.session ?? null;
        if (!mounted) return;
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch(err => {
        console.error('supabase.getSession error', err);
        if (mounted) setLoading(false);
      });

    const listener = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      try {
        // Compatibilidade com diferentes formatos de retorno do listener
        const sub = listener?.data?.subscription ?? listener?.subscription ?? listener;
        if (sub && typeof sub.unsubscribe === 'function') {
          sub.unsubscribe();
        }
      } catch (e) {
        console.warn('Erro ao limpar listener de auth:', e);
      }
    };
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F5F3EC]">Carregando...</div>;

  return (
    <HashRouter>
      <ScrollToTop />
      <ErrorBoundary>
      <div className={`min-h-screen ${TOKENS.colors.bg} ${TOKENS.colors.ink} selection:bg-[#4F46E5] selection:text-white`}>
        
        <Routes>
          {/* Public results page, no authentication required */}
          <Route path="/public-results/:id" element={<PublicResults />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/login" element={!user ? <Navigate to="/" replace /> : <Navigate to="/dashboard" replace />} />
          <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LoginScreen />} />
          
          <Route path="/dashboard" element={<ProtectedLayout user={user}><Dashboard user={user} /></ProtectedLayout>} />
          <Route path="/activities" element={<ProtectedLayout user={user}><Activities /></ProtectedLayout>} />
          <Route path="/activities/real-scenarios" element={<ProtectedLayout user={user}><RealScenarios /></ProtectedLayout>} />
          <Route path="/activities/real-scenarios/:scenarioId" element={<ProtectedLayout user={user}><RealScenarios /></ProtectedLayout>} />
          <Route path="/assessments" element={<Navigate to="/activities" replace />} />
          <Route path="/assessment/active" element={<ProtectedLayout user={user}><Assessment /></ProtectedLayout>} />
          <Route path="/assessment/:id" element={<ProtectedLayout user={user}><Assessment /></ProtectedLayout>} />
          <Route path="/results" element={<ProtectedLayout user={user}><Results /></ProtectedLayout>} />
          <Route path="/results/:id" element={<ProtectedLayout user={user}><Results /></ProtectedLayout>} />
          <Route path="/history" element={<ProtectedLayout user={user}><History /></ProtectedLayout>} />
          <Route path="/comunidade" element={<ProtectedLayout user={user}><Community user={user} /></ProtectedLayout>}>
            <Route index element={<Navigate to="feed" replace />} />
            <Route path="feed" element={<CommunityFeed user={user} />} />
            <Route path="perfil" element={<CommunityProfile user={user} />} />
            <Route path="seguindo" element={<CommunityFollowing user={user} />} />
            <Route path="notificacoes" element={<CommunityNotifications user={user} />} />
          </Route>
          <Route path="/admin/management" element={<ProtectedLayout user={user}><Management user={user} /></ProtectedLayout>} />
          <Route path="/admin/panel" element={<ProtectedLayout user={user}><Panel user={user} /></ProtectedLayout>} />
          <Route path="/admin/indicators" element={<ProtectedLayout user={user}><IndicatorsAdmin /></ProtectedLayout>} />
          <Route path="/admin/assessments/builder" element={<ProtectedLayout user={user}><AssessmentBuilder /></ProtectedLayout>} />
          <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} replace />} />
        </Routes>
      </div>
      </ErrorBoundary>
    </HashRouter>
  );
}