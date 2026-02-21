import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Zap, Trophy, Target, TrendingUp, Heart, Zap as ZapIcon } from 'lucide-react';
import { getCurrentLevelProgress, getLevelBadge, getLevelColor } from '../utils/gamificationUtils';

/**
 * Scenario XP Overlay Component
 * Exibe recompensa XP após conclusão de simulação com breakdown de bônus
 */
const ScenarioXPOverlay = ({ 
  isVisible, 
  xpData,
  totalXP,
  onClose
}) => {
  const [xpBarWidth, setXpBarWidth] = useState(0);
  const [animationPhase, setAnimationPhase] = useState('idle'); // 'idle' | 'filling' | 'fading-out' | 'level-up-badge' | 'level-up-show' | 'fading-badge' | 'show-bar' | 'reset-bar'
  const [displayLevel, setDisplayLevel] = useState(null);
  const [barOpacity, setBarOpacity] = useState(1);

  const safeXpData = xpData || {
    baseXP: 0,
    bonuses: {},
    breakdown: [],
    totalXP: 0
  };

  const { baseXP, bonuses, breakdown, totalXP: earnedXP } = safeXpData;

  const levelProgress = getCurrentLevelProgress(totalXP);
  const currentLevel = levelProgress.level;
  const progressPercentage = levelProgress.progressPercentage;
  const previousTotalXP = Math.max(totalXP - earnedXP, 0);
  const previousLevelProgress = getCurrentLevelProgress(previousTotalXP);
  const previousProgressPercentage = previousLevelProgress.level === currentLevel
    ? previousLevelProgress.progressPercentage
    : 0;
  const clampedProgress = Math.max(0, Math.min(100, progressPercentage));
  const clampedPreviousProgress = Math.max(0, Math.min(100, previousProgressPercentage));
  const previousLevel = previousLevelProgress.level;
  const hasLeveledUp = previousLevel < currentLevel;

  // Prevent body scroll when overlay is visible
  useEffect(() => {
    if (isVisible) {
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalWidth = document.body.style.width;
      
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'relative';
      document.body.style.width = '100%';
      
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.width = originalWidth;
      };
    }
  }, [isVisible]);

  useEffect(() => {
    if (isVisible && xpData) {
      setXpBarWidth(clampedPreviousProgress);
      setDisplayLevel(previousLevel);
      setAnimationPhase('filling');
      setBarOpacity(1);

      // Phase 1: Fill bar to current progress (or 100% if leveled up)
      const targetWidth = hasLeveledUp ? 100 : clampedProgress;
      const fillTimer = setTimeout(() => {
        setXpBarWidth(targetWidth);
      }, 2000);

      if (hasLeveledUp) {
        // Phase 2: Start fading out the bar
        const fadeOutTimer = setTimeout(() => {
          setAnimationPhase('fading-out');
        }, 4500); // 2000ms delay + 2500ms animation

        // Phase 3: Hide bar completely and start showing badge
        const hideBartimer = setTimeout(() => {
          setAnimationPhase('level-up-badge');
        }, 5200); // Extra 700ms for fade-out

        // Phase 4: Transform badge to new level with text
        const transformTimer = setTimeout(() => {
          setDisplayLevel(currentLevel);
          setAnimationPhase('level-up-show');
        }, 6000);

        // Phase 5: After 3 seconds, start fading out badge
        const fadeBadgeTimer = setTimeout(() => {
          setAnimationPhase('fading-badge');
        }, 9000);

        // Phase 6: After badge is fully faded, prepare to show bar
        const showBarTimer = setTimeout(() => {
          setAnimationPhase('show-bar');
          setBarOpacity(0);
          setXpBarWidth(0);
        }, 9700); // 700ms after fade started = fade complete

        // Phase 7: Start fading in the bar
        const fadeInBarTimer = setTimeout(() => {
          setBarOpacity(1);
        }, 9750); // Small delay to ensure state change is picked up

        // Phase 8: Bar is now fully visible, start filling
        const resetBarTimer = setTimeout(() => {
          setAnimationPhase('reset-bar');
        }, 10400); // Wait for bar fade-in to complete

        // Phase 9: Fill bar to actual new level progress
        const finalFillTimer = setTimeout(() => {
          setXpBarWidth(clampedProgress);
        }, 10600); // Small delay after reset-bar state

        return () => {
          clearTimeout(fillTimer);
          clearTimeout(fadeOutTimer);
          clearTimeout(hideBartimer);
          clearTimeout(transformTimer);
          clearTimeout(fadeBadgeTimer);
          clearTimeout(showBarTimer);
          clearTimeout(fadeInBarTimer);
          clearTimeout(resetBarTimer);
          clearTimeout(finalFillTimer);
        };
      } else {
        return () => {
          clearTimeout(fillTimer);
        };
      }
    }
  }, [isVisible, xpData, clampedPreviousProgress, clampedProgress, hasLeveledUp, previousLevel, currentLevel]);

  if (!isVisible || !xpData) return null;

  const getBonusIcon = (bonusType) => {
    switch (bonusType) {
      case 'empathy':
        return <Heart className="w-4 h-4" />;
      case 'decisiveness':
        return <ZapIcon className="w-4 h-4" />;
      case 'balance':
        return <Target className="w-4 h-4" />;
      case 'minimizeBias':
        return <TrendingUp className="w-4 h-4" />;
      case 'leadership':
        return <Trophy className="w-4 h-4" />;
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  const getBonusLabel = (bonusType) => {
    const labels = {
      empathy: 'Empatia & Análise',
      decisiveness: 'Velocidade de Decisão',
      balance: 'Equilíbrio Cognitivo',
      minimizeBias: 'Redução de Vieses',
      leadership: 'Liderança de Time'
    };
    return labels[bonusType] || bonusType;
  };

  const overlayContent = (
    <div 
      className="fixed top-0 left-0 right-0 bottom-0 bg-black/70 flex items-center justify-center p-4"
      style={{ 
        zIndex: 99999,
        touchAction: 'none',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain'
      }}
    >
      <div 
        className="bg-gradient-to-br from-[#F6F0FF] via-white to-[#F3EDFF] border border-[#E6DDFF] rounded-[28px] p-8 sm:p-10 shadow-[0_24px_80px_rgba(76,29,149,0.25)] max-w-md w-full relative overflow-hidden"
        style={{ zIndex: 100000 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          {/* XP Gained Header */}
          <div className="mb-6 flex items-center gap-4">
            <div 
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6D28D9] to-[#7C3AED] flex items-center justify-center shadow-lg flex-shrink-0"
            >
              <Zap className="w-7 h-7 text-white" strokeWidth={2.5} fill="currentColor" />
            </div>

            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-[#6D28D9]/80">
                EXPERIÊNCIA GANHA
              </p>
              <div className="mt-1 text-[34px] sm:text-4xl font-black text-[#6D28D9] leading-none">
                +{earnedXP} XP
              </div>
            </div>
          </div>

          {/* Bonus Breakdown */}
          <div className="mb-6 space-y-3">
            <div className="bg-white/70 rounded-xl px-4 py-3 border border-[#E6DDFF] shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-[#2F2A4A]">Completar a atividade</span>
                <span className="text-sm font-bold text-[#6D28D9]">{baseXP} XP</span>
              </div>
            </div>

            {Object.entries(bonuses).map(([bonusType, bonusValue], index) => (
              <div 
                key={bonusType}
                className="bg-white/70 rounded-xl px-4 py-3 border border-[#E6DDFF] shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className="text-[#047D31]">
                    {getBonusIcon(bonusType)}
                  </div>
                  <span className="text-sm font-semibold text-[#2F2A4A]">
                    {getBonusLabel(bonusType)}
                  </span>
                </div>
                <span className="text-sm font-bold text-[#047D31]">+{bonusValue} XP</span>
              </div>
            ))}
          </div>

          {/* Level-up Badge Animation */}
          {(animationPhase === 'level-up-badge' || animationPhase === 'level-up-show' || animationPhase === 'fading-badge') && (
            <div 
              className="mb-6 h-[68px] flex flex-col items-center justify-center transition-opacity duration-700"
              style={{ opacity: animationPhase === 'fading-badge' ? 0 : 1 }}
            >
              <p 
                className="text-xs font-semibold text-[#2F2A4A] mb-2 transition-opacity duration-700"
                style={{ opacity: animationPhase === 'level-up-show' ? 1 : 0 }}
              >
                Seu novo nível
              </p>
              <div 
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full font-bold text-white shadow-lg"
                style={{ 
                  backgroundColor: getLevelColor(displayLevel || currentLevel),
                  transition: 'background-color 1.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s ease-out',
                  transform: animationPhase === 'level-up-show' ? 'scale(1.05)' : 'scale(1)'
                }}
              >
                <Trophy className="w-4 h-4" />
                <span className="text-sm transition-all duration-1000">
                  {getLevelBadge(displayLevel || currentLevel)}
                </span>
              </div>
            </div>
          )}

          {/* Total XP Bar */}
          {(animationPhase === 'idle' || animationPhase === 'filling' || animationPhase === 'fading-out' || animationPhase === 'show-bar' || animationPhase === 'reset-bar') && (
            <div 
              className="mb-6 h-[68px] flex flex-col justify-center transition-opacity duration-700"
              style={{ 
                opacity: animationPhase === 'fading-out' ? 0 : barOpacity
              }}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-semibold uppercase text-[#2F2A4A]">
                  NÍVEL {currentLevel}
                </span>
                <span className="text-[11px] font-semibold uppercase text-[#2F2A4A]">
                  {levelProgress.xpToNextLevel > 0 
                    ? `${levelProgress.xpToNextLevel} XP PARA PRÓXIMO NÍVEL`
                    : 'PRÓXIMO NÍVEL DESBLOQUEADO!'}
                </span>
              </div>
              
              <div className="w-full bg-[#E6DDFF] rounded-full h-3 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#6D28D9] to-[#7C3AED] rounded-full transition-[width] duration-[2500ms] ease-out"
                  style={{ 
                    width: `${xpBarWidth}%`,
                    boxShadow: '0 0 10px rgba(109, 40, 217, 0.4)'
                  }}
                />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full rounded-xl border border-[#D7CCFF] bg-white px-4 py-3 text-sm font-semibold text-[#6D28D9] shadow-sm transition hover:shadow-md"
          >
            Continuar
          </button>
        </div>

      </div>
    </div>
  );

  return createPortal(overlayContent, document.body);
};

export default ScenarioXPOverlay;
