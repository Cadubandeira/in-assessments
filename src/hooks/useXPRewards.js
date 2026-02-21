import { useMemo } from 'react';
import { XP_CONFIG } from '../utils/gamificationUtils';

export const useXPRewards = (activityType = 'assessment') => {
  const config = XP_CONFIG[activityType];

  const rewards = useMemo(() => {
    if (!config) return [];
    
    return [
      {
        label: 'Completar ' + activityType,
        xp: config.base,
        dotColor: 'rgb(129, 140, 248)',
        className: 'bg-white/60 backdrop-blur-sm',
        textClassName: 'text-gray-600 flex-1',
        valueClassName: 'font-bold text-indigo-700'
      },
      {
        label: 'Resultado de 80 a 89%',
        xp: config.bonusThresholds[80],
        dotColor: 'rgb(168, 85, 247)',
        className: 'bg-white/40',
        textClassName: 'text-gray-600 flex-1',
        valueClassName: 'font-semibold text-purple-600'
      },
      {
        label: 'Resultado de 90 a 99%',
        xp: config.bonusThresholds[90],
        dotColor: 'rgb(168, 85, 247)',
        className: 'bg-white/40',
        textClassName: 'text-gray-600 flex-1',
        valueClassName: 'font-semibold text-purple-600'
      },
      {
        label: 'Resultado de 100% 🎯',
        xp: config.bonusThresholds[100],
        dotColor: 'rgb(168, 85, 247)',
        className: 'bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-300/50',
        textClassName: 'text-gray-700 font-medium flex-1',
        valueClassName: 'font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600'
      }
    ];
  }, [activityType, config]);

  return {
    baseXP: config?.base || 0,
    bonusThresholds: config?.bonusThresholds || {},
    rewards,
    maxXP: (config?.base || 0) + (config?.bonusThresholds[100] || 0)
  };
};
