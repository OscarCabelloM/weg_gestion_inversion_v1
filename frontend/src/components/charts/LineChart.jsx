import { useMemo, useState } from 'react';
import { formatUSD } from '@/lib/formatters';

const VIEW_W = 700;
const VIEW_H = 240;
const PAD_TOP = 32;
const PAD_BOTTOM = 28;
const PAD_RIGHT = 8;
const chartW = VIEW_W - PAD_RIGHT;
const chartH = VIEW_H - PAD_TOP - PAD_BOTTOM;

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** Etiqueta corta de mes/año para un punto: "Sep 26". */
function shortLabel(dateStr) {
  const y = Number(String(dateStr).slice(0, 4));
  const m = Number(String(dateStr).slice(5, 7)) - 1;
  return `${MONTH_NAMES[m]} ${String(y).slice(2)}`;
}

/**
 * Serie de valorización diaria (cantidad × precio de cierre). En el día actual
 * y si hay cotización en vivo disponible se usa ese precio, multiplicado por el
 * factor (USD/CLP en CRYPTO). Devuelve puntos { date, value } ordenados.
 */
function buildSeries(candles, shares, factor, currentPrice, flatPrice = null) {
  const points = [];
  for (let i = 0; i < candles.length; i += 1) {
    const c = candles[i];
    // Cuentas de fondo (ej. CUENTA2.AFP): valorización plana = precio promedio (costo).
    const price = flatPrice != null
      ? flatPrice
      : i === candles.length - 1 && currentPrice != null && !Number.isNaN(currentPrice)
        ? currentPrice
        : c.close ?? null;
    if (price == null || Number.isNaN(price)) continue;
    points.push({ date: c.date, value: price * shares * factor, price });
  }
  return points;
}

/** Geomería del lienzo: rango, slop por punto y funciones x/y lineales. */
function useChartGeometry(points) {
  return useMemo(() => {
    const values = points.map((p) => p.value);
    if (values.length === 0) {
      return { minValue: 0, stepX: 0, xAt: () => 0, yAt: () => 0 };
    }
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue || 1;
    // El eje Y tiene un pequeño margen superior para que la línea no toque el borde.
    const pad = valueRange * 0.15;
    const yMin = minValue - pad;
    const yMax = maxValue + pad;
    const yRange = yMax - yMin || 1;

    const stepX = points.length > 1 ? chartW / (points.length - 1) : 0;
    const xAt = (idx) => PAD_RIGHT + stepX * idx;
    const yAt = (value) => PAD_TOP + chartH - ((value - yMin) / yRange) * chartH;

    return { minValue, stepX, xAt, yAt };
  }, [points]);
}

/** Trazado de la línea suavizada (Catmull-Rom -> Bézier) con bordes rectos de guarda. */
function buildLinePath(points, xAt, yAt) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${xAt(0)} ${yAt(points[0].value)} L ${xAt(0)} ${yAt(points[0].value)}`;

  let d = `M ${xAt(0)} ${yAt(points[0].value)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = xAt(i) + (xAt(i + 1) - xAt(i - 1 >= 0 ? i - 1 : i)) / 6;
    const cp1y = yAt(p1.value) + (yAt(p2.value) - yAt(p0.value)) / 6;
    const cp2x = xAt(i + 1) - (xAt(i + 2 < points.length ? i + 2 : i + 1) - xAt(i)) / 6;
    const cp2y = yAt(p2.value) - (yAt(p3.value) - yAt(p1.value)) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${xAt(i + 1)} ${yAt(p2.value)}`;
  }
  return d;
}

/** Barra superior con los datos del punto activo (fecha, precio y valorización). */
function DataBar({ active, prev }) {
  const isUp = active.value - (prev?.value ?? active.value) >= 0;
  const change = prev ? active.value - prev.value : 0;
  const changePercent = prev?.value ? (change / prev.value) * 100 : 0;

  return (
    <div className="flex flex-wrap items-center justify-between text-[11px] font-mono bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
      <span className="text-slate-400 font-bold">{active.date}:</span>
      <div className="flex gap-3">
        <span>
          Precio: <strong className="text-white">{formatUSD(active.price)}</strong>
        </span>
        <span>
          Valorización: <strong className="text-white">{formatUSD(active.value)}</strong>
        </span>
        {prev && (
          <span className={isUp ? 'text-blue-400' : 'text-rose-400'}>
            {'vs '}
            {prev.date}: {isUp ? '+' : ''}
            {formatUSD(change)} ({isUp ? '+' : ''}
            {changePercent.toFixed(2)}%)
          </span>
        )}
      </div>
    </div>
  );
}

/** Lienzo SVG de la línea con grid punteado, relleno degradado, crosshair y hover. */
function ChartCanvas({ points, ticker, activeIndex, xAt, yAt, minValue, stepX, onHover, onLeave }) {
  const linePath = buildLinePath(points, xAt, yAt);
  const areaPath = points.length
    ? `${linePath} L ${xAt(points.length - 1)} ${yAt(minValue)} L ${xAt(0)} ${yAt(minValue)} Z`
    : '';
  const active = points[activeIndex];

  return (
    <div className="relative h-52 w-full bg-slate-950 rounded-xl p-2 border border-slate-800 overflow-hidden">
      <svg
        className="w-full h-full overflow-visible"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        onMouseLeave={onLeave}
      >
        <defs>
          <linearGradient id={`lineChartFill-${ticker}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1={PAD_RIGHT}
            y1={PAD_TOP + chartH * ratio}
            x2={VIEW_W}
            y2={PAD_TOP + chartH * ratio}
            stroke="#1e293b"
            strokeDasharray="2,2"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        <path d={areaPath} fill={`url(#lineChartFill-${ticker})`} />
        <path
          d={linePath}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Punto + crosshair del punto activo */}
        {active && (
          <g>
            <line
              x1={xAt(activeIndex)}
              y1={PAD_TOP}
              x2={xAt(activeIndex)}
              y2={PAD_TOP + chartH}
              stroke="#475569"
              strokeDasharray="3,3"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1={PAD_RIGHT}
              y1={yAt(active.value)}
              x2={VIEW_W}
              y2={yAt(active.value)}
              stroke="#475569"
              strokeDasharray="3,3"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={xAt(activeIndex)} cy={yAt(active.value)} r="4" fill="#3b82f6" stroke="#0f172a" strokeWidth="2" />
          </g>
        )}

        {/* Etiquetas de fecha (solo puntos clave para no saturar) */}
        {points.map((p, idx) => {
          const showLabel = idx === 0 || idx === points.length - 1 || points.length <= 8 || idx % Math.ceil(points.length / 6) === 0;
          if (!showLabel) return null;
          return (
            <text
              key={p.date}
              x={xAt(idx)}
              y={VIEW_H - 8}
              textAnchor={idx === 0 ? 'start' : idx === points.length - 1 ? 'end' : 'middle'}
              fontSize="9"
              fontFamily="Inter, sans-serif"
              fill={idx === activeIndex ? '#e2e8f0' : '#64748b'}
              fontWeight={700}
            >
              {shortLabel(p.date)}
            </text>
          );
        })}

        {points.map((p, idx) => (
          <rect
            key={`hover-${p.date}`}
            x={xAt(idx) - stepX / 2}
            y="0"
            width={stepX}
            height={VIEW_H}
            fill="transparent"
            onMouseEnter={() => onHover(idx)}
          />
        ))}
      </svg>
    </div>
  );
}

/**
 * Gráfico lineal de la valorización diaria (cantidad × precio de cierre).
 * Muestra la evolución del último período y la trazada con línea SVG suavizada,
 * relleno degradado azul, grid punteado, crosshair + punto al hover y una barra
 * superior con los datos del punto activo. En CRYPTO se convierte con el dólar
 * del día para cuadrar con la Valorización Actual del portafolio.
 */
export default function LineChart({ candles, ticker, shares = 0, usdToClp = null, currentPrice = null, flatPrice = null }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  const factor = usdToClp != null && !Number.isNaN(usdToClp) ? usdToClp : 1;
  const points = buildSeries(candles ?? [], shares, factor, currentPrice, flatPrice);
  const { minValue, stepX, xAt, yAt } = useChartGeometry(points);

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

  if (points.length === 0) {
    return <div className="h-64 flex items-center justify-center text-xs text-slate-500">Sin datos de valorización para este activo.</div>;
  }

  const activeIndex = hoverIndex !== null ? hoverIndex : points.length - 1;
  const active = points[activeIndex];
  const prev = points[activeIndex - 1];

  const firstDate = points[0]?.date;
  const lastDate = points[points.length - 1]?.date;

  return (
    <div className="space-y-3">
      <DataBar active={active} prev={prev} />
      <ChartCanvas
        points={points}
        ticker={ticker}
        activeIndex={activeIndex}
        xAt={xAt}
        yAt={yAt}
        minValue={minValue}
        stepX={stepX}
        onHover={setHoverIndex}
        onLeave={() => setHoverIndex(null)}
      />
      <div className="flex justify-between text-[9px] text-slate-500 font-mono px-1">
        <span>{firstDate}</span>
        <span>
          Rango: {points.length} días / diario ({shares} acc.) ({ticker})
        </span>
        <span>{lastDate} (hoy)</span>
      </div>
    </div>
  );
}
