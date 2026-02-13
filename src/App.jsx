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

/**
 * DESIGN TOKENS
 * Centralização da identidade visual para fácil manutenção.
 */
const TOKENS = {
  colors: {
    bg: "bg-[#EEF2FF]", // Indigo 50 (Tom mais azulado/frio)
    surface: "bg-white",
    ink: "text-[#1E1B4B]", // Indigo 950
    muted: "text-[#64748B]", // Slate 500
    accent: "text-[#4F46E5]", // Indigo 600
    accentBg: "bg-[#4F46E5]",
    forest: "bg-[#312E81]", // Indigo 900
    border: "border-[#C7D2FE]" // Indigo 200
  },
  fonts: {
    serif: "font-serif", // 'DM Serif Display'
    sans: "font-sans"    // 'Inter'
  }
};

// --- BASE DE DADOS MOCK (Simulando resposta do Back-end) ---
const INDICATORS = ["Liderança", "Comunicação", "Resiliência", "Foco", "Inteligência Emocional"];

// --- COMPONENTES ATÔMICOS ---

const Button = ({ children, variant = 'primary', icon: Icon, className = '', ...props }) => {
  const variants = {
    primary: `${TOKENS.colors.accentBg} text-white hover:opacity-90`,
    secondary: `bg-transparent border ${TOKENS.colors.border} ${TOKENS.colors.ink} hover:bg-black/5`,
    outline: `border ${TOKENS.colors.border} ${TOKENS.colors.ink} hover:bg-[#F5F3EC]`
  };

  return (
    <button 
      className={`flex items-center justify-center gap-2 px-6 py-3 rounded-full font-medium transition-all active:scale-95 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
      {Icon && <Icon className="w-4 h-4" />}
    </button>
  );
};

const Logo = ({ size = 'normal', className = '', dark = true }) => {
  const textSize = size === 'large' ? 'text-5xl md:text-6xl' : 'text-2xl';
  const subTextSize = size === 'large' ? 'text-sm md:text-base' : 'text-[10px]';
  const textColor = dark ? 'text-[#1E1B4B]' : 'text-white';
  const accentColor = dark ? 'text-[#4F46E5]' : 'text-white';
  
  return (
    <div className={`flex flex-col justify-center select-none ${className}`}>
      <div className="flex items-baseline gap-1">
        <span className={`font-['Dancing_Script'] ${textSize} ${textColor} font-bold leading-none`}>In</span>
        <span className={`font-sans ${subTextSize} ${textColor} font-bold uppercase tracking-[0.3em] self-end mb-1.5 md:mb-2`}>Assessments</span>
        <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${accentColor.replace('text-', 'bg-')} self-end mb-1.5 md:mb-2 animate-pulse`} />
      </div>
    </div>
  );
};

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

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [emailMode, setEmailMode] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    // Constrói a URL correta: Origem + Base do Projeto (ex: https://dominio.com/in-assessments/)
    const redirectUrl = window.location.origin + import.meta.env.BASE_URL;
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    });
    if (error) alert(error.message);
    setLoading(false);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    let error;
    if (isSignUp) {
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      error = signUpError;
      if (!error) alert('Verifique seu e-mail para confirmar o cadastro!');
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      error = signInError;
    }
    if (error) alert(error.message);
    setLoading(false);
  };

  return (
    <div className={`min-h-screen ${TOKENS.colors.bg} flex flex-col md:flex-row relative overflow-hidden`}>
      {/* Elementos Decorativos de Fundo */}
      <div className="absolute top-[-10%] right-[-5%] w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-[#4F46E5]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-[#312E81]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Lado Esquerdo / Topo: Branding e Mensagem */}
      <div className="flex-1 p-8 md:p-16 lg:p-24 flex flex-col justify-between z-10">
        <div className="animate-in fade-in slide-in-from-top-4 duration-700">
          <Logo size="large" />
        </div>
        
        <div className="mt-12 md:mt-0 animate-in fade-in slide-in-from-left-4 duration-1000 delay-100">
          <h1 className={`${TOKENS.fonts.serif} text-5xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight text-[#1E1B4B]`}>
            Revele o <br/>
            <span className="text-[#4F46E5] italic">potencial</span> <br/>
            oculto.
          </h1>
          <p className="mt-6 text-lg md:text-xl text-[#64748B] max-w-md leading-relaxed">
            Avaliações de inteligência emocional e liderança para o profissional contemporâneo.
          </p>
        </div>

        <div className="hidden md:block text-sm text-[#94A3B8] animate-in fade-in duration-1000 delay-300">
          © {new Date().getFullYear()} In Assessments. All rights reserved.
        </div>
      </div>

      {/* Lado Direito / Bottom Sheet: Área de Login */}
      <div className="md:w-[480px] lg:w-[560px] bg-white/60 backdrop-blur-2xl border-t md:border-t-0 md:border-l border-[#C7D2FE] p-8 md:p-16 flex flex-col justify-center shadow-[0_-10px_40px_rgba(0,0,0,0.05)] md:shadow-none z-20 rounded-t-[2.5rem] md:rounded-none mt-[-2rem] md:mt-0 transition-all">
        <div className="w-full max-w-sm mx-auto">
          {!emailMode ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
              <div className="text-center md:text-left">
                <h2 className={`${TOKENS.fonts.serif} text-3xl mb-2`}>Bem-vindo</h2>
                <p className={TOKENS.colors.muted}>Faça login para acessar sua conta.</p>
              </div>
              
              <Button 
                type="button" 
                className="w-full py-3.5 text-base font-medium shadow-md hover:shadow-lg hover:bg-gray-50 transition-all duration-300 bg-white text-[#374151] border border-gray-200 flex items-center justify-center gap-3" 
                onClick={handleGoogleLogin}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span className="font-sans">Continuar com Google</span>
              </Button>

              <div className="pt-4 text-center">
                <button 
                  onClick={() => setEmailMode(true)} 
                  className="text-sm font-medium text-[#64748B] hover:text-[#1E1B4B] transition-colors border-b border-transparent hover:border-[#1E1B4B]"
                >
                  Entrar com e-mail
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
              <button onClick={() => setEmailMode(false)} className="text-[#64748B] hover:text-[#1E1B4B] flex items-center gap-2 text-sm mb-4 group">
                <span className="group-hover:-translate-x-1 transition-transform">&larr;</span> Voltar
              </button>
              
              <h2 className={`${TOKENS.fonts.serif} text-3xl mb-2`}>{isSignUp ? 'Criar conta' : 'Entrar'}</h2>

              <form onSubmit={handleAuth} className="space-y-4">
                <input 
                  type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full p-4 rounded-xl border border-[#C7D2FE] bg-white/50 focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] outline-none transition-all" required
                />
                <input 
                  type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full p-4 rounded-xl border border-[#C7D2FE] bg-white/50 focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] outline-none transition-all" required
                />
                <Button type="submit" className="w-full py-4 text-lg shadow-lg" icon={ArrowRight}>
                  {isSignUp ? 'Cadastrar' : 'Acessar'}
                </Button>
              </form>
              
              <div className="text-center mt-6">
                <button onClick={() => setIsSignUp(!isSignUp)} className="text-sm text-[#64748B]">
                  {isSignUp ? 'Já tem uma conta? ' : 'Ainda não tem conta? '}
                  <span className="text-[#4F46E5] font-semibold hover:underline">{isSignUp ? 'Faça Login' : 'Cadastre-se'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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