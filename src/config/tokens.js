/**
 * DESIGN TOKENS
 * Centralização da identidade visual para fácil manutenção.
 */
export const TOKENS = {
  colors: {
    bg: "bg-[#EEF2FF]", // Indigo 50 (Tom mais azulado/frio)
    surface: "bg-white",
    ink: "text-[#1E1B4B]", // Indigo 950
    muted: "text-[#64748B]", // Slate 500
    accent: "text-[#4F46E5]", // Indigo 600
    accentBg: "bg-[#4F46E5]",
    forest: "bg-[#312E81]", // Indigo 900
    border: "border-[#C7D2FE]" // Indigo 200
  },
  fonts: {
    serif: "font-serif", // 'DM Serif Display'
    sans: "font-sans"    // 'Inter'
  }
};

// Opções de cores para indicadores (hex values)
export const COLOR_OPTIONS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#6366F1', // Indigo (default)
  '#6B7280', // Gray
];

// Opções de ícones disponíveis (nomes de ícones lucide-react)
export const ICON_OPTIONS = [
  'circle', // Círculo simples
  'heart', // Coração
  'star', // Estrela
  'zap', // Raio/Energia
  'flame', // Chama
  'target', // Alvo
  'activity', // Atividade
  'brain', // Cérebro
  'award', // Prêmio
  'trending-up', // Tendência de crescimento
];