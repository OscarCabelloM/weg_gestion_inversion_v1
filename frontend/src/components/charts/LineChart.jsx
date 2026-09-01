import { useState } from 'react';
import { formatUSD } from '@/lib/formatters';

/**
 * Gráfico lineal de la valorización diaria (cantidad × precio de cierre)
 * durante los últimos 3 meses. El monto valorizado se muestra en el popup
 * al hacer hover sobre un punto.
 */
export default function LineChart({ candles, ticker, shares = 0, usdToClp = null, currentPrice = null }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!candles || candles.length === 0) {
    return <div className="h-64 flex items-center justify-center text-xs text-slate-500">Cargando gráfico...</div>;
  }

  if (!shares || shares <= 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-1 text-xs text-slate-500">
        <span className="font-semibold text-slate-400">{ticker}</span>
        <span>Sin posición abierta: no hay valorización que graficar.</span>
      </div>
    );
  }

  const VIEW_W = 700;
  const VIEW_H = 240;
  const PAD_TOP = 24;
  const PAD_BOTTOM = 20;
  const chartH = VIEW_H - PAD_TOP - PAD_BOTTOM;

  // La valorización es cantidad × precio de cierre; en CRYPTO se convierte con
  // el dólar del día para cuadrar con la Valorización Actual del portafolio.
  const factor = usdToClp != null && !Number.isNaN(usdToClp) ? usdToClp : 1;
  const values = candles.map((c) => (c.close ?? 0) * shares * factor);
  const minValue = Math.min(...values) * 0.95;
  const maxValue = Math.max(...values) * 1.05;
  const valueRange = maxValue - minValue || 1;

  const xAt = (idx) => (idx / (candles.length - 1)) * VIEW_W;
  const yAt = (value) => PAD_TOP + chartH - ((value - minValue) / valueRange) * chartH;

  const linePath = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(2)},${yAt(v).toFixed(2)}`).join(' ');
  const areaPath = `${linePath} L ${VIEW_W},${VIEW_H} L 0,${VIEW_H} Z`;

  const activeIndex = hoverIndex !== null ? hoverIndex : candles.length - 1;
  const activeCandle = candles[activeIndex];
  const activeValue = values[activeIndex];
  // Si la última vela es la de hoy, "Precio:" muestra la cotización en vivo para
  // cuadrar con la cabecera del gráfico; en el resto de fechas muestra el cierre.
  const isLastCandleToday = candles[candles.length - 1]?.date === new Date().toISOString().split('T')[0];
  const priceShown =
    currentPrice != null && isLastCandleToday && activeIndex === candles.length - 1 ? currentPrice : activeCandle?.close;
  const prevValue =
    activeIndex > 0 ? values[activeIndex - 1] : (activeCandle?.open ?? activeCandle?.close ?? 0) * shares * factor;
  const dayChange = activeValue - prevValue;
  const dayChangePercent = prevValue ? (dayChange / prevValue) * 100 : 0;
  const isUp = dayChange >= 0;

  return (
    <div className="space-y-3">
      {/* Barra de datos interactiva */}
      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
        <span className="text-slate-400 font-bold">{activeCandle?.date}:</span>
        <div className="flex gap-3">
          <span>
            Precio: <strong className="text-white">{formatUSD(priceShown)}</strong>
          </span>
          <span>
            Valorización: <strong className="text-white">{formatUSD(activeValue)}</strong>
          </span>
          <span className={isUp ? 'text-blue-400' : 'text-rose-400'}>
            {isUp ? '+' : ''}
            {formatUSD(dayChange)} ({isUp ? '+' : ''}
            {dayChangePercent.toFixed(2)}%)
          </span>
        </div>
        <span className="text-slate-400 hidden sm:inline">Vol: {activeCandle?.volume.toLocaleString()}</span>
      </div>

      {/* Lienzo SVG */}
      <div className="relative h-52 w-full bg-slate-950 rounded-xl p-2 border border-slate-800 overflow-hidden">
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
          {[0.25, 0.5, 0.75].map((ratio) => (
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

          {/* Línea de valorización */}
          <path
            d={linePath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* Puntos uniformes de cada fecha (el monto valorizado se muestra en el popup) */}
          {values.map((v, idx) => (
            <circle
              key={candles[idx].date}
              cx={xAt(idx)}
              cy={yAt(v)}
              r={2}
              fill="#3b82f6"
              stroke="#020617"
              strokeWidth="1.5"
              className="cursor-pointer"
              onMouseEnter={() => setHoverIndex(idx)}
            />
          ))}

          {/* Crosshair del punto activo */}
          {hoverIndex !== null && (
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
          )}

          {/* Zonas de hover por mes */}
          {candles.map((candle, idx) => {
            const colW = VIEW_W / candles.length;
            return (
              <rect
                key={`hover-${candle.date}`}
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

        {/* Tooltip flotante al hacer hover: monto valorizado (cantidad × valor) */}
        {hoverIndex !== null && (
          <div
            className="absolute z-10 font-mono text-[10px] text-white bg-slate-800 border border-slate-700 rounded px-2 py-1 pointer-events-none shadow-lg"
            style={{
              left: `${(xAt(activeIndex) / VIEW_W) * 100}%`,
              top: `${(yAt(activeValue) / VIEW_H) * 100}%`,
              transform: `translate(${
                activeIndex === 0 ? '0%' : activeIndex === candles.length - 1 ? '-100%' : '-50%'
              }, ${yAt(activeValue) < VIEW_H * 0.3 ? '12px' : 'calc(-100% - 10px)'})`,
            }}
          >
            <span className="block font-black">{formatUSD(activeValue)}</span>
          </div>
        )}

        {/* Fecha del punto activo, anclada bajo la línea */}
        <div
          className="absolute bottom-1 z-10 font-mono text-[10px] font-bold text-slate-200 bg-slate-900/95 border border-slate-700 rounded px-1.5 py-0.5 pointer-events-none whitespace-nowrap"
          style={{
            left: `${(xAt(activeIndex) / VIEW_W) * 100}%`,
            transform: `translate(${
              activeIndex === 0 ? '0%' : activeIndex === candles.length - 1 ? '-100%' : '-50%'
            }, 0)`,
          }}
        >
          {activeCandle?.date}
        </div>
      </div>

      <div className="flex justify-between text-[10px] text-slate-500 font-mono px-1">
        <span>{candles[0]?.date}</span>
        <span>Rango: 3 Meses / diario ({shares} acc.) ({ticker})</span>
        <span>{candles[candles.length - 1]?.date}</span>
      </div>
    </div>
  );
}
