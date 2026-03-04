import React from 'react';

/**
 * CallToActionCard - Componente de banner com chamada para ação
 * 
 * @component
 * @param {Object} props - Props do componente
 * @param {React.ReactNode} props.icon - Ícone do lucide-react a exibir
 * @param {string} props.title - Título do card
 * @param {string} props.description - Descrição/subtítulo do card
 * @param {string} props.buttonText - Texto do botão de ação
 * @param {Function} props.onButtonClick - Callback ao clicar no botão
 * @param {string} [props.className] - Classes Tailwind adicionais
 * @param {string} [props.gradientFrom='from-[#4F46E5]'] - Cor inicial do gradiente
 * @param {string} [props.gradientTo='to-[#6366F1]'] - Cor final do gradiente
 * @param {string} [props.buttonTextColor='text-[#4F46E5]'] - Cor do texto do botão
 * 
 * @example
 * <CallToActionCard
 *   icon={<Zap size={32} />}
 *   title="Pronto para um novo desafio?"
 *   description="Mapeie seu crescimento em competências e desbloqueie novos insights."
 *   buttonText="Vamos lá!"
 *   onButtonClick={() => navigate('/activities')}
 * />
 */
const CallToActionCard = ({
  icon,
  title,
  description,
  buttonText,
  onButtonClick,
  className = '',
  gradientFrom = 'from-[#4F46E5]',
  gradientTo = 'to-[#6366F1]',
  buttonTextColor = 'text-[#4F46E5]'
}) => {
  return (
    <div className={`bg-gradient-to-r ${gradientFrom} ${gradientTo} rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl flex flex-col md:flex-row items-center justify-between text-white gap-4 sm:gap-6 w-full ${className}`}>
      <div className="flex items-center gap-3 sm:gap-4 md:gap-6 w-full md:w-auto">
        {icon && (
          <div className="bg-white/20 p-3 sm:p-4 rounded-lg flex-shrink-0">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-lg sm:text-xl font-bold">{title}</h4>
          <p className="text-white/80 text-base">
            {description}
          </p>
        </div>
      </div>
      <button
        onClick={onButtonClick}
        className={`bg-white ${buttonTextColor} px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg font-bold text-xs sm:text-sm uppercase tracking-wider hover:scale-105 transition-transform whitespace-nowrap w-full md:w-auto`}
      >
        {buttonText}
      </button>
    </div>
  );
};

export default CallToActionCard;
