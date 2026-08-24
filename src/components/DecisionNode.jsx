import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { TOKENS } from '../config/tokens';
import { normalizeScenarioHtml, normalizeScenarioText } from '../utils/scenarioTextNormalization';
import { formatScenarioOptionParts } from '../utils/realScenarioUtils';

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
  const [showMetadata, setShowMetadata] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [firstSelectedAt, setFirstSelectedAt] = useState(null);
  const [lastSelectionChangeAt, setLastSelectionChangeAt] = useState(null);
  const [selectionChangeCount, setSelectionChangeCount] = useState(0);

  const hasTimeLimit = node?.pressure_elements?.time_limit;
  const stakes = node?.pressure_elements?.stakes;
  const ambiguity = node?.pressure_elements?.ambiguity;

  useEffect(() => {
    setSelectedOption(null);
    setShowMetadata(false);
    setElapsedSeconds(0);
    setFirstSelectedAt(null);
    setLastSelectionChangeAt(null);
    setSelectionChangeCount(0);
    setTimeRemaining(node?.pressure_elements?.time_limit ?? null);
  }, [node?.id, node?.pressure_elements?.time_limit]);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [node?.id]);

  // Timer effect
  useEffect(() => {
    if (timeRemaining !== null && timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0) {
      // Auto-submit on timeout with safe fallback.
      if (selectedOption !== null) {
        handleSubmit(true);
      } else if ((node?.decision_options?.length || 0) > 0) {
        handleSubmit(true, 0, true);
      }
    }
  }, [timeRemaining, hasTimeLimit, selectedOption, node?.decision_options]);

  const handleOptionClick = (index) => {
    const now = elapsedSeconds;

    if (selectedOption !== null && selectedOption !== index) {
      setSelectionChangeCount((prev) => prev + 1);
      setLastSelectionChangeAt(now);
    }

    if (firstSelectedAt === null) {
      setFirstSelectedAt(now);
    }

    setSelectedOption(index);
    setShowMetadata(true);
  };

  const handleSubmit = (isAutoSubmit = false, forcedOptionIndex = null, timeoutAutoSelected = false) => {
    const optionToSubmit = forcedOptionIndex ?? selectedOption;
    if (optionToSubmit === null) return;

    const now = elapsedSeconds;
    const effectiveFirstSelectedAt = firstSelectedAt ?? now;

    const passiveTelemetry = {
      option_first_selected_at: effectiveFirstSelectedAt,
      option_last_changed_at: lastSelectionChangeAt,
      option_change_count: selectionChangeCount,
      node_view_started_at: 0,
      decision_confirmed_at: now,
      first_selection_latency_seconds: Math.max(0, effectiveFirstSelectedAt),
      dwell_time_before_confirm_seconds: Math.max(0, now - effectiveFirstSelectedAt),
      timeout_auto_submit: Boolean(isAutoSubmit),
      timeout_auto_selected: Boolean(timeoutAutoSelected)
    };

    onDecision(optionToSubmit, {
      timeRemaining,
      passiveTelemetry
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
          className="prose max-w-none text-gray-800 leading-relaxed scenario-rich-content"
          dangerouslySetInnerHTML={{ __html: normalizeScenarioHtml(node.content) }}
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
                    {(() => {
                      const parsed = formatScenarioOptionParts(normalizeScenarioText(option.text));

                      return (
                        <div className="space-y-2">
                          {parsed.action && (
                            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide bg-[#EEF2FF] text-[#3730A3] border border-[#C7D2FE]">
                              {parsed.action}
                            </span>
                          )}
                          <p className="text-base text-gray-800 leading-relaxed">
                            {parsed.action ? `"${parsed.speech}"` : parsed.speech}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Confirmation (shown after selection) */}
      {showMetadata && selectedOption !== null && (
        <div className="pt-2 animate-fadeIn">
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
              <>Confirmar</>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default DecisionNode;
