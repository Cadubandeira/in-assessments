import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { TOKENS } from '../config/tokens';
import Button from '../components/ui/Button';
import Logo from '../components/ui/Logo';
import { ArrowRight } from 'lucide-react';

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
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
      {/* Elementos Decorativos de Fundo */}
      <div className="absolute top-[-10%] right-[-5%] w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-[#4F46E5]/20 rounded-full blur-3xl pointer-events-none animate-blob" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-[#312E81]/20 rounded-full blur-3xl pointer-events-none animate-blob animation-delay-2000" />
      <div className="absolute top-[40%] left-[20%] w-[250px] h-[250px] md:w-[400px] md:h-[400px] bg-[#C7D2FE]/30 rounded-full blur-3xl pointer-events-none animate-blob animation-delay-4000" />

      {/* Lado Esquerdo / Topo: Branding e Mensagem */}
      <div className="flex-1 p-8 md:p-16 lg:p-24 flex flex-col justify-between z-10">
        <div className="animate-in fade-in slide-in-from-top-4 duration-700">
          <Logo size="large" />
        </div>
        
        <div className="mt-12 md:mt-0 animate-in fade-in slide-in-from-left-4 duration-1000 delay-100">
          <h1 className={`${TOKENS.fonts.serif} text-5xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight text-[#1E1B4B]`}>
            Autoconhecimento,<br/>
            <span className="text-[#4F46E5] italic">potencial</span><br/>
            & transformação.
          </h1>
          <p className="mt-6 text-lg md:text-xl text-[#64748B] max-w-md leading-relaxed" style={{ paddingBottom: '2rem' }}>
            Avaliações de conhecimentos, habilidades e atitudes. Contém o necessário para profissionais conscientes.
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
                <span className="font-sans text-[#1E1B4B]">Continuar com Google</span>
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

export default LoginScreen;