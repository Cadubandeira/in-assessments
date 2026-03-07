import React from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';

export default function PreAssessmentFieldsEditor({ fields, onChange }) {
  const addField = () => {
    const newField = {
      id: `field-${Date.now()}`,
      label: '',
      type: 'text',
      is_required: false,
      placeholder: '',
      options: [],
      optionsText: '' // Texto bruto para edição do dropdown
    };
    onChange([...fields, newField]);
  };

  const updateField = (index, updates) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const removeField = (index) => {
    onChange(fields.filter((_, i) => i !== index));
  };

  const fieldTypes = [
    { value: 'text', label: 'Texto Aberto (uma linha)' },
    { value: 'textarea', label: 'Texto Aberto (múltiplas linhas)' },
    { value: 'dropdown', label: 'Seleção Única (Dropdown)' }
  ];

  return (
    <div className="space-y-4">
      {fields.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">Nenhum campo adicionado ainda.</p>
          <p className="text-xs mt-2">Clique em "Adicionar Campo" para começar.</p>
        </div>
      )}

      {fields.map((field, idx) => (
        <div key={field.id} className="p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-colors">
          {/* Cabeçalho com número da pergunta */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-bold text-gray-600">Campo {idx + 1}</span>
            </div>
            <button
              onClick={() => removeField(idx)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Remover campo"
            >
              <Trash2 className="w-3 h-3" /> Remover
            </button>
          </div>

          {/* Texto da Pergunta */}
          <div className="mb-4">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
              Texto da Pergunta *
            </label>
            <input
              type="text"
              value={field.label}
              onChange={(e) => updateField(idx, { label: e.target.value })}
              placeholder="Ex: Nome da Empresa"
              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-[#4F46E5] focus:outline-none transition-colors"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {/* Tipo de Resposta */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
                Tipo de Resposta *
              </label>
              <select
                value={field.type}
                onChange={(e) => updateField(idx, { type: e.target.value })}
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-[#4F46E5] focus:outline-none transition-colors"
              >
                {fieldTypes.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Checkbox Obrigatório */}
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.is_required}
                  onChange={(e) => updateField(idx, { is_required: e.target.checked })}
                  className="w-4 h-4 text-[#4F46E5] border-gray-300 rounded focus:ring-[#4F46E5]"
                />
                <span className="text-sm font-medium text-gray-700">Campo Obrigatório</span>
              </label>
            </div>
          </div>

          {/* Placeholder (apenas para campos de texto) */}
          {['text', 'textarea'].includes(field.type) && (
            <div className="mb-4">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
                Texto de Ajuda (Placeholder)
              </label>
              <input
                type="text"
                value={field.placeholder || ''}
                onChange={(e) => updateField(idx, { placeholder: e.target.value })}
                placeholder="Ex: Digite o nome completo da empresa..."
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-[#4F46E5] focus:outline-none transition-colors"
              />
            </div>
          )}

          {/* Opções do Dropdown */}
          {field.type === 'dropdown' && (
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
                Opções do Dropdown *
              </label>
              <textarea
                value={field.optionsText || field.options?.join('\n') || ''}
                onChange={(e) => {
                  // Armazenar texto bruto para permitir digitação livre
                  updateField(idx, { 
                    optionsText: e.target.value,
                    options: e.target.value.split('\n').map(o => o.trim()).filter(Boolean)
                  });
                }}
                placeholder="Digite uma opção por linha:&#10;Até 50&#10;51 a 200&#10;201 a 500&#10;Acima de 1.000"
                rows={5}
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-[#4F46E5] focus:outline-none transition-colors font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-2">
                Digite uma opção por linha. Pressione Enter para criar uma nova linha.
              </p>
              
              {/* Preview das opções */}
              {field.options?.length > 0 && (
                <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Preview ({field.options.length} {field.options.length === 1 ? 'opção' : 'opções'}):</p>
                  <select className="w-full p-2 border border-gray-300 rounded text-sm" disabled>
                    <option>Selecione...</option>
                    {field.options.map((opt, i) => (
                      <option key={i}>{opt}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Botão Adicionar Campo */}
      <button
        onClick={addField}
        className="inline-flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white rounded-lg font-semibold hover:shadow-lg transition-shadow"
      >
        <Plus className="w-4 h-4" /> Adicionar Campo
      </button>
    </div>
  );
}
