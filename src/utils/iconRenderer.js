/**
 * Utility para renderizar ícones lucide-react dinamicamente
 */
import { createElement } from 'react';
import {
  Circle, Heart, Star, Zap, Flame, Target, Activity, Brain, Award, TrendingUp
} from 'lucide-react';

const iconMap = {
  circle: Circle,
  heart: Heart,
  star: Star,
  zap: Zap,
  flame: Flame,
  target: Target,
  activity: Activity,
  brain: Brain,
  award: Award,
  'trending-up': TrendingUp,
};

/**
 * Renderiza um ícone lucide-react dinamicamente
 * @param {string} iconName - Nome do ícone (chave em iconMap)
 * @param {object} props - Props passadas ao ícone (size, className, etc)
 * @returns {React.ReactElement}
 */
export function renderIcon(iconName, props = {}) {
  const IconComponent = iconMap[iconName] || iconMap.circle;
  return createElement(IconComponent, props);
}

/**
 * Retorna o componente de ícone para uso direto
 * @param {string} iconName - Nome do ícone
 * @returns {React.ComponentType}
 */
export function getIconComponent(iconName) {
  return iconMap[iconName] || iconMap.circle;
}
