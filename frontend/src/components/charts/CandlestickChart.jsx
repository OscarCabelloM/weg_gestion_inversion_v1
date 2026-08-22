import { useState } from 'react';

/**
 * Gráfico de velas japonesas (OHLCV) renderizado con SVG puro.
 * Incluye barra OHLC interactiva que reacciona al hover sobre cada vela.
 */
export default function CandlestickChart({ candles, ticker }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!candles || candles.length === 0) {
    return <div className="h-64 flex items-center justify-center text-xs text-slate-500">Cargando velas...</div>;
  }

  // Escala del SVG según mínimos y máximos de precio
  const pricesLow = candles.map((c) => c.low);
  const pricesHigh = candles.map((c) => c.high);
  const minPrice = Math.min(...pricesLow) * 0.99;
  const maxPrice = Math.max(...pricesHigh) * 1.01;
  const priceRange = maxPrice - minPrice || 1;

  const activeCandle = hoverIndex !== null ? candles[hoverIndex] : candles[candles.length - 1];

  return (
    <div className="space-y-3">
      {/* Barra OHLC interactiva */}
      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
        <span className="text-slate-400 font-bold">{activeCandle?.date}:</span>
        <div className="flex gap-3">
          <span>
            O: <strong className="text-slate-200">${activeCandle?.open.toFixed(2)}</strong>
          </span>
          <span>
            H: <strong className="text-emerald-400">${activeCandle?.high.toFixed(2)}</strong>
          </span>
          <span>
            L: <strong className="text-rose-400">${activeCandle?.low.toFixed(2)}</strong>
          </span>
          <span>
            C: <strong className="text-white">${activeCandle?.close.toFixed(2)}</strong>
          </span>
        </div>
        <span className="text-slate-400 hidden sm:inline">Vol: {activeCandle?.volume.toLocaleString()}</span>
      </div>

      {/* Lienzo SVG de velas */}
      <div className="relative h-64 w-full bg-slate-950 rounded-xl p-2 border border-slate-800 overflow-hidden">
        <svg
          className="w-full h-full overflow-visible"
          viewBox={`0 0 ${candles.length * 20} 200`}
          preserveAspectRatio="none"
        >
          {/* Líneas horizontales de referencia */}
          {[0.2, 0.5, 0.8].map((ratio) => (
            <line
              key={ratio}
              x1="0"
              y1={200 * ratio}
              x2={candles.length * 20}
              y2={200 * ratio}
              stroke="#1e293b"
              strokeDasharray="2,2"
              strokeWidth="1"
            />
          ))}

          {/* Velas */}
          {candles.map((candle, idx) => {
            const isGreen = candle.close >= candle.open;
            const color = isGreen ? '#10b981' : '#ef4444';
            const x = idx * 20 + 10;

            const yHigh = 180 - ((candle.high - minPrice) / priceRange) * 160;
            const yLow = 180 - ((candle.low - minPrice) / priceRange) * 160;
            const yOpen = 180 - ((candle.open - minPrice) / priceRange) * 160;
            const yClose = 180 - ((candle.close - minPrice) / priceRange) * 160;

            const bodyTop = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(2, Math.abs(yOpen - yClose));

            return (
              <g key={candle.date} onMouseEnter={() => setHoverIndex(idx)} onMouseLeave={() => setHoverIndex(null)} className="cursor-pointer group">
                {/* Mecha high/low */}
                <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="1.5" />
                {/* Cuerpo de la vela */}
                <rect
                  x={x - 5}
                  y={bodyTop}
                  width="10"
                  height={bodyHeight}
                  fill={color}
                  rx="1"
                  className="transition-opacity group-hover:opacity-80"
                />
              </g>
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
