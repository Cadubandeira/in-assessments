import React, { useState, useMemo, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { 
  BarChart3, 
  ClipboardList, 
  LogOut, 
  ArrowRight,
  Sparkles,
  Download,
  Share2,
  ChevronRight,
  TrendingUp,
  Award,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { TOKENS } from './config/tokens';
import Logo from './components/ui/Logo';
import Button from './components/ui/Button';
import LoginScreen from './pages/LoginScreen';


// --- BASE DE DADOS MOCK (Simulando resposta do Back-end) ---
const INDICATORS = ["Liderança", "Comunicação", "Resiliência", "Foco", "Inteligência Emocional"];

// --- COMPONENTES ATÔMICOS ---

const AssessmentCard = ({ assessment, onStart }) => (
  <div className={`group p-8 border ${TOKENS.colors.border} ${TOKENS.colors.surface} rounded-2xl flex flex-col h-full transition-all hover:border-[#4F46E5] shadow-sm hover:shadow-md`}>
    <div className="flex-grow">
      <div className="flex flex-wrap gap-2 mb-6">
        {assessment.indicators.map(ind => (
          <span key={ind} className="px-2 py-0.5 bg-[#EEF2FF] text-[10px] font-bold uppercase tracking-widest text-[#64748B]">
            {ind}
          </span>
        ))}
      </div>
      <h3 className={`${TOKENS.fonts.serif} text-2xl mb-3 leading-tight`}>{assessment.title}</h3>
      <p className={`${TOKENS.colors.muted} text-sm mb-8 leading-relaxed`}>{assessment.description}</p>
    </div>
    <div className="flex items-center justify-between mt-auto">
      <span className="text-[10px] font-bold uppercase tracking-tighter text-[#A3A098]">{assessment.duration}</span>
      <button 
        onClick={() => onStart(assessment)}
        className={`w-10 h-10 rounded-full ${TOKENS.colors.accentBg} text-white flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg`}
      >
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  </div>
);

// --- PÁGINAS E COMPONENTES ---

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const isActive = (path) => location.pathname === path;

  return (
    <nav className={`h-20 border-b ${TOKENS.colors.border} ${TOKENS.colors.bg} sticky top-0 z-10 px-6`}>
      <div className="max-w-6xl mx-auto flex h-full items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <Logo />
        </div>
        <div className="flex items-center gap-8">
          <button 
            onClick={() => navigate('/dashboard')} 
            className={`text-sm font-medium transition-colors ${isActive('/dashboard') ? 'text-[#4F46E5]' : 'text-[#64748B] hover:text-[#1E1B4B]'}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => navigate('/assessments')} 
            className={`text-sm font-medium transition-colors ${isActive('/assessments') ? 'text-[#4F46E5]' : 'text-[#64748B] hover:text-[#1E1B4B]'}`}
          >
            Testes
          </button>
          <button onClick={() => supabase.auth.signOut()} className="text-[#64748B] hover:text-[#4F46E5]">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  );
};

const Dashboard = ({ user }) => (
    <div className="max-w-6xl mx-auto p-6 py-12">
      <header className="mb-12">
        <h1 className={`${TOKENS.fonts.serif} text-5xl mb-4`}>Olá, {user.email?.split('@')[0]}.</h1>
        <p className={TOKENS.colors.muted}>Seu progresso atualizado conforme suas últimas avaliações.</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className={`md:col-span-2 p-8 border ${TOKENS.colors.border} bg-white rounded-2xl h-80 flex flex-col justify-center items-center text-center shadow-sm`}>
          <BarChart3 className="w-12 h-12 text-[#C7D2FE] mb-4" />
          <p className="text-[#94A3B8] font-medium italic">Gráfico de Evolução (Em breve)</p>
        </div>
        <div className={`p-8 border ${TOKENS.colors.border} bg-white rounded-2xl shadow-sm`}>
          <h3 className={`${TOKENS.fonts.serif} text-xl mb-6`}>Indicadores</h3>
          <div className="space-y-6">
            {INDICATORS.slice(0, 3).map(ind => (
              <div key={ind}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">{ind}</span>
                  <span className="font-serif">8.5</span>
                </div>
                <div className="w-full bg-[#EEF2FF] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#312E81] h-full w-[85%] rounded-full"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

const AssessmentsList = () => {
  const [assessments, setAssessments] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('assessments').select('*');
      if (data) setAssessments(data);
    };
    fetch();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 py-12">
      <h2 className={`${TOKENS.fonts.serif} text-4xl mb-8`}>Assessments Disponíveis</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {assessments.map(a => (
          <AssessmentCard key={a.id} assessment={a} onStart={() => navigate(`/assessment/${a.id}`)} />
        ))}
      </div>
    </div>
  );
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
      await supabase.from('user_assessments').insert({
        user_id: user.id,
        assessment_id: assessment.id,
        answers: nextAnswers
      });
      navigate('/results');
    }
  };

  if (loading) return <div className="p-20 text-center">Carregando teste...</div>;
  if (!assessment) return <div className="p-20 text-center">Teste não encontrado.</div>;

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
          {question.options.map((opt, i) => (
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
  if (!user) return <Navigate to="/login" replace />;
  return (
    <>
      <Header />
      <main className="animate-in fade-in slide-in-from-bottom-2 duration-700">
        {children}
      </main>
    </>
  );
};

// --- APLICAÇÃO PRINCIPAL ---

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F5F3EC]">Carregando...</div>;

  return (
    <HashRouter>
      <div className={`min-h-screen ${TOKENS.colors.bg} ${TOKENS.colors.ink} selection:bg-[#4F46E5] selection:text-white`}>
        <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&family=DM+Serif+Display&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
        
        <Routes>
          <Route path="/login" element={!user ? <LoginScreen /> : <Navigate to="/dashboard" />} />
          <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
          
          <Route path="/dashboard" element={<ProtectedLayout user={user}><Dashboard user={user} /></ProtectedLayout>} />
          <Route path="/assessments" element={<ProtectedLayout user={user}><AssessmentsList /></ProtectedLayout>} />
          <Route path="/assessment/:id" element={<ProtectedLayout user={user}><AssessmentRunner user={user} /></ProtectedLayout>} />
          <Route path="/results" element={<ProtectedLayout user={user}><ResultsSummary /></ProtectedLayout>} />
        </Routes>
      </div>
    </HashRouter>
  );
}