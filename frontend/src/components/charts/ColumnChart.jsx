import { useState } from 'react';
import { formatUSD } from '@/lib/formatters';

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/**
 * Construye las 6 columnas mensuales: la valorización del primer día hábil de
 * cada uno de los últimos meses calendario, y la de hoy (cotización en vivo)
 * para el mes en curso. `buckets[0]` es el mes más antiguo.
 */
function buildBuckets(candles, shares, factor, currentPrice, flatPrice = null) {
  const now = new Date();
  const curYear = now.getUTCFullYear();
  const curMonth = now.getUTCMonth();

  // Agrupa velas por mes (key = "AAAA-M") sin distorsionar por zonas horarias.
  const byMonth = {};
  candles.forEach((c) => {
    const y = Number(String(c.date).slice(0, 4));
    const m = Number(String(c.date).slice(5, 7)) - 1;
    const key = `${y}-${m}`;
    (byMonth[key] = byMonth[key] || []).push(c);
  });

  const buckets = [];
  for (let i = 5; i >= 0; i -= 1) {
    const monthDate = new Date(Date.UTC(curYear, curMonth - i, 1));
    const y = monthDate.getUTCFullYear();
    const m = monthDate.getUTCMonth();
    const key = `${y}-${m}`;
    const list = byMonth[key] || [];
    const firstOfMonth = monthDate.toISOString().split('T')[0];
    const isCurrentMonth = i === 0;

    // Mes actual: última vela disponible; meses pasados: primer día hábil del mes.
    const candle = isCurrentMonth
      ? list[list.length - 1] ?? null
      : list.find((c) => c.date >= firstOfMonth) ?? list[list.length - 1] ?? null;

    // Cuentas de fondo (ej. CUENTA2.AFP): valorización plana = precio promedio (costo) en
    // todos los meses, sin variación de mercado. En el resto, el precio en vivo solo
    // aplica al mes actual y los pasados usan el cierre de la vela.
    const shownPrice = flatPrice != null
      ? flatPrice
      : isCurrentMonth && currentPrice != null && !Number.isNaN(currentPrice)
        ? currentPrice
        : candle?.close ?? null;
    const value = (shownPrice ?? 0) * shares * factor;

    buckets.push({
      key,
      label: `${MONTH_NAMES[m]} ${String(y).slice(2)}`,
      date: isCurrentMonth ? (candle?.date ?? firstOfMonth) : firstOfMonth,
      price: shownPrice,
      value,
      isCurrentMonth,
    });
  }
  return buckets;
}

const VIEW_W = 700;
const VIEW_H = 240;
const PAD_TOP = 32;
const PAD_BOTTOM = 28;
const chartH = VIEW_H - PAD_TOP - PAD_BOTTOM;

/** Fracción de columna y geomería del lienzo compartidas por el lienzo SVG. */
function useChartGeometry(buckets, minValue, maxValue) {
  const valueRange = maxValue - minValue || 1;
  const slotW = VIEW_W / buckets.length;
  const yAt = (value) => PAD_TOP + chartH - ((value - minValue) / valueRange) * chartH;
  const centerAt = (idx) => slotW * idx + slotW / 2;
  return { slotW, yAt, centerAt };
}

/**
 * Barra superior con los datos de la columna activa (precio, valorización y
 * variación mensual). Presentacional: recibe el bucket activo y el anterior.
 */
function DataBar({ active, prev }) {
  const isUp = active.value - (prev?.value ?? active.value) >= 0;
  const monthChange = prev ? active.value - prev.value : 0;
  const monthChangePercent = prev?.value ? (monthChange / prev.value) * 100 : 0;

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
            {prev.label}: {isUp ? '+' : ''}
            {formatUSD(monthChange)} ({isUp ? '+' : ''}
            {monthChangePercent.toFixed(2)}%)
          </span>
        )}
      </div>
      <span className="text-slate-400 hidden sm:inline">{active.isCurrentMonth ? 'Hoy' : '1° día del mes'}</span>
    </div>
  );
}

/** Columna individual con remate redondeado, etiqueta de valorización y hover. */
function BarColumn({ bucket, idx, ticker, isActive, barW, barRadius, yAt, centerAt, onHover }) {
  const x0 = centerAt(idx) - barW / 2;
  const x1 = centerAt(idx) + barW / 2;
  const yTop = yAt(bucket.value);
  const yBase = yAt(0);
  const r = Math.min(barRadius, Math.max(0, yBase - yTop));
  const path = r === 0
    ? `M ${x0} ${yBase} L ${x0} ${yTop} L ${x1} ${yTop} L ${x1} ${yBase} Z`
    : [
        `M ${x0} ${yBase}`,
        `L ${x0} ${yTop + r}`,
        `Q ${x0} ${yTop} ${x0 + r} ${yTop}`,
        `L ${x1 - r} ${yTop}`,
        `Q ${x1} ${yTop} ${x1} ${yTop + r}`,
        `L ${x1} ${yBase}`,
        'Z',
      ].join(' ');

  const isPos = bucket.value >= 0;
  const gradId = isActive ? `barFillActive-${ticker}` : `barFill-${ticker}`;

  return (
    <g className="cursor-pointer" onMouseEnter={() => onHover(idx)}>
      <path
        d={path}
        fill={isPos ? `url(#${gradId})` : (isActive ? '#fb7185' : '#ef4444')}
        opacity={isActive ? 1 : 0.9}
        stroke={isActive ? '#bfdbfe' : '#1e3a8a'}
        strokeWidth="0.8"
        strokeOpacity={isActive ? 0.9 : 0.4}
      />
      {bucket.value > 0 && (
        <text
          x={centerAt(idx)}
          y={yAt(bucket.value) - 3}
          textAnchor="middle"
          fontSize="7"
          fontFamily="Inter, sans-serif"
          fill={isActive ? '#e2e8f0' : '#94a3b8'}
          fontWeight={isActive ? 700 : 500}
        >
          {formatUSD(bucket.value)}
        </text>
      )}
    </g>
  );
}

/** Lienzo SVG de columnas con líneas de referencia, columnas, hover y etiquetas. */
function ChartCanvas({ buckets, ticker, activeIndex, slotW, yAt, centerAt, onHover, onLeave }) {
  return (
    <div className="relative h-52 w-full bg-slate-950 rounded-xl p-2 border border-slate-800 overflow-hidden">
      <svg
        className="w-full h-full overflow-visible"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        onMouseLeave={onLeave}
      >
        <defs>
          <linearGradient id={`barFill-${ticker}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id={`barFillActive-${ticker}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
        </defs>
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

        <line
          x1="0"
          y1={yAt(0)}
          x2={VIEW_W}
          y2={yAt(0)}
          stroke="#334155"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />

        {buckets.map((b, idx) => (
          <BarColumn
            key={b.key}
            bucket={b}
            idx={idx}
            ticker={ticker}
            isActive={idx === activeIndex}
            barW={Math.min(40, slotW * 0.45)}
            barRadius={Math.min(10, Math.round(Math.min(40, slotW * 0.45) * 0.5))}
            yAt={yAt}
            centerAt={centerAt}
            onHover={onHover}
          />
        ))}

        {buckets.map((b, idx) => (
          <rect
            key={`hover-${b.key}`}
            x={slotW * idx}
            y="0"
            width={slotW}
            height={VIEW_H}
            fill="transparent"
            onMouseEnter={() => onHover(idx)}
          />
        ))}

        {buckets.map((b, idx) => (
          <text
            key={`label-${b.key}`}
            x={centerAt(idx)}
            y={VIEW_H - 8}
            textAnchor="middle"
            fontSize="10"
            fontFamily="Inter, sans-serif"
            fill={idx === activeIndex ? '#e2e8f0' : '#64748b'}
            fontWeight={700}
          >
            {b.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

/**
 * Gráfico de columnas de la valorización mensual (cantidad × precio de cierre)
 * de los últimos 6 meses. Cada columna representa el valor del primer día hábil
 * del mes; la última columna muestra la valorización de hoy con la cotización
 * en vivo. En CRYPTO se convierte con el dólar del día para cuadrar con la
 * Valorización Actual del portafolio.
 */
export default function ColumnChart({ candles, ticker, shares = 0, usdToClp = null, currentPrice = null, flatPrice = null }) {
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

  const factor = usdToClp != null && !Number.isNaN(usdToClp) ? usdToClp : 1;
  const buckets = buildBuckets(candles, shares, factor, currentPrice, flatPrice);
  const maxValue = Math.max(...buckets.map((b) => b.value)) * 1.1;
  const { slotW, yAt, centerAt } = useChartGeometry(buckets, 0, maxValue);

  const activeIndex = hoverIndex !== null ? hoverIndex : buckets.length - 1;
  const active = buckets[activeIndex];
  const prev = buckets[activeIndex - 1];

  return (
    <div className="space-y-3">
      <DataBar active={active} prev={prev} />
      <ChartCanvas
        buckets={buckets}
        ticker={ticker}
        activeIndex={activeIndex}
        slotW={slotW}
        yAt={yAt}
        centerAt={centerAt}
        onHover={setHoverIndex}
        onLeave={() => setHoverIndex(null)}
      />
      <div className="flex justify-between text-[9px] text-slate-500 font-mono px-1">
        <span>{buckets[0]?.date}</span>
        <span>Rango: 6 Meses / mensual ({shares} acc.) ({ticker})</span>
        <span>{buckets[buckets.length - 1]?.date} (hoy)</span>
      </div>
    </div>
  );
}
