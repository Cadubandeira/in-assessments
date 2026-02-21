import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { TOKENS } from '../config/tokens';

/**
 * Decision Node Component
 * Exibe conteúdo do nó e opções de decisão com pressão contextual
 */
const DecisionNode = ({ 
  node, 
  onDecision, 
  isLoading = false 
}) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [confidence, setConfidence] = useState('moderate');
  const [cognitiveLoad, setCognitiveLoad] = useState('medium');
  const [showMetadata, setShowMetadata] = useState(false);

  const hasTimeLimit = node?.pressure_elements?.time_limit;
  const stakes = node?.pressure_elements?.stakes;
  const ambiguity = node?.pressure_elements?.ambiguity;

  // Timer effect
  useEffect(() => {
    if (hasTimeLimit && timeRemaining === null) {
      setTimeRemaining(node.pressure_elements.time_limit);
    }

    if (timeRemaining !== null && timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && selectedOption !== null) {
      // Auto-submit on timeout
      handleSubmit();
    }
  }, [timeRemaining, hasTimeLimit, selectedOption]);

  const handleOptionClick = (index) => {
    setSelectedOption(index);
    setShowMetadata(true);
  };

  const handleSubmit = () => {
    if (selectedOption === null) return;

    onDecision(selectedOption, {
      confidence,
      cognitiveLoad,
      timeRemaining
    });
  };

  const getStakesColor = () => {
    switch (stakes) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'moderate': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  const getTimerColor = () => {
    if (timeRemaining > 30) return 'text-green-600';
    if (timeRemaining > 10) return 'text-yellow-600';
    return 'text-red-600 animate-pulse';
  };

  return (
    <div className="space-y-6">
      {/* Pressure Indicators */}
      <div className="flex flex-wrap gap-3 items-center">
        {hasTimeLimit && timeRemaining !== null && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border-2 ${
            timeRemaining < 10 ? 'border-red-500' : 'border-gray-300'
          }`}>
            <Clock className={`w-4 h-4 ${getTimerColor()}`} />
            <span className={`text-sm font-bold ${getTimerColor()}`}>
              {timeRemaining}s
            </span>
          </div>
        )}

        {stakes && (
          <div className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider ${getStakesColor()}`}>
            {stakes === 'critical' ? '🔥 Crítico' : stakes === 'high' ? '⚠️ Alto Risco' : '📊 Moderado'}
          </div>
        )}

        {ambiguity === 'high' && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold">
            <AlertCircle className="w-4 h-4" />
            Ambíguo
          </div>
        )}
      </div>

      {/* Node Content */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div 
          className="prose max-w-none text-gray-800 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: node.content }}
        />
      </div>

      {/* Decision Options */}
      <div className="space-y-4">
        <h3 className={`${TOKENS.fonts.serif} text-xl text-[#1E1B4B]`}>
          O que você faz?
        </h3>

        <div className="space-y-3">
          {node.decision_options?.map((option, index) => {
            const isSelected = selectedOption === index;

            return (
              <button
                key={index}
                type="button"
                onClick={() => handleOptionClick(index)}
                disabled={isLoading}
                className={`w-full text-left p-4 sm:p-5 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-[#4F46E5] bg-[#EDE9FF]'
                    : 'border-gray-200 bg-white hover:border-[#4F46E5]/40 hover:bg-gray-50'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    isSelected
                      ? 'bg-[#4F46E5] text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <div className="flex-grow">
                    <p className="text-base text-gray-800 leading-relaxed">
                      {option.text}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Metadata Collection (shown after selection) */}
      {showMetadata && selectedOption !== null && (
        <div className="bg-gradient-to-br from-[#F3F4F6] to-[#E5E7EB] border border-gray-300 rounded-2xl p-6 space-y-4 animate-fadeIn">
          <p className="text-sm font-semibold text-gray-700">
            Antes de confirmar, nos ajude a entender sua decisão:
          </p>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
              Qual seu nível de confiança nesta escolha?
            </label>
            <div className="flex gap-2">
              {['uncertain', 'moderate', 'confident'].map(level => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setConfidence(level)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    confidence === level
                      ? 'bg-[#4F46E5] text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {level === 'uncertain' ? 'Incerto' : level === 'moderate' ? 'Moderado' : 'Confiante'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
              Quão complexa foi esta decisão?
            </label>
            <div className="flex gap-2">
              {['low', 'medium', 'high'].map(level => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setCognitiveLoad(level)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    cognitiveLoad === level
                      ? 'bg-[#4F46E5] text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {level === 'low' ? 'Fácil' : level === 'medium' ? 'Média' : 'Difícil'}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white font-bold py-3 px-6 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processando...
              </>
            ) : (
              <>
                Confirmar Decisão
                <TrendingUp className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default DecisionNode;
