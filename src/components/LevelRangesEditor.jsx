import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

export default function LevelRangesEditor({ level, levelIndex, onUpdate }) {
  const ranges = level.ranges || [];

  const handleAddRange = () => {
    const newRanges = [
      ...ranges,
      {
        id: `temp-range-${Date.now()}`,
        min_score: '',
        max_score: '',
        label: '',
        interpretation: ''
      }
    ];
    onUpdate(levelIndex, { ranges: newRanges });
  };

  const handleUpdateRange = (rangeIndex, field, value) => {
    const updated = [...ranges];
    updated[rangeIndex] = { ...updated[rangeIndex], [field]: value };
    onUpdate(levelIndex, { ranges: updated });
  };

  const handleRemoveRange = (rangeIndex) => {
    const updated = ranges.filter((_, idx) => idx !== rangeIndex);
    onUpdate(levelIndex, { ranges: updated });
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
          Faixas de Interpretação (baseadas na pontuação bruta do nível)
        </h4>
        <button
          type="button"
          onClick={handleAddRange}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-[#4F46E5] text-white rounded-lg hover:bg-[#4338CA] transition"
        >
          <Plus className="w-3 h-3" /> Adicionar Faixa
        </button>
      </div>

      {ranges.length === 0 && (
        <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-sm text-gray-500">Nenhuma faixa de interpretação configurada</p>
          <p className="text-xs text-gray-400 mt-1">Clique em "Adicionar Faixa" para começar</p>
        </div>
      )}

      {ranges.map((range, idx) => (
        <div key={range.id || idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-500">Faixa {idx + 1}</span>
            <button
              type="button"
              onClick={() => handleRemoveRange(idx)}
              className="text-red-600 hover:text-red-700 p-1"
              title="Remover faixa"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Pontuação Mínima
              </label>
              <input
                type="number"
                value={range.min_score}
                onChange={(e) => handleUpdateRange(idx, 'min_score', e.target.value)}
                placeholder="0"
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Pontuação Máxima
              </label>
              <input
                type="number"
                value={range.max_score}
                onChange={(e) => handleUpdateRange(idx, 'max_score', e.target.value)}
                placeholder="100"
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Rótulo da Faixa
            </label>
            <input
              type="text"
              value={range.label}
              onChange={(e) => handleUpdateRange(idx, 'label', e.target.value)}
              placeholder="Ex: Básico, Intermediário, Avançado"
              className="w-full p-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Interpretação
            </label>
            <textarea
              value={range.interpretation}
              onChange={(e) => handleUpdateRange(idx, 'interpretation', e.target.value)}
              placeholder="Texto explicativo para esta faixa de pontuação..."
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm resize-none"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
