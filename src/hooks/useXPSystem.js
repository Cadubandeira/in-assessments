import { useState, useCallback } from 'react';
import { XP_CONFIG, getCurrentLevelProgress } from '../utils/gamificationUtils';

export const useXPSystem = (activityType = 'assessment') => {
  const [xpOverlay, setXpOverlay] = useState({
    visible: false,
    xpGained: 0,
    totalXP: 0,
    newLevel: 1,
    leveledUp: false,
    bonuses: []
  });

  const config = XP_CONFIG[activityType];

  // Calcular XP baseado em performance
  const calculateXP = useCallback((performancePercentage) => {
    if (!config) return { baseXP: 0, bonusXP: 0, totalXP: 0 };

    let baseXP = config.base;
    let bonusXP = 0;

    // Aplicar bônus baseado na porcentagem
    if (performancePercentage >= 100) {
      bonusXP = config.bonusThresholds[100];
    } else if (performancePercentage >= 90) {
      bonusXP = config.bonusThresholds[90];
    } else if (performancePercentage >= 80) {
      bonusXP = config.bonusThresholds[80];
    }

    return {
      baseXP,
      bonusXP,
      totalXP: baseXP + bonusXP,
      performancePercentage
    };
  }, [config]);

  // Calcular bônus alcançados baseado na porcentagem
  const calculateBonuses = useCallback((performancePercentage) => {
    const bonuses = [];
    
    if (performancePercentage >= 100 && config?.bonusThresholds?.[100]) {
      bonuses.push({
        label: 'Resultado 100%',
        xp: config.bonusThresholds[100]
      });
    } else if (performancePercentage >= 90 && config?.bonusThresholds?.[90]) {
      bonuses.push({
        label: 'Resultado 90%+',
        xp: config.bonusThresholds[90]
      });
    } else if (performancePercentage >= 80 && config?.bonusThresholds?.[80]) {
      bonuses.push({
        label: 'Resultado 80%+',
        xp: config.bonusThresholds[80]
      });
    }
    
    return bonuses;
  }, [config]);

  // Mostrar overlay de XP completo
  const showXPOverlay = useCallback((xpGained, totalXP, performancePercentage) => {
    console.log('🎯 showXPOverlay chamado:', { xpGained, totalXP, performancePercentage });
    const levelProgress = getCurrentLevelProgress(totalXP);
    const bonuses = calculateBonuses(performancePercentage);
    
    console.log('📊 Level Progress:', levelProgress);
    console.log('🎁 Bonuses:', bonuses);
    
    setXpOverlay({
      visible: true,
      xpGained,
      totalXP,
      newLevel: levelProgress.level,
      leveledUp: levelProgress.leveledUp,
      bonuses
    });
    
    console.log('✨ XP Overlay state atualizado para visible: true');
  }, [calculateBonuses]);

  // Fechar overlay
  const closeXPOverlay = useCallback(() => {
    setXpOverlay(prev => ({
      ...prev,
      visible: false
    }));
  }, []);

  // Preparar breakdown de XP
  const getXPBreakdown = useCallback((performancePercentage) => {
    const { baseXP, bonusXP } = calculateXP(performancePercentage);

    return [
      {
        label: `Completar ${activityType}`,
        xp: baseXP,
        achieved: true
      },
      {
        label: 'Bônus de desempenho',
        xp: bonusXP,
        achieved: bonusXP > 0
      }
    ];
  }, [activityType, calculateXP]);

  return {
    config,
    xpOverlay,
    calculateXP,
    showXPOverlay,
    closeXPOverlay,
    calculateBonuses,
    getXPBreakdown,
    maxXP: (config?.base || 0) + (config?.bonusThresholds[100] || 0)
  };
};
