import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const IntroductionEditor = ({ value, onChange, placeholder = 'Digite o conteúdo introdutório (HTML permitido)...' }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-700">Introdução do Assessment</label>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-[#4F46E5] hover:underline flex items-center gap-1"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-3 h-3" /> Recolher
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" /> Expandir
            </>
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="bg-blue-50 p-3 rounded text-xs text-blue-700 border border-blue-200 mb-3">
          <p className="font-semibold mb-1">💡 Dicas:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><code>&lt;h1&gt;Título&lt;/h1&gt;</code> - Cabeçalho grande</li>
            <li><code>&lt;p&gt;Texto&lt;/p&gt;</code> - Parágrafo</li>
            <li><code>&lt;strong&gt;Negrito&lt;/strong&gt;</code> - Texto em negrito</li>
            <li><code>&lt;ul&gt;&lt;li&gt;Item&lt;/li&gt;&lt;/ul&gt;</code> - Lista</li>
            <li><code>&lt;br/&gt;</code> - Quebra de linha</li>
          </ul>
        </div>
      )}

      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={6}
        className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
      />

      {value && (
        <details className="text-sm">
          <summary className="cursor-pointer text-[#4F46E5] hover:underline font-medium">
            Pré-visualização
          </summary>
          <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
            <div 
              className="prose prose-sm max-w-none text-gray-800"
              dangerouslySetInnerHTML={{ __html: value }}
            />
          </div>
        </details>
      )}
    </div>
  );
};

export default IntroductionEditor;
