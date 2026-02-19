import React from 'react';
import { renderIcon } from '../../utils/iconRenderer';
import { getLucideIcon } from '../../utils/iconUtils';

/**
 * Componente de Gráfico de Radar SVG
 * Exibe indicadores em formato de radar com legenda
 */
export default function RadarChart({ indicatorResults = {}, indicatorMeta = {} }) {
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

  // Configurações do gráfico
  const centerX = 150;
  const centerY = 150;
  const radius = 120;
  const levels = 5; // Número de níveis (0%, 20%, 40%, 60%, 80%, 100%)
  const angleSlice = (Math.PI * 2) / entries.length;

  // Converter percentuais para coordenadas SVG
  const getCoordinates = (percentage, index) => {
    const angle = angleSlice * index - Math.PI / 2;
    const distance = (percentage / 100) * radius;
    return {
      x: centerX + distance * Math.cos(angle),
      y: centerY + distance * Math.sin(angle),
    };
  };

  // Gerar pontos para o polígono
  const polygonPoints = entries
    .map((entry, index) => {
      const percentage = entry[1]?.percentage || 0;
      const coords = getCoordinates(percentage, index);
      return `${coords.x},${coords.y}`;
    })
    .join(' ');

  // Gerar rótulos nos eixos
  const axisLabels = entries.map((entry, index) => {
    const coords = getCoordinates(radius + 30, index);
    const name = resolveName(entry[0], entry[1]);
    return {
      name,
      x: coords.x,
      y: coords.y,
      index,
    };
  });

  return (
    <div className="w-full flex flex-col">
      <h3 className="text-lg font-semibold mb-4 text-center">Radar</h3>
      
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Gráfico SVG */}
        <div className="flex-1 flex justify-center">
          <svg width="100%" height="auto" viewBox="0 0 400 400" className="max-w-sm">
            {/* Grid de níveis */}
            {Array.from({ length: levels + 1 }).map((_, i) => {
              const levelRadius = (radius / levels) * i;
              return (
                <circle
                  key={`level-${i}`}
                  cx={centerX}
                  cy={centerY}
                  r={levelRadius}
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth="1"
                />
              );
            })}

            {/* Linhas dos eixos */}
            {axisLabels.map((label) => (
              <line
                key={`axis-${label.index}`}
                x1={centerX}
                y1={centerY}
                x2={centerX + (radius + 30) * Math.cos(angleSlice * label.index - Math.PI / 2)}
                y2={centerY + (radius + 30) * Math.sin(angleSlice * label.index - Math.PI / 2)}
                stroke="#D1D5DB"
                strokeWidth="1"
              />
            ))}

            {/* Polígono dos dados */}
            <polygon
              points={polygonPoints}
              fill="#4F46E5"
              fillOpacity="0.1"
              stroke="#4F46E5"
              strokeWidth="2"
            />

            {/* Pontos dos dados */}
            {entries.map((entry, index) => {
              const percentage = entry[1]?.percentage || 0;
              const coords = getCoordinates(percentage, index);
              const meta = resolveMeta(entry[0], entry[1]);
              const color = meta.color || '#4F46E5';
              return (
                <circle
                  key={`point-${index}`}
                  cx={coords.x}
                  cy={coords.y}
                  r="9"
                  fill={color}
                  stroke="white"
                  strokeWidth="2"
                />
              );
            })}

            {/* Rótulos removidos - mantém apenas na legenda */}
          </svg>
        </div>

        {/* Legenda */}
        <div className="flex-1 lg:flex-0 lg:w-56 space-y-3">
          <h4 className="font-semibold text-sm text-gray-700">Legenda</h4>
          <div className="space-y-2">
            {entries.map((entry) => {
              const name = resolveName(entry[0], entry[1]);
              const percentage = entry[1]?.percentage || 0;
              const meta = resolveMeta(entry[0], entry[1]);
              const color = meta.color || '#4F46E5';
              const icon = meta.icon || 'circle';
              const IconComponent = icon ? getLucideIcon(icon) : null;

              return (
                <div key={name} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 transition">
                  {/* Ícone com cor de fundo - padrão dos cards */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: color }}
                  >
                    {IconComponent ? (
                      <IconComponent className="w-5 h-5 text-white" strokeWidth={2} />
                    ) : (
                      <span className="text-white text-sm font-bold">●</span>
                    )}
                  </div>
                  {/* Nome e percentual */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">{name}</p>
                    <p className="text-xs text-gray-500 font-semibold">{percentage}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
