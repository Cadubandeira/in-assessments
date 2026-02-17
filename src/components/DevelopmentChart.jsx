/**
 * Componente: DevelopmentChart
 * Exibe círculos de progresso dos indicadores ao redor de um avatar
 */

import React, { useMemo } from 'react';
import { User, Circle } from 'lucide-react';
import { getLucideIcon } from '../utils/iconUtils';

const DevelopmentChart = ({ indicators, user }) => {
  // Configurações do gráfico radial
  const AVATAR_RADIUS = 40; // Raio do avatar (px)
  const CIRCLE_RADIUS = 30; // Raio de cada círculo de progresso (px)
  const ORBITAL_DISTANCE = 110; // Distância do avatar ao centro dos círculos (px)
  const SVG_SIZE = 320; // Tamanho do SVG
  const CENTER = SVG_SIZE / 2;

  // Calcular posições dos círculos ao redor do avatar
  const indicatorPositions = useMemo(() => {
    if (indicators.length === 0) return [];

    const angleSlice = (Math.PI * 2) / indicators.length;

    return indicators.map((indicator, index) => {
      const angle = angleSlice * index - Math.PI / 2;
      const x = CENTER + ORBITAL_DISTANCE * Math.cos(angle);
      const y = CENTER + ORBITAL_DISTANCE * Math.sin(angle);

      return {
        ...indicator,
        x,
        y,
        angle: (angle * 180) / Math.PI
      };
    });
  }, [indicators]);

  if (indicators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <Circle size={64} className="opacity-20 mb-3" />
        <p className="text-sm font-medium">Nenhum assessment realizado ainda</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Grafico Radial */}
      <div className="flex justify-center w-full">
        <svg
          width={SVG_SIZE}
          height={SVG_SIZE}
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          className="drop-shadow-lg"
        >
          {/* Avatar no Centro */}
          <g>
            <circle
              cx={CENTER}
              cy={CENTER}
              r={AVATAR_RADIUS}
              fill="url(#avatarGradient)"
              className="drop-shadow-md"
            />
            <foreignObject
              x={CENTER - AVATAR_RADIUS}
              y={CENTER - AVATAR_RADIUS}
              width={AVATAR_RADIUS * 2}
              height={AVATAR_RADIUS * 2}
            >
              <div className="w-full h-full flex items-center justify-center">
                <User size={AVATAR_RADIUS * 1.5} className="text-white" />
              </div>
            </foreignObject>
          </g>

          {/* Círculos de Progresso dos Indicadores */}
          {indicatorPositions.map((indicator, idx) => {
            const circumference = 2 * Math.PI * CIRCLE_RADIUS;
            const strokeDashoffset =
              circumference - (indicator.percentage / 100) * circumference;

            return (
              <g key={indicator.id}>
                {/* Linha conectando ao avatar (opcional, remove para minimalista) */}
                <line
                  x1={CENTER}
                  y1={CENTER}
                  x2={indicator.x}
                  y2={indicator.y}
                  stroke={indicator.color}
                  strokeWidth="1"
                  opacity="0.2"
                  strokeDasharray="2,2"
                />

                {/* Círculo de fundo */}
                <circle
                  cx={indicator.x}
                  cy={indicator.y}
                  r={CIRCLE_RADIUS}
                  fill="white"
                  stroke={indicator.color}
                  strokeWidth="1"
                  opacity="0.1"
                  className="drop-shadow-sm"
                />

                {/* Círculo de progresso */}
                <circle
                  cx={indicator.x}
                  cy={indicator.y}
                  r={CIRCLE_RADIUS}
                  fill="none"
                  stroke={indicator.color}
                  strokeWidth="3"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                  style={{
                    transform: `rotate(${-90}deg)`,
                    transformOrigin: `${indicator.x}px ${indicator.y}px`
                  }}
                />

                {/* Percentual no centro do círculo */}
                <text
                  x={indicator.x}
                  y={indicator.y}
                  textAnchor="middle"
                  dy="0.3em"
                  className="text-xs font-bold"
                  fill={indicator.color}
                  fontSize="14"
                  fontWeight="700"
                >
                  {indicator.percentage}%
                </text>
              </g>
            );
          })}

          {/* Gradiente para avatar */}
          <defs>
            <linearGradient
              id="avatarGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#4F46E5" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Indicadores (abaixo) */}
      <div className="w-full flex flex-col gap-3">
        <h4 className="text-sm font-bold text-[#1E1B4B]">Indicadores</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {indicatorPositions.map((indicator) => {
            const IconComponent = getLucideIcon(indicator.icon);
            return (
              <div
                key={indicator.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-white"
              >
                {/* Icone + Cor */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: indicator.color || '#6366F1' }}
                >
                  {IconComponent ? (
                    <IconComponent className="w-5 h-5 text-white" />
                  ) : (
                    <Circle className="w-5 h-5 text-white" />
                  )}
                </div>

                {/* Nome e Valor */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1E1B4B] truncate">
                    {indicator.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {indicator.percentage} / 100
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DevelopmentChart;
