import React, { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';

const OverallRangesEditor = ({ ranges, onChange }) => {
  const [newRange, setNewRange] = useState({
    min_score: '',
    max_score: '',
    label: '',
    interpretation: ''
  });
  const [editingId, setEditingId] = useState(null);

  // Validar que min_score e max_score não são apenas espaços em branco e são números válidos
  const isValidScore = (value) => {
    const trimmed = String(value).trim();
    if (!trimmed) return false;
    const num = Number(trimmed);
    return !isNaN(num) && isFinite(num);
  };

  const handleAddRange = () => {
    const minStr = String(newRange.min_score).trim();
    const maxStr = String(newRange.max_score).trim();
    const label = String(newRange.label).trim();

    if (!minStr || !maxStr || !label) {
      alert('Preencha min_score, max_score e label');
      return;
    }

    if (!isValidScore(minStr) || !isValidScore(maxStr)) {
      alert('Min Score e Max Score devem ser números válidos');
      return;
    }

    const minNum = Number(minStr);
    const maxNum = Number(maxStr);

    if (minNum > maxNum) {
      alert('Min Score não pode ser maior que Max Score');
      return;
    }

    // Gerar ID único usando timestamp + random
    const rangeObj = {
      id: `tmp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      min_score: minNum,
      max_score: maxNum,
      label: label,
      interpretation: String(newRange.interpretation).trim()
    };

    onChange([...ranges, rangeObj]);
    setNewRange({ min_score: '', max_score: '', label: '', interpretation: '' });
  };

  const handleDeleteRange = (id) => {
    onChange(ranges.filter(r => r.id !== id));
  };

  const handleUpdateRange = (id, field, value) => {
    onChange(
      ranges.map(r =>
        r.id === id
          ? { 
              ...r, 
              [field]: field.includes('_score') 
                ? (isValidScore(value) ? Number(value) : r[field])
                : String(value)
            }
          : r
      )
    );
  };

  const sortedRanges = [...ranges].sort((a, b) => a.min_score - b.min_score);

  return (
    <div className="space-y-4 p-4 border border-gray-300 rounded-lg bg-gray-50">
      <h3 className="text-lg font-bold text-gray-800">Faixas de Interpretação (Resultado Global)</h3>

      {/* Lista de Faixas */}
      {sortedRanges.length > 0 && (
        <div className="space-y-3">
          {sortedRanges.map((range) => (
            <div key={range.id} className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase block mb-1">
                    Pontuação Mínima
                  </label>
                  <input
                    type="number"
                    value={range.min_score}
                    onChange={(e) => handleUpdateRange(range.id, 'min_score', e.target.value)}
                    placeholder="Ex: 0"
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase block mb-1">
                    Pontuação Máxima
                  </label>
                  <input
                    type="number"
                    value={range.max_score}
                    onChange={(e) => handleUpdateRange(range.id, 'max_score', e.target.value)}
                    placeholder="Ex: 100"
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase block mb-1">
                  Label da Faixa
                </label>
                <input
                  type="text"
                  value={range.label}
                  onChange={(e) => handleUpdateRange(range.id, 'label', e.target.value)}
                  placeholder="Ex: Iniciante, Intermediário, Avançado"
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase block mb-1">
                  Interpretação (opcional)
                </label>
                <textarea
                  value={range.interpretation}
                  onChange={(e) => handleUpdateRange(range.id, 'interpretation', e.target.value)}
                  placeholder="Descrição da faixa..."
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                />
              </div>

              <button
                type="button"
                onClick={() => handleDeleteRange(range.id)}
                className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-800 font-medium"
              >
                <Trash2 className="w-4 h-4" /> Deletar Faixa
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Form para Adicionar Nova Faixa */}
      <div className="bg-white p-4 rounded-lg border border-dashed border-gray-300 space-y-3">
        <h4 className="font-semibold text-gray-700">Adicionar Nova Faixa</h4>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase block mb-1">
              Min Score
            </label>
            <input
              type="number"
              value={newRange.min_score}
              onChange={(e) => setNewRange({ ...newRange, min_score: e.target.value })}
              placeholder="Ex: 0"
              className="w-full p-2 border border-gray-300 rounded text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase block mb-1">
              Max Score
            </label>
            <input
              type="number"
              value={newRange.max_score}
              onChange={(e) => setNewRange({ ...newRange, max_score: e.target.value })}
              placeholder="Ex: 100"
              className="w-full p-2 border border-gray-300 rounded text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase block mb-1">
            Label
          </label>
          <input
            type="text"
            value={newRange.label}
            onChange={(e) => setNewRange({ ...newRange, label: e.target.value })}
            placeholder="Ex: Iniciante"
            className="w-full p-2 border border-gray-300 rounded text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase block mb-1">
            Interpretação (Opcional)
          </label>
          <textarea
            value={newRange.interpretation}
            onChange={(e) => setNewRange({ ...newRange, interpretation: e.target.value })}
            placeholder="Descrição..."
            rows={2}
            className="w-full p-2 border border-gray-300 rounded text-sm"
          />
        </div>

        <button
          type="button"
          onClick={handleAddRange}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#4F46E5] text-white rounded-lg hover:bg-[#312E81] font-semibold"
        >
          <Plus className="w-4 h-4" /> Adicionar Faixa
        </button>
      </div>

      {/* Resumo */}
      {sortedRanges.length > 0 && (
        <div className="bg-blue-50 p-3 rounded text-sm text-blue-900 border border-blue-200">
          <strong>Total:</strong> {sortedRanges.length} faixa(s) configurada(s)
        </div>
      )}
    </div>
  );
};

export default OverallRangesEditor;
