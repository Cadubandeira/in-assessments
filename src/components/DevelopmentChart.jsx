/**
 * Componente: DevelopmentChart
 * Exibe círculos de progresso dos indicadores ao redor de um avatar
 */

import React, { useMemo } from 'react';
import { Circle } from 'lucide-react';
import { getLucideIcon } from '../utils/iconUtils';

const DevelopmentChart = ({ indicators, user }) => {
  // Configurações do gráfico radial
  const AVATAR_RADIUS = 44; // Raio do avatar (px)
  const CIRCLE_RADIUS = 30; // Raio de cada círculo de progresso (px)
  const ORBITAL_DISTANCE_BASE = 110; // Distância base do avatar ao centro dos círculos (px)
  const SVG_BASE_SIZE = 320; // Tamanho base do SVG
  const CENTER_BASE = SVG_BASE_SIZE / 2;

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Usuário';
  const userInitial = displayName.charAt(0).toUpperCase();

  // Calcular configuração dos anéis baseado na quantidade de indicadores
  const ringConfig = useMemo(() => {
    const count = indicators.length;
    
    if (count <= 7) {
      // 1 anel
      return {
        rings: [{ distância: ORBITAL_DISTANCE_BASE, start: 0, end: count }],
        svgSize: SVG_BASE_SIZE,
        center: CENTER_BASE,
        hasMultipleRings: false
      };
    } else if (count <= 15) {
      // 2 anéis - espaçamento maior para evitar sobreposição
      const ring1Count = Math.ceil(count / 2);
      return {
        rings: [
          { distância: 100, start: 0, end: ring1Count },
          { distância: 185, start: ring1Count, end: count }
        ],
        svgSize: 430,
        center: 215,
        hasMultipleRings: true
      };
    } else {
      // 3 anéis - espaçamento ainda maior
      const ring1Count = Math.ceil(count / 3);
      const ring2Count = Math.ceil((count - ring1Count) / 2);
      return {
        rings: [
          { distância: 95, start: 0, end: ring1Count },
          { distância: 175, start: ring1Count, end: ring1Count + ring2Count },
          { distância: 265, start: ring1Count + ring2Count, end: count }
        ],
        svgSize: 540,
        center: 270,
        hasMultipleRings: true
      };
    }
  }, [indicators.length]);

  // Calcular posições dos círculos ao redor do avatar com suporte a múltiplos anéis
  const indicatorPositions = useMemo(() => {
    if (indicators.length === 0) return [];

    const { rings, center } = ringConfig;
    const positions = [];

    rings.forEach((ring) => {
      const ringIndicators = indicators.slice(ring.start, ring.end);
      const angleSlice = (Math.PI * 2) / ringIndicators.length;

      ringIndicators.forEach((indicator, index) => {
        const angle = angleSlice * index - Math.PI / 2;
        const x = center + ring.distância * Math.cos(angle);
        const y = center + ring.distância * Math.sin(angle);

        positions.push({
          ...indicator,
          x,
          y,
          angle: (angle * 180) / Math.PI
        });
      });
    });

    return positions;
  }, [indicators, ringConfig]);

  if (indicators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <Circle size={64} className="opacity-20 mb-3" />
        <p className="text-sm font-medium">Nenhum assessment realizado ainda</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 w-full">
      {/* Grafico Radial */}
      <div className="flex justify-center w-full overflow-visible">
        <svg
          width={ringConfig.svgSize}
          height={ringConfig.svgSize}
          viewBox={`0 0 ${ringConfig.svgSize} ${ringConfig.svgSize}`}
          className="drop-shadow-lg"
          style={{ display: 'block' }}
        >
          {/* Avatar no Centro */}
          <g>
            <circle
              cx={ringConfig.center}
              cy={ringConfig.center}
              r={AVATAR_RADIUS}
              fill="url(#avatarGradient)"
              className="drop-shadow-md"
            />
            <foreignObject
              x={ringConfig.center - AVATAR_RADIUS}
              y={ringConfig.center - AVATAR_RADIUS}
              width={AVATAR_RADIUS * 2}
              height={AVATAR_RADIUS * 2}
            >
              <div className="w-full h-full flex items-center justify-center">
                <span
                  className="text-white font-bold select-none"
                  style={{ fontSize: `${AVATAR_RADIUS * 0.8}px`, lineHeight: 1 }}
                >
                  {userInitial}
                </span>
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
                  x1={ringConfig.center}
                  y1={ringConfig.center}
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
