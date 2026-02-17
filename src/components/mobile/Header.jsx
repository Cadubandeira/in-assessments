import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import Logo from '../ui/Logo';

const MobileHeader = ({ user }) => {
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
    <header className="md:hidden fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md px-4 py-4 flex items-center justify-between z-50 border-b border-gray-200 w-full min-h-[64px]">
      <Logo size="normal" dark={true} />
      
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
    </header>
  );
};

export default MobileHeader;
