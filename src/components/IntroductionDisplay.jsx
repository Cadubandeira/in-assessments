import React from 'react';
import { X } from 'lucide-react';

const IntroductionDisplay = ({ html, onClose }) => {
  if (!html) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl max-h-[90vh] overflow-y-auto relative">
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition"
          aria-label="Fechar"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        {/* Conteúdo */}
        <div className="p-8">
          <div 
            className="prose prose-sm max-w-none text-gray-800 space-y-4"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          {/* Botão para continuar */}
          <button
            onClick={onClose}
            className="w-full mt-8 px-6 py-3 bg-[#4F46E5] text-white font-semibold rounded-lg hover:bg-[#312E81] transition"
          >
            Entendi, Vou Começar
          </button>
        </div>
      </div>
    </div>
  );
};

export default IntroductionDisplay;
