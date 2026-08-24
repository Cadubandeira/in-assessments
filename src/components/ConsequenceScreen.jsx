import React from 'react';
import { ArrowRight, Zap } from 'lucide-react';
import { TOKENS } from '../config/tokens';
import { normalizeScenarioHtml } from '../utils/scenarioTextNormalization';
import { translateScenarioPressureIndicator } from '../utils/realScenarioUtils';

/**
 * Consequence Screen Component
 * Mostra o resultado/consequência de uma decisão antes de prosseguir
 */
const ConsequenceScreen = ({ 
  content, 
  pressureIndicators = [], 
  onContinue,
  isLoading = false
}) => {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Consequence Content */}
      <div className="bg-gradient-to-br from-[#EDE9FF] via-white to-[#F8F7FF] border-2 border-[#4F46E5]/30 rounded-2xl p-6 sm:p-8 shadow-lg">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#4F46E5] flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" fill="currentColor" />
          </div>
          <div>
            <h3 className={`${TOKENS.fonts.serif} text-xl text-[#1E1B4B] mb-1`}>
              Consequência
            </h3>
            <p className="text-xs text-[#4F46E5] font-semibold uppercase tracking-wider">
              O cenário evolui
            </p>
          </div>
        </div>

        <div 
          className="prose max-w-none text-gray-800 leading-relaxed scenario-rich-content"
          dangerouslySetInnerHTML={{ __html: normalizeScenarioHtml(content) }}
        />
      </div>

      {/* Pressure Indicators */}
      {pressureIndicators.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 mb-3">
            Mudanças no cenário
          </p>
          <div className="flex flex-wrap gap-2">
            {pressureIndicators.map((indicator, index) => (
              (() => {
                const translated = translateScenarioPressureIndicator(indicator);

                return (
                  <div
                    key={index}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-full text-sm text-amber-900 font-medium shadow-sm"
                  >
                    <span>{translated.icon}</span>
                    <span>{translated.label}</span>
                  </div>
                );
              })()
            ))}
          </div>
        </div>
      )}

      {/* Continue Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          disabled={isLoading}
          className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white rounded-xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Carregando...
            </>
          ) : (
            <>
              Continuar
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ConsequenceScreen;
