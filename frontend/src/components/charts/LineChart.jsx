import { useState } from 'react';

/**
 * Gráfico lineal de precios de cierre renderizado con SVG puro.
 * Área con degradado azul, crosshair interactivo y barra de datos al hover.
 */
export default function LineChart({ candles, ticker }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!candles || candles.length === 0) {
    return <div className="h-64 flex items-center justify-center text-xs text-slate-500">Cargando gráfico...</div>;
  }

  const VIEW_W = 700;
  const VIEW_H = 200;
  const PAD_TOP = 10;
  const PAD_BOTTOM = 20;
  const chartH = VIEW_H - PAD_TOP - PAD_BOTTOM;

  const closes = candles.map((c) => c.close);
  const minPrice = Math.min(...closes) * 0.99;
  const maxPrice = Math.max(...closes) * 1.01;
  const priceRange = maxPrice - minPrice || 1;

  const xAt = (idx) => (idx / (candles.length - 1)) * VIEW_W;
  const yAt = (price) => PAD_TOP + chartH - ((price - minPrice) / priceRange) * chartH;

  const linePath = candles.map((c, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(2)},${yAt(c.close).toFixed(2)}`).join(' ');
  const areaPath = `${linePath} L ${VIEW_W},${VIEW_H} L 0,${VIEW_H} Z`;

  const activeIndex = hoverIndex ?? candles.length - 1;
  const activeCandle = candles[activeIndex];
  const prevClose = activeIndex > 0 ? candles[activeIndex - 1].close : activeCandle?.open;
  const dayChange = (activeCandle?.close ?? 0) - prevClose;
  const dayChangePercent = prevClose ? (dayChange / prevClose) * 100 : 0;
  const isUp = dayChange >= 0;

  return (
    <div className="space-y-3">
      {/* Barra de datos interactiva */}
      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
        <span className="text-slate-400 font-bold">{activeCandle?.date}:</span>
        <div className="flex gap-3">
          <span>
            Cierre: <strong className="text-white">${activeCandle?.close.toFixed(2)}</strong>
          </span>
          <span className={isUp ? 'text-blue-400' : 'text-rose-400'}>
            {isUp ? '+' : ''}
            {dayChange.toFixed(2)} ({isUp ? '+' : ''}
            {dayChangePercent.toFixed(2)}%)
          </span>
        </div>
        <span className="text-slate-400 hidden sm:inline">Vol: {activeCandle?.volume.toLocaleString()}</span>
      </div>

      {/* Lienzo SVG */}
      <div className="relative h-64 w-full bg-slate-950 rounded-xl p-2 border border-slate-800 overflow-hidden">
        <svg
          className="w-full h-full overflow-visible"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="lineChartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Líneas horizontales de referencia */}
          {[0.25, 0.55, 0.85].map((ratio) => (
            <line
              key={ratio}
              x1="0"
              y1={VIEW_H * ratio}
              x2={VIEW_W}
              y2={VIEW_H * ratio}
              stroke="#1e293b"
              strokeDasharray="2,2"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* Relleno bajo la curva */}
          <path d={areaPath} fill="url(#lineChartFill)" />

          {/* Línea de precio */}
          <path
            d={linePath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* Crosshair del punto activo */}
          {hoverIndex !== null && (
            <>
              <line
                x1={xAt(activeIndex)}
                y1={PAD_TOP}
                x2={xAt(activeIndex)}
                y2={PAD_TOP + chartH}
                stroke="#475569"
                strokeWidth="1"
                strokeDasharray="3,3"
                vectorEffect="non-scaling-stroke"
              />
              <circle cx={xAt(activeIndex)} cy={yAt(activeCandle.close)} r="3.5" fill="#3b82f6" stroke="#020617" strokeWidth="1.5" />
            </>
          )}

          {/* Zonas de hover por día */}
          {candles.map((candle, idx) => {
            const colW = VIEW_W / candles.length;
            return (
              <rect
                key={candle.date}
                x={xAt(idx) - colW / 2}
                y="0"
                width={colW}
                height={VIEW_H}
                fill="transparent"
                onMouseEnter={() => setHoverIndex(idx)}
              />
            );
          })}
        </svg>
      </div>

      <div className="flex justify-between text-[10px] text-slate-500 font-mono px-1">
        <span>{candles[0]?.date}</span>
        <span>Rango: 30 Días ({ticker})</span>
        <span>{candles[candles.length - 1]?.date}</span>
      </div>
    </div>
  );
}
