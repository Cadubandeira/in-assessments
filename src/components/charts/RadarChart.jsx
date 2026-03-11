import React, { useState } from 'react';
import { getLucideIcon } from '../../utils/iconUtils';
import { Zap, ChevronDown } from 'lucide-react';

/**
 * Componente de Gráfico de Radar SVG - Estilo Futurista SaaS
 * Exibe indicadores em formato de radar com design moderno e efeitos neon
 */
export default function RadarChart({ indicatorResults = {}, indicatorMeta = {}, hideLegend = false, defaultLegendOpen = false }) {
  // Estado do accordion
  const [isLegendOpen, setIsLegendOpen] = useState(defaultLegendOpen);

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
  const centerX = 200;
  const centerY = 200;
  const maxRadius = 140;
  const iconRadius = maxRadius + 35;
  const levels = 5;
  const angleSlice = (Math.PI * 2) / entries.length;

  // Converter percentuais para coordenadas SVG
  const getCoordinates = (percentage, index, customRadius = maxRadius) => {
    const angle = angleSlice * index - Math.PI / 2;
    const distance = (percentage / 100) * customRadius;
    return {
      x: centerX + distance * Math.cos(angle),
      y: centerY + distance * Math.sin(angle),
    };
  };

  // Gerar pontos para o polígono dos dados
  const polygonPoints = entries
    .map((entry, index) => {
      const percentage = entry[1]?.percentage || 0;
      const coords = getCoordinates(percentage, index);
      return `${coords.x},${coords.y}`;
    })
    .join(' ');

  // Path para polígono com curvas suaves que passam pelos pontos exatos
  const smoothPath = (() => {
    if (entries.length === 0) return '';
    
    const points = entries.map((entry, index) => {
      const percentage = entry[1]?.percentage || 0;
      return getCoordinates(percentage, index);
    });
    
    if (points.length < 3) {
      // Se houver menos de 3 pontos, usar linhas retas
      return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ') + ' Z';
    }
    
    // Criar path com curvas que passam pelos pontos
    let path = `M ${points[0].x},${points[0].y}`;
    
    for (let i = 0; i < points.length; i++) {
      const current = points[i];
      const next = points[(i + 1) % points.length];
      const prev = points[(i - 1 + points.length) % points.length];
      const nextNext = points[(i + 2) % points.length];
      
      // Calcular pontos de controle para curva suave que passa pelo ponto
      const tension = 0.3; // Controla o quanto a curva é suave (0-1)
      
      // Vetor direção do ponto anterior para o próximo
      const dx1 = (next.x - prev.x) * tension;
      const dy1 = (next.y - prev.y) * tension;
      
      // Vetor direção do ponto atual para o próximo próximo
      const dx2 = (nextNext.x - current.x) * tension;
      const dy2 = (nextNext.y - current.y) * tension;
      
      // Pontos de controle
      const cp1x = current.x + dx1;
      const cp1y = current.y + dy1;
      const cp2x = next.x - dx2;
      const cp2y = next.y - dy2;
      
      // Curva cúbica de Bézier que passa pelos pontos
      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`;
    }
    
    return path;
  })();

  return (
    <div className="w-full flex flex-col">
      {/* Gráfico SVG */}
      <div className="flex items-center justify-center pb-6">
        <div 
          className="relative cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => setIsLegendOpen(!isLegendOpen)}
          title="Clique para ver a legenda"
        >
          <svg 
            viewBox="0 0 400 400" 
            className="w-full h-auto max-w-md drop-shadow-2xl"
            style={{ filter: 'drop-shadow(0 0 40px rgba(79, 70, 229, 0.15))' }}
          >
              <defs>
                {/* Gradiente radial para o fundo */}
                <radialGradient id="bgGradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#F8F9FF" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#EEF2FF" stopOpacity="0.6" />
                </radialGradient>

                {/* Gradiente para o polígono de dados */}
                <radialGradient id="dataGradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.2" />
                </radialGradient>

                {/* Filtro de glow para a linha */}
                <filter id="glow">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>

                {/* Filtro de glow suave para o centro */}
                <filter id="centerGlow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* Grid de níveis (círculos concêntricos) */}
              {Array.from({ length: levels + 1 }).map((_, i) => {
                const levelRadius = (maxRadius / levels) * i;
                return (
                  <circle
                    key={`level-${i}`}
                    cx={centerX}
                    cy={centerY}
                    r={levelRadius}
                    fill="none"
                    stroke="#C7D2FE"
                    strokeWidth={i === levels ? "2.5" : "1.5"}
                    strokeOpacity={i === levels ? "0.8" : "0.5"}
                  />
                );
              })}

              {/* Linhas dos eixos radiais */}
              {entries.map((_, index) => {
                const endCoords = getCoordinates(100, index);
                return (
                  <line
                    key={`axis-${index}`}
                    x1={centerX}
                    y1={centerY}
                    x2={endCoords.x}
                    y2={endCoords.y}
                    stroke="#A5B4FC"
                    strokeWidth="2"
                    strokeOpacity="0.6"
                    strokeDasharray="4,4"
                  />
                );
              })}

              {/* Polígono dos dados com gradiente */}
              <path
                d={smoothPath}
                fill="url(#dataGradient)"
                fillOpacity="0.35"
              />

              {/* Linha do polígono com efeito glow e junções arredondadas */}
              <path
                d={smoothPath}
                fill="none"
                stroke="#8B5CF6"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glow)"
                style={{
                  filter: 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.6))'
                }}
              />

              {/* Pontos de dados */}
              {entries.map((entry, index) => {
                const percentage = entry[1]?.percentage || 0;
                const coords = getCoordinates(percentage, index);
                const meta = resolveMeta(entry[0], entry[1]);
                const color = meta.color || '#8B5CF6';
                
                return (
                  <circle
                    key={`point-${index}`}
                    cx={coords.x}
                    cy={coords.y}
                    r="5"
                    fill={color}
                    stroke="white"
                    strokeWidth="2.5"
                  />
                );
              })}

              {/* Ícones nos extremos dos eixos */}
              {entries.map((entry, index) => {
                const meta = resolveMeta(entry[0], entry[1]);
                const color = meta.color || '#8B5CF6';
                const icon = meta.icon;
                const IconComponent = icon ? getLucideIcon(icon) : null;
                const coords = getCoordinates(100, index, iconRadius);
                
                return (
                  <g key={`icon-${index}`} transform={`translate(${coords.x}, ${coords.y})`}>
                    {/* Círculo de fundo para o ícone */}
                    <circle
                      cx="0"
                      cy="0"
                      r="16"
                      fill={color}
                      opacity="0.95"
                    />
                    {/* Renderizar ícone SVG inline */}
                    {IconComponent && (
                      <foreignObject x="-10" y="-10" width="20" height="20">
                        <div className="flex items-center justify-center w-full h-full">
                          <IconComponent className="w-4 h-4 text-white" strokeWidth={2.5} />
                        </div>
                      </foreignObject>
                    )}
                  </g>
                );
              })}

              {/* Centro do gráfico - Ícone Zap (apenas o ícone filled) */}
              <foreignObject x={centerX - 14} y={centerY - 14} width="28" height="28">
                <div className="flex items-center justify-center w-full h-full">
                  <Zap className="w-7 h-7 text-[#8B5CF6]" strokeWidth={2.5} fill="#8B5CF6" />
                </div>
              </foreignObject>
            </svg>
          </div>
        </div>

        {/* Legenda abaixo do gráfico */}
        {!hideLegend && (
        <div className="w-full">
          {/* Cabeçalho do Accordion */}
          <button
            onClick={() => setIsLegendOpen(!isLegendOpen)}
            className="group w-full flex items-center justify-between gap-3 px-5 py-3.5 rounded-xl border-2 border-[#C7D2FE] hover:border-[#A5B4FC] transition-all duration-300 shadow-sm hover:shadow-md"
            style={{
              boxShadow: isLegendOpen ? '0 0 20px rgba(139, 92, 246, 0.15)' : ''
            }}
          >
            <div className="flex items-center gap-3">
              <div className={`w-1.5 h-6 rounded-full bg-gradient-to-b from-[#8B5CF6] to-[#A78BFA] transition-all duration-300 ${isLegendOpen ? 'opacity-100' : 'opacity-50 group-hover:opacity-75'}`} />
              <div className="flex flex-col items-start">
                <h4 className="font-bold text-sm text-[#1E1B4B]">Legenda</h4>
                <span className="text-xs text-[#6366F1] font-medium">
                  {entries.length} {entries.length === 1 ? 'indicador' : 'indicadores'}
                </span>
              </div>
            </div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 ${isLegendOpen ? 'shadow-inner' : ''}`}>
              <ChevronDown
                className={`w-4 h-4 text-[#8B5CF6] transition-transform duration-300 ${
                  isLegendOpen ? 'rotate-180' : ''
                }`}
                strokeWidth={2.5}
              />
            </div>
          </button>

          {/* Conteúdo do Accordion */}
          {isLegendOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
            {entries.map((entry) => {
              const name = resolveName(entry[0], entry[1]);
              const percentage = entry[1]?.percentage || 0;
              const meta = resolveMeta(entry[0], entry[1]);
              const color = meta.color || '#8B5CF6';
              const icon = meta.icon || 'circle';
              const IconComponent = icon ? getLucideIcon(icon) : null;

              return (
                <div 
                  key={name} 
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-white"
                >
                  {/* Ícone com cor de fundo */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ 
                      backgroundColor: color
                    }}
                  >
                    {IconComponent ? (
                      <IconComponent className="w-5 h-5 text-white" strokeWidth={2.5} />
                    ) : (
                      <span className="text-white text-sm font-bold">●</span>
                    )}
                  </div>
                  {/* Nome e percentual */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1E1B4B] truncate">{name}</p>
                    <p className="text-xs text-gray-500">{percentage}%</p>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>
        )}
    </div>
  );
}
