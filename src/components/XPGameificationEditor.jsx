import React from 'react';
import { Zap, AlertCircle } from 'lucide-react';

export default function XPGameificationEditor({
  gamifyXp,
  xpCompletion,
  xpScore80,
  xpScore90,
  xpScore100,
  onGamifyChange,
  onXpCompletionChange,
  onXpScore80Change,
  onXpScore90Change,
  onXpScore100Change
}) {
  return (
    <div className="border border-gray-300 rounded-lg p-6 bg-white">
      <div className="flex items-center gap-3 mb-6">
        <Zap className="w-5 h-5 text-yellow-500" />
        <h3 className="text-lg font-semibold text-gray-900">Gamificação - Recompensa em XP</h3>
      </div>

      {/* Toggle para habilitar/desabilitar XP */}
      <div className="mb-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={gamifyXp}
            onChange={(e) => onGamifyChange(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-indigo-600 cursor-pointer"
          />
          <span className="text-gray-700 font-medium">Habilitar ganho de XP para este assessment</span>
        </label>
      </div>

      {/* Se gamify está ativado, mostrar campos */}
      {gamifyXp && (
        <div className="space-y-6 bg-indigo-50 p-6 rounded-lg border border-indigo-200">
          {/* Campo obrigatório: XP por Completar */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              XP para Completar o Assessment <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-600 mb-3">
              Este é o valor de XP concedido quando o usuário completa o assessment. É o único campo obrigatório.
            </p>
            <div className="relative">
              <input
                type="number"
                min="0"
                value={xpCompletion}
                onChange={(e) => onXpCompletionChange(parseInt(e.target.value) || 0)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  !xpCompletion && gamifyXp
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-indigo-500'
                }`}
                placeholder="Ex: 10"
              />
              <Zap className="absolute right-3 top-2.5 w-5 h-5 text-yellow-500 pointer-events-none" />
            </div>
            {!xpCompletion && gamifyXp && (
              <div className="mt-2 flex items-start gap-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Este campo é obrigatório quando a gamificação está ativada</span>
              </div>
            )}
          </div>

          <div className="border-t border-indigo-300 pt-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">
              Recompensas por Desempenho (Opcional)
            </h4>
            <p className="text-xs text-gray-600 mb-4">
              Configure bônus adicionais baseados na pontuação do usuário. Deixe em branco ou 0 para não oferecer bônus em uma faixa.
            </p>

            {/* XP para 80-89% */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                XP para Resultado de 80 a 89%
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={xpScore80}
                  onChange={(e) => onXpScore80Change(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Ex: 5"
                />
                <Zap className="absolute right-3 top-2.5 w-5 h-5 text-purple-500 pointer-events-none" />
              </div>
            </div>

            {/* XP para 90-99% */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                XP para Resultado de 90 a 99%
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={xpScore90}
                  onChange={(e) => onXpScore90Change(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Ex: 10"
                />
                <Zap className="absolute right-3 top-2.5 w-5 h-5 text-purple-500 pointer-events-none" />
              </div>
            </div>

            {/* XP para 100% */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                XP para Resultado de 100% 🎯
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={xpScore100}
                  onChange={(e) => onXpScore100Change(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Ex: 20"
                />
                <Zap className="absolute right-3 top-2.5 w-5 h-5 text-pink-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Resumo das recompensas */}
          <div className="border-t border-indigo-300 pt-4 mt-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Resumo de Recompensas</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center p-2 bg-white rounded border border-indigo-200">
                <span className="text-gray-700">Completar o assessment:</span>
                <span className="font-bold text-indigo-600">{xpCompletion} XP</span>
              </div>
              {xpScore80 > 0 && (
                <div className="flex justify-between items-center p-2 bg-white rounded border border-purple-200">
                  <span className="text-gray-700">Resultado 80-89%:</span>
                  <span className="font-bold text-purple-600">+{xpScore80} XP</span>
                </div>
              )}
              {xpScore90 > 0 && (
                <div className="flex justify-between items-center p-2 bg-white rounded border border-purple-200">
                  <span className="text-gray-700">Resultado 90-99%:</span>
                  <span className="font-bold text-purple-600">+{xpScore90} XP</span>
                </div>
              )}
              {xpScore100 > 0 && (
                <div className="flex justify-between items-center p-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded border border-pink-200">
                  <span className="text-gray-700 font-medium">Resultado 100%:</span>
                  <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                    +{xpScore100} XP
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center p-2 bg-gradient-to-r from-indigo-100 to-blue-100 rounded border border-indigo-300 font-semibold">
                <span className="text-gray-900">Máximo possível:</span>
                <span className="text-indigo-700">
                  {xpCompletion + Math.max(xpScore80, xpScore90, xpScore100)} XP
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
