
import React from 'react';

/**
 * CallToActionCardLong - Card de chamada para ação com visual único
 *
 * @component
 * @param {Object} props
 * @param {string} props.title
 * @param {string} props.description
 * @param {string} props.buttonText
 * @param {Function} props.onButtonClick
 * @param {string} [props.className]
 */
const CallToActionCardLong = ({
  title,
  description,
  buttonText,
  onButtonClick,
  buttonHref,
  openInNewTab = false,
  className = ''
}) => {
  return (
    <div
      className={`relative border border-indigo-200 rounded-3xl shadow-2xl p-8 flex flex-col items-start w-full overflow-hidden ${className}`}
      style={{
        background: 'linear-gradient(135deg, #4F46E5, #6366F1, #EC4899, #FBBF24)',
        animation: 'gradientMove 12s ease-in-out infinite',
        backgroundSize: '400% 400%'
      }}
    >
      <style>{`
        @keyframes gradientMove {
          0% {background-position: 0% 50%;}
          25% {background-position: 100% 50%;}
          50% {background-position: 50% 100%;}
          75% {background-position: 0% 100%;}
          100% {background-position: 0% 50%;}
        }
      `}</style>
      <div className="relative z-10 w-full">
        <h3 className="text-2xl font-extrabold text-white mb-3 tracking-tight drop-shadow-sm">{title}</h3>
        <p className="text-white text-base sm:text-lg leading-relaxed mb-6">{description}</p>
        {buttonHref ? (
          <a
            href={buttonHref}
            target={openInNewTab ? '_blank' : '_self'}
            rel={openInNewTab ? 'noopener noreferrer' : undefined}
            className="inline-flex bg-white bg-opacity-80 text-indigo-700 px-7 py-3 rounded-xl font-bold text-sm uppercase tracking-wider shadow-md hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {buttonText}
          </a>
        ) : (
          <button
            onClick={onButtonClick}
            className="bg-white bg-opacity-80 text-indigo-700 px-7 py-3 rounded-xl font-bold text-sm uppercase tracking-wider shadow-md hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {buttonText}
          </button>
        )}
      </div>
    </div>
  );
};

export default CallToActionCardLong;