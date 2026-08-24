import React from 'react';
import { TOKENS } from '../../config/tokens';

const Logo = ({ size = 'normal', className = '', dark = true }) => {
  const isLarge = size === 'large';
  const textSize = isLarge ? 'text-5xl md:text-6xl' : 'text-2xl';
  const subTextSize = isLarge ? 'text-sm md:text-base' : 'text-[10px]';
  const textColor = dark ? 'text-[#1E1B4B]' : 'text-white';
  const accentColor = dark ? 'text-[#4F46E5]' : 'text-white';
  
  const dotSize = isLarge ? 'w-1.5 h-1.5 md:w-2 md:h-2' : 'w-1 h-1 md:w-1.5 md:h-1.5';
  const dotMargin = isLarge ? 'mb-1.5 md:mb-2' : 'mb-1 md:mb-1.5';
  
  return (
    <div className={`notranslate flex flex-col justify-center select-none ${className}`} translate="no">
      <div className="flex items-baseline gap-2">
        <span className={`font-['Dancing_Script'] ${textSize} ${textColor} font-bold leading-none`} translate="no">in</span>
        <div className={`${dotSize} rounded-full ${accentColor.replace('text-', 'bg-')} self-end ${dotMargin} animate-pulse`} />
        <span className={`font-sans ${subTextSize} ${textColor} font-bold uppercase tracking-[0.3em]`} translate="no">Assessments</span>
      </div>
    </div>
  );
};

export default Logo;