import React from 'react';
import { Zap } from 'lucide-react';

const XPRewardsCard = ({ 
  baseXP, 
  bonusThresholds, 
  title = "Ganhe XP",
  subtitle = "Complete e suba de nível",
  rewardsList,
  variant = 'default' // 'default' | 'compact'
}) => {
  const maxXP = baseXP + bonusThresholds[100];

  if (variant === 'compact') {
    return (
      <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border border-indigo-200/60 rounded-xl p-4 shadow-md">
        <div className="flex items-center gap-3 mb-3">
          <Zap className="w-5 h-5 text-indigo-600" strokeWidth={2.5} fill="currentColor" />
          <div>
            <p className="text-xs font-bold text-indigo-700">{title}</p>
            <p className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              até {maxXP} XP
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border border-indigo-200/60 rounded-2xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-400/10 to-purple-400/10 rounded-full blur-2xl"></div>
      
      <div className="relative z-10">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Zap className="w-6 h-6 text-white" strokeWidth={2.5} fill="currentColor" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-700 mb-1">
              {title}
            </p>
            <p className="text-sm text-gray-600">{subtitle}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              até {maxXP} XP
            </div>
          </div>
        </div>
        
        <div className="space-y-2.5 text-sm">
          {rewardsList.map((reward, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 p-2 rounded-lg ${reward.className}`}
            >
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: reward.dotColor }}
              ></div>
              <span className={reward.textClassName}>{reward.label}</span>
              <span className={reward.valueClassName}>+{reward.xp} XP</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default XPRewardsCard;
