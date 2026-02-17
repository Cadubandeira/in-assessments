import React from 'react';

/**
 * Componente de Gráfico de Barras Horizontal
 * Exibe indicadores em formato de barras horizontais com legenda
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
      <h3 className="text-lg font-semibold mb-4 text-center">Gráfico em barras</h3>
      
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Gráfico de barras */}
        <div className="flex-1 space-y-4">
          {entries.map((entry, index) => {
            const name = resolveName(entry[0], entry[1]);
            const percentage = entry[1]?.percentage || 0;
            const classification = entry[1]?.classification || '';
            const meta = resolveMeta(entry[0], entry[1]);
            const color = meta.color || '#4F46E5';

            // Definir cor da barra baseado na classificação
            let barColor = color;
            let bgColor = 'bg-gray-100';

            return (
              <div key={name} className="space-y-1">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {/* Ícone com cor de fundo */}
                    <div
                      className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      <span className="text-xs font-bold text-white">●</span>
                    </div>
                    <span className="text-sm font-medium text-gray-700 truncate">{name}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-800 flex-shrink-0">{percentage}%</span>
                </div>
                {/* Barra */}
                <div className="w-full h-8 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-500 ease-out rounded-full flex items-center justify-end pr-2"
                    style={{
                      width: `${Math.min(percentage, 100)}%`,
                      backgroundColor: barColor,
                    }}
                  >
                    {percentage > 20 && (
                      <span className="text-xs font-bold text-white">{percentage}%</span>
                    )}
                  </div>
                </div>
                {/* Classificação */}
                {classification && (
                  <div className="text-xs text-gray-500 pl-6">
                    {classification}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legenda simplificada */}
        <div className="flex-1 lg:flex-0 lg:w-56 space-y-3">
          <h4 className="font-semibold text-sm text-gray-700">Legenda</h4>
          <div className="space-y-2">
            {entries.map((entry) => {
              const name = resolveName(entry[0], entry[1]);
              const meta = resolveMeta(entry[0], entry[1]);
              const color = meta.color || '#4F46E5';

              return (
                <div key={name} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 transition">
                  {/* Ícone com cor de fundo */}
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    <span className="text-xs font-bold text-white">●</span>
                  </div>
                  {/* Nome */}
                  <p className="text-xs font-medium text-gray-700 truncate">{name}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
