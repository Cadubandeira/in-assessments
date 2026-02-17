import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, LogOut, Settings, TrendingUp, Users, Zap } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import Logo from '../ui/Logo';

const DesktopHeader = ({ user, role, onStartAssessment }) => {
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Usuário';
  const userInitial = displayName.charAt(0).toUpperCase();

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <header className="hidden md:block fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-gray-200 z-50 w-full min-h-[72px]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <Logo size="normal" dark={true} />

        <div className="flex items-center gap-6">
          <nav className="flex items-center gap-6 text-sm font-semibold text-gray-600">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 hover:text-[#4F46E5] transition-colors"
            >
              <Home className="w-5 h-5" />
              <span>Início</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/assessments')}
              className="flex items-center gap-2 hover:text-[#4F46E5] transition-colors"
            >
              <Zap className="w-5 h-5" />
              <span>Atividades</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/history')}
              className="flex items-center gap-2 hover:text-[#4F46E5] transition-colors"
            >
              <TrendingUp className="w-5 h-5" />
              <span>Evolução</span>
            </button>
            <button
              type="button"
              className="flex items-center gap-2 hover:text-[#4F46E5] transition-colors"
            >
              <Users className="w-5 h-5" />
              <span>Comunidade</span>
            </button>
            {role === 'admin' && (
              <button
                type="button"
                onClick={() => navigate('/admin/management')}
                className="flex items-center gap-2 hover:text-[#4F46E5] transition-colors"
              >
                <Settings className="w-5 h-5" />
                <span>Gestão</span>
              </button>
            )}
          </nav>

          <div className="relative user-menu-container">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-11 h-11 rounded-full bg-gradient-to-br from-[#4F46E5] to-[#6366F1] text-white font-bold flex items-center justify-center hover:scale-105 transition-transform"
            >
              {userInitial}
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-12 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[160px] animate-in fade-in slide-in-from-top-2 duration-200">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default DesktopHeader;
