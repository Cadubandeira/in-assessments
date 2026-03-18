import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Zap, History, Users, Settings } from 'lucide-react';

const MobileBottomNav = ({ onStartAssessment, role }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;
  const isCommunityActive = location.pathname.startsWith('/comunidade');

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg px-2 sm:px-4 py-3 flex justify-around items-center z-50 border-t border-gray-200 w-full">
      <button 
        onClick={() => navigate('/dashboard')}
        className={`${isActive('/dashboard') ? 'text-[#4F46E5]' : 'text-gray-500'} flex flex-col items-center gap-1`}
      >
        <Home className="w-6 h-6" />
        <span className="text-[10px] font-bold">Início</span>
      </button>
      
      <button 
        onClick={() => navigate('/activities')}
        className={`${isActive('/activities') ? 'text-[#4F46E5]' : 'text-gray-500'} flex flex-col items-center gap-1`}
      >
        <Zap className="w-6 h-6" />
        <span className="text-[10px] font-bold">Atividades</span>
      </button>
      
      <button 
        onClick={() => navigate('/history')}
        className={`${isActive('/history') ? 'text-[#4F46E5]' : 'text-gray-500'} flex flex-col items-center gap-1`}
      >
        <History className="w-6 h-6" />
        <span className="text-[10px] font-bold">Histórico</span>
      </button>
      
      {role === 'admin' && (
        <button 
          onClick={() => navigate('/comunidade')}
          className={`${isCommunityActive ? 'text-[#4F46E5]' : 'text-gray-500'} flex flex-col items-center gap-1`}
        >
          <Users className="w-6 h-6" />
          <span className="text-[10px] font-bold">Comunidade</span>
        </button>
      )}

      {role === 'admin' && (
        <button 
          onClick={() => navigate('/admin/management')}
          className={`${isActive('/admin/management') ? 'text-[#4F46E5]' : 'text-gray-500'} flex flex-col items-center gap-1`}
        >
          <Settings className="w-6 h-6" />
          <span className="text-[10px] font-bold">Gestão</span>
        </button>
      )}
    </div>
  );
};

export default MobileBottomNav;
