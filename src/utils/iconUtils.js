/**
 * Icon Utils
 * Resolve icones do Lucide React a partir do nome salvo no indicador
 */

import * as LucideIcons from 'lucide-react';

const DEFAULT_ICON = LucideIcons.Circle;

const toPascalCase = (value) => {
  if (!value) return '';
  return String(value)
    .replace(/[_\-\s]+(.)?/g, (_, chr) => (chr ? chr.toUpperCase() : ''))
    .replace(/^(.)/, (chr) => chr.toUpperCase());
};

/**
 * Obtém um componente Lucide baseado no nome do ícone
 * @param {string} iconName - Nome do ícone em kebab-case (ex: 'check-circle')
 * @returns {React.Component|null} Componente Lucide ou null se não encontrado
 */
export const getLucideIcon = (iconName) => {
  if (!iconName) return DEFAULT_ICON;

  const trimmed = String(iconName).trim();
  const pascalName = toPascalCase(trimmed);

  return LucideIcons[pascalName]
    || LucideIcons[trimmed]
    || DEFAULT_ICON;
};

/**
 * Retorna o nome normalizado do ícone
 * @param {string} iconName - Nome do ícone
 * @returns {string} Nome normalizado em kebab-case
 */
export const normalizeIconName = (iconName) => {
  if (!iconName) return 'circle';
  return String(iconName).toLowerCase().trim();
};
