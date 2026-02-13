import React from 'react';
import { TOKENS } from '../../config/tokens';

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

export default Logo;