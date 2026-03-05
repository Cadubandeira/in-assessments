import React from 'react';
import { X } from 'lucide-react';

// Função para gerar cor baseada no nome do nível
const generateColorFromName = (name) => {
  const colors = [
    { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-700', glow: 'shadow-yellow-400/30' },
    { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-700', glow: 'shadow-blue-400/30' },
    { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-700', glow: 'shadow-purple-400/30' },
    { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-700', glow: 'shadow-red-400/30' },
    { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-700', glow: 'shadow-green-400/30' },
    { bg: 'bg-indigo-100', border: 'border-indigo-400', text: 'text-indigo-700', glow: 'shadow-indigo-400/30' },
    { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-700', glow: 'shadow-pink-400/30' },
    { bg: 'bg-cyan-100', border: 'border-cyan-400', text: 'text-cyan-700', glow: 'shadow-cyan-400/30' },
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

// Função para gerar emoji baseado no nome
const generateEmojiFromName = (name) => {
  const emojis = {
    'bronze': '🥉',
    'prata': '🥈',
    'ouro': '🥇',
    'platina': '💎',
    'diamante': '💠',
    'starter': '⭐',
    'iniciante': '🌱',
    'intermediário': '📈',
    'avançado': '🚀',
    'expert': '👑',
    'master': '🎖️',
  };

  const lowerName = name.toLowerCase();
  
  for (const [key, emoji] of Object.entries(emojis)) {
    if (lowerName.includes(key)) {
      return emoji;
    }
  }

  return '⭐';
};

export default function LevelDetailModal({ isOpen, level, onClose }) {
  if (!isOpen || !level) return null;

  const color = generateColorFromName(level.name);
  const emoji = generateEmojiFromName(level.name);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-200">
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        {/* Emblema */}
        <div className={`
          mx-auto mb-6 w-24 h-24 flex items-center justify-center
          rounded-2xl border-2 ${color.bg} ${color.border}
          ${color.glow} shadow-lg
        `}>
          <div className="text-6xl">{emoji}</div>
        </div>

        {/* Título do Nível */}
        <h2 className={`text-2xl font-bold text-center mb-2 ${color.text}`}>
          {level.name}
        </h2>

        {/* Descrição */}
        {level.description && (
          <p className="text-gray-700 text-center mb-6 leading-relaxed">
            {level.description}
          </p>
        )}

        {/* Informações Adicionais */}
        <div className="space-y-3 mb-6 p-4 bg-gray-50 rounded-lg">
          {level.levelScore !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium">Pontos Obtidos:</span>
              <span className="font-bold text-lg">{Math.round(level.levelScore)}</span>
            </div>
          )}
          {level.maxLevelScore !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium">Pontos Máximos:</span>
              <span className="font-bold text-lg">{Math.round(level.maxLevelScore)}</span>
            </div>
          )}
          {level.acquire_threshold !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium">Pontos Necessários:</span>
              <span className="font-bold text-lg">{Math.round(level.acquire_threshold)}</span>
            </div>
          )}
        </div>

        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className={`w-full py-3 rounded-lg font-semibold transition-all ${color.bg} ${color.text} ${color.border} border-2 hover:shadow-lg`}
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
