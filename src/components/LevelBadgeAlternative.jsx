import React from 'react';

/**
 * Alternativa visual para exibição do nível conquistado
 * Design: Achievement Card estilo troféu/medalha com background gradiente
 */
export default function LevelBadgeAlternative({ level, isAchieved = true }) {
  // Gerar cor determinística baseada no nome do nível
  const generateColorFromName = (name) => {
    // Mapeamento específico para níveis Bronze, Prata, Ouro, Platina
    const nameLower = name.toLowerCase();
    if (nameLower.includes('bronze')) {
      return { bg: 'from-amber-700 to-orange-800', text: 'text-amber-900', border: 'border-amber-600' };
    }
    if (nameLower.includes('prata')) {
      return { bg: 'from-gray-300 to-gray-500', text: 'text-gray-900', border: 'border-gray-400' };
    }
    if (nameLower.includes('ouro')) {
      return { bg: 'from-yellow-400 to-yellow-600', text: 'text-yellow-900', border: 'border-yellow-500' };
    }
    if (nameLower.includes('platina')) {
      return { bg: 'from-slate-300 to-blue-400', text: 'text-slate-900', border: 'border-slate-400' };
    }
    
    const colors = [
      { bg: 'from-yellow-400 to-yellow-500', text: 'text-yellow-900', border: 'border-yellow-300' },
      { bg: 'from-blue-400 to-blue-500', text: 'text-blue-900', border: 'border-blue-300' },
      { bg: 'from-purple-400 to-purple-500', text: 'text-purple-900', border: 'border-purple-300' },
      { bg: 'from-red-400 to-red-500', text: 'text-red-900', border: 'border-red-300' },
      { bg: 'from-green-400 to-green-500', text: 'text-green-900', border: 'border-green-300' },
      { bg: 'from-indigo-400 to-indigo-500', text: 'text-indigo-900', border: 'border-indigo-300' },
      { bg: 'from-pink-400 to-pink-500', text: 'text-pink-900', border: 'border-pink-300' },
      { bg: 'from-cyan-400 to-cyan-500', text: 'text-cyan-900', border: 'border-cyan-300' },
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash) + name.charCodeAt(i);
      hash = hash & hash;
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Gerar emoji determinístico
  const generateEmojiFromName = (name) => {
    const nameLower = name.toLowerCase();
    const emojiMap = {
      bronze: '🥉',
      prata: '🥈',
      ouro: '🥇',
      platina: '💎',
      diamante: '✨',
      cristal: '🔮',
      lendário: '👑',
      mítico: '🌟',
    };
    
    for (const [key, emoji] of Object.entries(emojiMap)) {
      if (nameLower.includes(key)) return emoji;
    }
    return '⭐';
  };

  const color = generateColorFromName(level?.name || '');
  const emoji = generateEmojiFromName(level?.name || '');

  if (!isAchieved) {
    return (
      <div className="flex flex-col items-center justify-center p-4 sm:p-5 bg-gray-100 rounded-2xl border-2 border-dashed border-gray-300 opacity-50">
        <div className="text-4xl mb-2">⭕</div>
        <p className="text-xs text-gray-500 font-medium text-center">Não alcançado</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Card principal com gradiente */}
      <div className={`relative bg-gradient-to-br ${color.bg} rounded-2xl p-6 sm:p-8 shadow-lg overflow-hidden group cursor-default`}>
        {/* Decoração de fundo */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full blur-3xl"></div>
        </div>

        {/* Conteúdo */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Emoji grande - estilo troféu */}
          <div className="text-6xl sm:text-7xl mb-3 drop-shadow-lg transform transition-transform group-hover:scale-110 duration-300">
            {emoji}
          </div>

          {/* Nome do nível */}
          <h3 className={`text-xl sm:text-2xl font-bold ${color.text} text-center drop-shadow`}>
            {level?.name}
          </h3>

          {/* Badge "Conquistado" */}
          <div className="mt-3 px-3 py-1 bg-white/30 backdrop-blur-sm rounded-full border border-white/50">
            <span className="text-xs sm:text-sm font-bold text-white uppercase tracking-widest">
              ✓ Conquistado
            </span>
          </div>
        </div>

        {/* Borda com efeito */}
        <div className={`absolute inset-0 rounded-2xl border-2 ${color.border} pointerevents-none`}></div>
      </div>

      {/* Sombra decorativa abaixo */}
      <div className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4/5 h-2 bg-gradient-to-r ${color.bg} rounded-full blur-xl opacity-30`}></div>
    </div>
  );
}
