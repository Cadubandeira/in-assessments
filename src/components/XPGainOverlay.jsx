import React, { useState, useEffect } from 'react';
import { Sparkles, Zap } from 'lucide-react';
import { getCurrentLevelProgress, getLevelColor, getLevelBadge } from '../utils/gamificationUtils';

const XPGainOverlay = ({ 
  isVisible, 
  xpGained, 
  totalXP,
  newLevel,
  leveledUp,
  bonuses,
  onClose
}) => {
  const [animateCounter, setAnimateCounter] = useState(false);
  const [animateXPBar, setAnimateXPBar] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Delay pequeno para garantir que o overlay apareceu
      const timer1 = setTimeout(() => {
        setAnimateCounter(true);
      }, 300);

      const timer2 = setTimeout(() => {
        setAnimateXPBar(true);
      }, 1500);

      const timer3 = setTimeout(() => {
        onClose();
      }, 12000);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [isVisible, onClose]);

  const levelProgress = getCurrentLevelProgress(totalXP);
  const currentLevel = levelProgress.level;
  const progressPercentage = levelProgress.progressPercentage;

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border border-indigo-200/60 rounded-3xl p-8 sm:p-12 shadow-2xl max-w-md w-full relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"></div>

        <div className="relative z-10 text-center">
          {/* XP Gained Icon */}
          <div 
            className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl mx-auto mb-6"
            style={{
              animation: animateCounter ? 'pulse 0.6s ease-out' : 'none'
            }}
          >
            <Zap className="w-10 h-10 text-white" strokeWidth={2.5} fill="currentColor" />
          </div>

          {/* XP Gained Counter */}
          <div className="mb-8">
            <p className="text-sm font-bold uppercase tracking-widest text-indigo-700 mb-2">Experiência Ganha</p>
            <div 
              className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600"
              style={{
                opacity: animateCounter ? 1 : 0,
                transform: animateCounter ? 'scale(1)' : 'scale(0.5)',
                transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                textShadow: animateCounter ? '0 0 20px rgba(99, 102, 241, 0.4)' : 'none'
              }}
            >
              +{xpGained} XP
            </div>
          </div>

          {/* Level Info */}
          <div className="mb-6 p-6 bg-white/80 rounded-2xl backdrop-blur-sm">
            <div className={`flex flex-col gap-4 ${leveledUp ? 'mb-4' : ''}`}>
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-bold">Seu Nível Atual</p>
                <p className="text-5xl font-black text-[#1E1B4B]">{currentLevel}</p>
              </div>
              <div 
                className="text-center p-4 rounded-xl"
                style={{ backgroundColor: getLevelColor(currentLevel) }}
              >
                <p className="text-xs font-bold text-white/90 uppercase tracking-wider mb-1">Classificação</p>
                <p className="text-lg font-bold text-white">{getLevelBadge(currentLevel)}</p>
              </div>
            </div>

            {leveledUp && (
              <div className="mt-4 p-3 bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-400 rounded-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0" />
                <p className="text-sm font-bold text-purple-900">Parabéns! Você subiu de nível!</p>
              </div>
            )}
          </div>

          {/* XP Progress */}
          <div className={bonuses && bonuses.length > 0 ? 'mb-6' : 'mb-8'}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Progresso para próx. nível</p>
                <p className="text-lg font-bold text-[#4F46E5]">{Math.round(progressPercentage)}%</p>
              </div>
              <p className="text-sm text-gray-600 text-right font-medium">
                {totalXP} / {levelProgress.nextLevelThreshold} XP
              </p>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-md">
              <div 
                className="bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] h-3 rounded-full transition-all duration-[2000ms] ease-out"
                style={{ 
                  width: animateXPBar ? `${progressPercentage}%` : '0%',
                  boxShadow: animateXPBar ? '0 0 15px rgba(79, 70, 229, 0.6)' : 'none'
                }}
              />
            </div>
          </div>

          {/* Bonus Highlights */}
          {bonuses && bonuses.length > 0 && (
            <div className="mb-8 space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-700 mb-3">Bônus Alcançados</p>
              {bonuses.map((bonus, idx) => (
                <div 
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/70 border border-indigo-200/50"
                  style={{
                    opacity: animateCounter ? 1 : 0,
                    transform: animateCounter ? 'translateY(0)' : 'translateY(10px)',
                    transition: `all 0.6s ease-out ${0.1 * (idx + 1)}s`
                  }}
                >
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-[#1E1B4B]">{bonus.label}</p>
                  </div>
                  <p className="font-bold text-indigo-600">+{bonus.xp} XP</p>
                </div>
              ))}
            </div>
          )}

          {/* Close Button */}
          <p className="text-xs text-gray-500 animate-pulse">Clique em qualquer lugar ou aguarde para fechar</p>
        </div>
      </div>
    </div>
  );
};

export default XPGainOverlay;
