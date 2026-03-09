import React from 'react';

// Função para gerar cor baseada no nome do nível (determinístico)
const generateColorFromName = (name) => {
  // Mapeamento específico para níveis Bronze, Prata, Ouro, Platina
  const nameLower = name.toLowerCase();
  if (nameLower.includes('bronze')) {
    return { bg: 'bg-amber-100', border: 'border-amber-600', text: 'text-amber-800', glow: 'shadow-amber-600/30' };
  }
  if (nameLower.includes('prata')) {
    return { bg: 'bg-gray-100', border: 'border-gray-400', text: 'text-gray-700', glow: 'shadow-gray-400/30' };
  }
  if (nameLower.includes('ouro')) {
    return { bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-800', glow: 'shadow-yellow-500/30' };
  }
  if (nameLower.includes('platina')) {
    return { bg: 'bg-slate-100', border: 'border-slate-400', text: 'text-slate-800', glow: 'shadow-slate-400/30' };
  }
  
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

  // Gerar índice determinístico baseado no nome
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Converter para 32-bit integer
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
  
  // Buscar match exato ou parcial
  for (const [key, emoji] of Object.entries(emojis)) {
    if (lowerName.includes(key)) {
      return emoji;
    }
  }

  // Fallback: usar primeira letra como base para emoji genérico
  return '⭐';
};

export default function LevelBadge({ level, isAchieved = true, onClick = null, interactive = false }) {
  const color = generateColorFromName(level.name);
  const emoji = generateEmojiFromName(level.name);

  const baseClasses = `
    flex flex-col items-center justify-center
    p-4 rounded-2xl border-2 transition-all
    ${color.bg} ${color.border} ${color.text}
  `;

  const interactiveClasses = interactive
    ? 'cursor-pointer hover:shadow-lg hover:scale-105 active:scale-95'
    : '';

  const disabledClasses = !isAchieved
    ? 'opacity-50 grayscale'
    : `shadow-lg ${color.glow}`;

  return (
    <div
      className={`${baseClasses} ${interactiveClasses} ${disabledClasses}`}
      onClick={interactive && isAchieved ? onClick : undefined}
      style={{
        minWidth: '100px',
        aspectRatio: '1 / 1',
      }}
    >
      <div className="text-4xl mb-2">{emoji}</div>
      <div className="text-center">
        <p className="font-bold text-sm leading-tight">{level.name}</p>
        {isAchieved && (
          <p className="text-xs opacity-75 mt-1">✓ Obtido</p>
        )}
      </div>
    </div>
  );
}
