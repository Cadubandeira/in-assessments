import React from 'react';
import { TOKENS } from '../../config/tokens';

const Button = ({ children, variant = 'primary', icon: Icon, className = '', ...props }) => {
  const variants = {
    primary: `${TOKENS.colors.accentBg} text-white hover:opacity-90`,
    secondary: `bg-transparent border ${TOKENS.colors.border} ${TOKENS.colors.ink} hover:bg-black/5`,
    outline: `border ${TOKENS.colors.border} ${TOKENS.colors.ink} hover:bg-[#F5F3EC]`
  };

  return (
    <button
      className={`flex items-center justify-center gap-2 px-6 py-3 rounded-full font-medium transition-all active:scale-95 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
      {Icon && <Icon className="w-4 h-4" />}
    </button>
  );
};

export default Button;