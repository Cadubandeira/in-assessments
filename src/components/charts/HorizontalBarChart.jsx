import React from 'react';
import { getLucideIcon } from '../../utils/iconUtils';

/**
 * Componente de Gráfico de Barras Horizontal
 * Exibe indicadores em formato de barras horizontais
 */
export default function HorizontalBarChart({ indicatorResults = {}, indicatorMeta = {} }) {
  // Validar dados
  const entries = Object.entries(indicatorResults || {});
  if (entries.length === 0) {
    return <div className="p-4 text-center text-gray-600">Sem dados para exibir</div>;
  }

  const resolveMeta = (key, value) => {
    if (indicatorMeta[key]) return indicatorMeta[key];
    if (value?.indicator_id && indicatorMeta[value.indicator_id]) return indicatorMeta[value.indicator_id];
    if (value?.name && indicatorMeta[value.name]) return indicatorMeta[value.name];
    return {};
  };

  const resolveName = (key, value) => {
    const meta = resolveMeta(key, value);
    return value?.name || meta?.name || key;
  };

  // Encontrar percentual máximo para escala
  const maxPercentage = Math.max(...entries.map(e => e[1]?.percentage || 0), 100);

  return (
    <div className="w-full flex flex-col">
      {/* Gráfico de barras */}
      <div className="space-y-4">
        {entries.map((entry, index) => {
          const name = resolveName(entry[0], entry[1]);
          const percentage = entry[1]?.percentage || 0;
          const classification = entry[1]?.classification || '';
          const meta = resolveMeta(entry[0], entry[1]);
          const color = meta.color || '#8B5CF6';
          const icon = meta.icon || 'circle';
          const IconComponent = icon ? getLucideIcon(icon) : null;

          return (
            <div key={name} className="space-y-1">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {/* Ícone com cor de fundo */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {IconComponent ? (
                      <IconComponent className="w-4 h-4 text-white" strokeWidth={2.5} />
                    ) : (
                      <span className="text-white text-xs font-bold">●</span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-700 truncate">{name}</span>
                </div>
                <span className="text-sm font-semibold text-gray-800 flex-shrink-0">{percentage}%</span>
              </div>
              {/* Barra */}
              <div className="w-full h-8 bg-gray-100 rounded-full overflow-hidden">
                {percentage > 0 && (
                  <div
                    className="h-full transition-all duration-500 ease-out flex items-center justify-end"
                    style={{
                      width: `${Math.min(percentage, 100)}%`,
                      backgroundColor: color,
                      borderRadius: percentage < 100 ? '9999px 0 0 9999px' : '9999px',
                      paddingRight: percentage > 20 ? '8px' : '0',
                    }}
                  >
                    {percentage > 20 && (
                      <span className="text-xs font-bold text-white">{percentage}%</span>
                    )}
                  </div>
                )}
              </div>
              {/* Classificação */}
              {classification && (
                <div className="text-xs text-gray-500 pl-10">
                  {classification}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
