import React from 'react';
import { renderIcon } from '../../utils/iconRenderer';

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
    return {
      name: entry[0],
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
              const color = indicatorMeta[entry[0]]?.color || '#4F46E5';
              return (
                <circle
                  key={`point-${index}`}
                  cx={coords.x}
                  cy={coords.y}
                  r="5"
                  fill={color}
                  stroke="white"
                  strokeWidth="2"
                />
              );
            })}

            {/* Rótulos */}
            {axisLabels.map((label, i) => (
              <text
                key={`label-${i}`}
                x={label.x}
                y={label.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="12"
                fill="#374151"
                fontWeight="500"
                className="pointer-events-none select-none"
              >
                {label.name}
              </text>
            ))}
          </svg>
        </div>

        {/* Legenda */}
        <div className="flex-1 lg:flex-0 lg:w-56 space-y-3">
          <h4 className="font-semibold text-sm text-gray-700">Legenda</h4>
          <div className="space-y-2">
            {entries.map((entry) => {
              const name = entry[0];
              const percentage = entry[1]?.percentage || 0;
              const meta = indicatorMeta[name] || {};
              const color = meta.color || '#4F46E5';
              const icon = meta.icon || 'circle';

              return (
                <div key={name} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 transition">
                  {/* Ícone com cor de fundo */}
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    <span className="text-xs font-bold text-white">●</span>
                  </div>
                  {/* Nome e percentual */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">{name}</p>
                    <p className="text-xs text-gray-500">{percentage}%</p>
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
