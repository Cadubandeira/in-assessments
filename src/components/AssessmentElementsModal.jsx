import React from 'react';
import { X, Plus, Trash2, FileText, MessageSquare, Lightbulb } from 'lucide-react';

/**
 * AssessmentElementsModal
 * Modal para adicionar elementos opcionais ao assessment:
 * - Pré-Assessment (campos antes do assessment)
 * - Introdução (texto HTML no início)
 * - Introdução ao Resultado
 * - Reflexão Final
 */
export default function AssessmentElementsModal({ 
  isOpen, 
  onClose, 
  elements, 
  onToggleElement 
}) {
  if (!isOpen) return null;

  const availableElements = [
    {
      id: 'introduction',
      icon: FileText,
      title: 'Introdução',
      description: 'Texto HTML exibido no início do assessment para contextualizar o usuário.',
      enabled: elements.introduction
    },
    {
      id: 'preAssessment',
      icon: MessageSquare,
      title: 'Pré-Assessment',
      description: 'Campos customizados para coletar dados contextuais antes do assessment começar (ex: nome da empresa, segmento, tamanho).',
      enabled: elements.preAssessment
    },
    {
      id: 'resultIntroduction',
      icon: FileText,
      title: 'Introdução ao Resultado',
      description: 'Texto exibido no topo da página de resultado para contextualizar o score obtido.',
      enabled: elements.resultIntroduction
    },
    {
      id: 'finalReflection',
      icon: Lightbulb,
      title: 'Reflexão Final',
      description: 'Texto exibido ao final do resultado com recomendações e próximos passos.',
      enabled: elements.finalReflection
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] px-6 py-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Adicionar Elementos</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <p className="text-sm text-gray-600 mb-6">
            Selecione os elementos opcionais que deseja adicionar ao seu assessment. 
            Cada elemento será exibido na configuração para personalização.
          </p>

          <div className="space-y-4">
            {availableElements.map((element) => {
              const Icon = element.icon;
              const isEnabled = element.enabled;

              return (
                <div
                  key={element.id}
                  className={`border-2 rounded-xl p-5 transition-all ${
                    isEnabled
                      ? 'border-[#4F46E5] bg-indigo-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isEnabled
                          ? 'bg-[#4F46E5] text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-bold mb-1 ${
                        isEnabled ? 'text-[#4F46E5]' : 'text-gray-900'
                      }`}>
                        {element.title}
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {element.description}
                      </p>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => onToggleElement(element.id)}
                      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all flex-shrink-0 ${
                        isEnabled
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-[#4F46E5] text-white hover:bg-[#312E81]'
                      }`}
                    >
                      {isEnabled ? (
                        <span className="flex items-center gap-1">
                          <Trash2 className="w-4 h-4" />
                          Remover
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Plus className="w-4 h-4" />
                          Adicionar
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#4F46E5] text-white rounded-lg font-semibold hover:bg-[#312E81] transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
