import React from 'react';
import { Brain, Zap, Scale, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { TOKENS } from '../config/tokens';

/**
 * Kahneman Analysis Display Component
 * Visual representation of System 1 vs System 2 analysis
 */
const KahnemanAnalysisDisplay = ({ kahnemanData, kahnemanInsight }) => {
  if (!kahnemanData) return null;

  const {
    system1_score,
    system2_score,
    biases,
    avg_decision_time,
    fast_decisions_count,
    slow_decisions_count,
    total_decisions,
    balance
  } = kahnemanData;



  return (
    <div className="space-y-6 mb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-4 mb-4">
          <Brain className="w-12 h-12" />
          <div>
            <h3 className="text-3xl font-bold">Análise Kahneman</h3>
            <p className="text-indigo-100 text-sm">Seus Dois Sistemas de Pensamento</p>
          </div>
        </div>
        
        <p className="text-indigo-50 leading-relaxed">
          Baseado em <strong>"Thinking, Fast and Slow"</strong> de Daniel Kahneman, 
          ganhador do Prêmio Nobel. Suas decisões revelam como você pensa sob pressão.
        </p>
      </div>

      {/* Main Insight Card */}
      {kahnemanInsight && (
        <div className={`rounded-xl p-6 border-2 ${
          kahnemanInsight.type === 'strength' ? 'bg-green-50 border-green-300' :
          kahnemanInsight.type === 'watch' ? 'bg-yellow-50 border-yellow-300' :
          kahnemanInsight.type === 'development' ? 'bg-orange-50 border-orange-300' :
          'bg-blue-50 border-blue-300'
        }`}>
          <div className="flex items-start gap-3 mb-3">
            {kahnemanInsight.type === 'strength' && <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />}
            {kahnemanInsight.type === 'watch' && <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />}
            {kahnemanInsight.type === 'development' && <TrendingUp className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />}
            {kahnemanInsight.type === 'balanced' && <Scale className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />}
            
            <div className="flex-1">
              <h4 className="text-xl font-bold text-gray-900 mb-2">
                {kahnemanInsight.title}
              </h4>
              <p className="text-gray-700 leading-relaxed mb-4">
                {kahnemanInsight.description}
              </p>
              
              {kahnemanInsight.kahneman_quote && (
                <div className="bg-white/60 rounded-lg p-4 border-l-4 border-gray-400">
                  <p className="text-sm italic text-gray-600">
                    {kahnemanInsight.kahneman_quote}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Systems Comparison */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* System 1 */}
        <div className="bg-white rounded-xl p-6 border-2 border-orange-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-8 h-8 text-orange-500" />
            <div>
              <h4 className="text-xl font-bold text-gray-900">Sistema 1</h4>
              <p className="text-sm text-gray-500">Pensamento Rápido</p>
            </div>
          </div>

          {/* Score Bar */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Uso</span>
              <span className="text-2xl font-bold text-orange-600">{system1_score}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all rounded-full"
                style={{ width: `${system1_score}%` }}
              />
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Decisões Rápidas (&lt;30s):</span>
              <span className="font-semibold text-gray-900">{fast_decisions_count} de {total_decisions}</span>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-3 mt-4">
              <p className="text-xs font-semibold text-orange-800 mb-2">Características:</p>
              <ul className="text-xs text-orange-700 space-y-1 ml-4 list-disc">
                <li>Automático e intuitivo</li>
                <li>Baseado em experiência</li>
                <li>Eficiente em contextos familiares</li>
                <li>Vulnerável a vieses sob pressão</li>
              </ul>
            </div>
          </div>
        </div>

        {/* System 2 */}
        <div className="bg-white rounded-xl p-6 border-2 border-blue-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-8 h-8 text-blue-500" />
            <div>
              <h4 className="text-xl font-bold text-gray-900">Sistema 2</h4>
              <p className="text-sm text-gray-500">Pensamento Lento</p>
            </div>
          </div>

          {/* Score Bar */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Uso</span>
              <span className="text-2xl font-bold text-blue-600">{system2_score}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all rounded-full"
                style={{ width: `${system2_score}%` }}
              />
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Decisões Ponderadas (≥60s):</span>
              <span className="font-semibold text-gray-900">{slow_decisions_count} de {total_decisions}</span>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-3 mt-4">
              <p className="text-xs font-semibold text-blue-800 mb-2">Características:</p>
              <ul className="text-xs text-blue-700 space-y-1 ml-4 list-disc">
                <li>Deliberado e analítico</li>
                <li>Demanda esforço consciente</li>
                <li>Processamento lógico</li>
                <li>Consome energia cognitiva</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Balance Visualization */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Scale className="w-5 h-5" />
          Equilíbrio Cognitivo sob Pressão
        </h4>
        
        {/* Directional Arrow Visualization */}
        <div className="mb-6">
          {system1_score === 100 ? (
            // Dominant System 1
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-600 mb-2">
                ➤ ➤ ➤ SISTEMA 1
              </div>
              <p className="text-sm text-gray-600">
                <strong>Pensamento Rápido E Intuitivo Dominante</strong>
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Você confia principalmente em intuição e experiência. Decisões rápidas e assertivas.
              </p>
            </div>
          ) : system2_score === 100 ? (
            // Dominant System 2
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                SISTEMA 2 ⬅ ⬅ ⬅
              </div>
              <p className="text-sm text-gray-600">
                <strong>Pensamento Lento E Analítico Dominante</strong>
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Você prioriza análise deliberada e reflexão cuidadosa. Decisões bem fundamentadas.
              </p>
            </div>
          ) : system1_score > system2_score ? (
            // System 1 lean
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-2xl text-orange-600">{"➤".repeat(Math.ceil(system1_score / 20))}</div>
                    <span className="font-bold text-orange-600">{system1_score}%</span>
                  </div>
                  <p className="text-xs text-orange-700">Sistema 1</p>
                </div>
                <div className="text-center px-2">
                  <p className="text-xs font-bold text-gray-500">vs</p>
                </div>
                <div className="flex-1 text-right">
                  <div className="flex items-center justify-end gap-2 mb-1">
                    <span className="font-bold text-blue-600">{system2_score}%</span>
                    <div className="text-2xl text-blue-600">{"⬅".repeat(Math.ceil(system2_score / 20))}</div>
                  </div>
                  <p className="text-xs text-blue-700">Sistema 2</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 text-center italic">
                Você tende para intuição, mas mantém alguma capacidade analítica.
              </p>
            </div>
          ) : (
            // System 2 lean
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-2xl text-orange-600">{"➤".repeat(Math.ceil(system1_score / 20))}</div>
                    <span className="font-bold text-orange-600">{system1_score}%</span>
                  </div>
                  <p className="text-xs text-orange-700">Sistema 1</p>
                </div>
                <div className="text-center px-2">
                  <p className="text-xs font-bold text-gray-500">vs</p>
                </div>
                <div className="flex-1 text-right">
                  <div className="flex items-center justify-end gap-2 mb-1">
                    <span className="font-bold text-blue-600">{system2_score}%</span>
                    <div className="text-2xl text-blue-600">{"⬅".repeat(Math.ceil(system2_score / 20))}</div>
                  </div>
                  <p className="text-xs text-blue-700">Sistema 2</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 text-center italic">
                Você prioriza análise, mas conserva instinto intuitivo.
              </p>
            </div>
          )}
        </div>

        <div className="text-center pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Perfil: <span className="font-semibold text-gray-900">
              {balance === 'equilibrado' && '⚖️ Equilibrado'}
              {balance === 'intuitivo_dominante' && '🚀 Intuitivo Dominante'}
              {balance === 'analitico_dominante' && '🧠 Analítico Dominante'}
              {balance === 'moderado' && '✓ Moderadamente Balanceado'}
            </span>
          </p>
        </div>
      </div>

      {/* Cognitive Biases Detected */}
      {biases && biases.length > 0 && (
        <div className="bg-yellow-50 rounded-xl p-6 border-2 border-yellow-200">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
            <h4 className="text-lg font-bold text-gray-900">
              Vieses Cognitivos Detectados
            </h4>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Kahneman identificou dezenas de vieses que afetam decisões. Detectamos estes padrões em suas escolhas:
          </p>

          <div className="space-y-3">
            {biases.map((bias, index) => (
              <div key={index} className="bg-white rounded-lg p-4 border border-yellow-300">
                <div className="flex items-start justify-between mb-2">
                  <h5 className="font-semibold text-gray-900">{bias.name}</h5>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    bias.confidence === 'high' ? 'bg-red-100 text-red-700' :
                    bias.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {bias.confidence === 'high' && 'Alta confiança'}
                    {bias.confidence === 'medium' && 'Média confiança'}
                    {bias.confidence === 'low' && 'Baixa confiança'}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{bias.description}</p>
                {bias.kahneman_reference && (
                  <p className="text-xs italic text-gray-500 border-l-2 border-yellow-400 pl-3">
                    {bias.kahneman_reference}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-yellow-100 rounded-lg">
            <p className="text-xs text-yellow-800">
              <strong>Nota:</strong> A identificação de vieses não indica falha. Kahneman demonstrou que até especialistas são suscetíveis. 
              O importante é <em>consciência</em> - saber quando confiar na intuição e quando desacelerar para análise.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default KahnemanAnalysisDisplay;
