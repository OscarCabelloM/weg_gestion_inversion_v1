import { useMemo } from 'react';
import { Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Card from '@/components/ui/Card';
import { formatUSD, toCLP, todayISO } from '@/lib/formatters';

const EMPTY_USD_HISTORY = {};
const EMPTY_TRANSACTIONS = [];

const WIDTH = 1600;
const HEIGHT = 230;
const PAD_LEFT = 120;
const PAD_RIGHT = 16;
const PAD_TOP = 14;
const PAD_BOTTOM = 46;

/**
 * Gráfico lineal SVG: un punto por compra del activo, sobre el monto total de
 * cada operación (fecha vs monto total). Cierra siempre en un punto final con
 * la fecha de hoy y el total de valorización actual del activo.
 * Línea azul con relleno degradado.
 */
function LineChart({ rows, currentValue }) {
  const points = useMemo(() => {
    let acc = 0;
    const base = rows.map((tx) => {
      acc += tx.monto;
      return {
        date: tx.fecha_ing,
        value: acc,
        monto: acc,
      };
    });
    // Punto final "hoy": total de valorización actual del activo. Si la última
    // compra es de hoy, ese punto toma el valor actual (evita puntos duplicados).
    const today = todayISO();
    const todayValue = typeof currentValue === 'number' ? currentValue : acc;
    const last = base[base.length - 1];
    if (last && last.date === today) {
      last.value = todayValue;
      last.monto = todayValue;
    } else {
      base.push({ date: today, value: todayValue, monto: todayValue });
    }
    return base;
  }, [rows, currentValue]);

  if (points.length === 0) return null;

  const values = points.map((p) => p.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;
  const innerW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const xAt = (i) => PAD_LEFT + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const yAt = (v) => PAD_TOP + innerH - ((v - minValue) / range) * innerH;

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(2)},${yAt(p.value).toFixed(2)}`).join(' ');
  const areaPath = `${linePath} L${xAt(points.length - 1).toFixed(2)},${(PAD_TOP + innerH).toFixed(2)} L${xAt(0).toFixed(2)},${(PAD_TOP + innerH).toFixed(2)} Z`;

  // Solo dibuja la fecha cuando no se solape con la anterior, evitando
  // etiquetas superpuestas cuando hay muchas compras. Siempre la primera y última.
  const MIN_LABEL_GAP = 46;
  const visibleDates = [];
  let lastX = -Infinity;
  points.forEach((p, i) => {
    const isFirst = i === 0;
    const isLast = i === points.length - 1;
    const show = isFirst || isLast || xAt(i) - lastX >= MIN_LABEL_GAP;
    if (show) {
      visibleDates.push(i);
      lastX = xAt(i);
    }
  });

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const v = minValue + f * range;
    return { y: yAt(v), v };
  });

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto" role="img" aria-label={`Gráfico de compras de ${rows[0]?.nemotecnico ?? ''}`}>
      <defs>
        <linearGradient id="comprasFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0" />
        </linearGradient>
      </defs>

      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={t.y} y2={t.y} stroke="#1e293b" strokeDasharray="3 3" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <text x={PAD_LEFT - 8} y={t.y + 3} textAnchor="end" fontSize="18" fill="#64748b" fontFamily="JetBrains Mono, monospace">
            {formatUSD(t.v)}
          </text>
        </g>
      ))}

      <path d={areaPath} fill="url(#comprasFill)" />
      <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />

      {visibleDates.map((i) => (
        <line
          key={`v-${i}`}
          x1={xAt(i)}
          x2={xAt(i)}
          y1={yAt(points[i].value)}
          y2={PAD_TOP + innerH}
          stroke="#334155"
          strokeDasharray="4 4"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {points.map((p, i) => (
        <g key={i}>
          <circle cx={xAt(i)} cy={yAt(p.value)} r="9" fill="transparent" style={{ cursor: 'pointer' }}>
            <title>{`${points[i].date} — ${formatUSD(points[i].monto)}`}</title>
          </circle>
          <circle cx={xAt(i)} cy={yAt(p.value)} r="5" fill="#3b82f6" stroke="#020617" strokeWidth="1.5" pointerEvents="none" />
        </g>
      ))}

      {visibleDates.map((i) => (
        <text key={i} x={xAt(i)} y={HEIGHT - 10} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'} fontSize="15" fill="#94a3b8" fontFamily="JetBrains Mono, monospace">
          {points[i].date}
        </text>
      ))}
    </svg>
  );
}

/**
 * Card "Gráfico de Activos": por defecto muestra el primer activo activo del
 * mercado (Posiciones Activas). Grafica las compras del registro diario usando
 * fecha y monto total de cada operación.
 */
export function AssetChartBody({ transactions = EMPTY_TRANSACTIONS, openTicker = '', quote = null, usdHistory = EMPTY_USD_HISTORY, usdclpPrice = null, currentValue = null, mercado = 'NACIONAL' }) {
  const target = useMemo(() => String(openTicker ?? '').trim().toUpperCase(), [openTicker]);

  // Filas del gráfico: compras del activo ordenadas por fecha con su monto total.
  // La construcción vive dentro del useMemo para no capturar una función
  // recreada en cada render (deps exhaustivas sin valores inestables).
  const rows = useMemo(
    () =>
      transactions
        .filter(
          (tx) =>
            (tx.mercado ?? null) === mercado &&
            tx.tipo === 'COMPRA' &&
            String(tx.nemotecnico ?? '').trim().toUpperCase() === target
        )
        .toSorted((a, b) => String(a.fecha_ing ?? '').localeCompare(String(b.fecha_ing ?? '')))
        .map((tx) => {
          const montoBase = (parseFloat(tx.cantidad) || 0) * (parseFloat(tx.precio) || 0);
          return {
            ...tx,
            monto: tx.mercado !== 'NACIONAL' ? toCLP(montoBase, tx.fecha_ing, usdHistory, usdclpPrice) : montoBase,
          };
        }),
    [transactions, mercado, target, usdHistory, usdclpPrice]
  );

  const changePercent = quote?.changePercent ?? 0;
  // "Valorización hoy" = valor total de la posición; si aún no se calcula,
  // se degrada al precio unitario de la cotización.
  const valorHoy = currentValue ?? quote?.currentPrice ?? 0;

  if (rows.length === 0 || !openTicker) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
        No hay compras registradas para este activo.
      </div>
    );
  }

  return (
    <>
      <div className="mt-3 mb-4">
        <div className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 text-center">
          <span className="text-white font-bold text-sm tabular-nums">{openTicker}</span>
          {quote?.name ? <span className="text-slate-400 text-sm">{quote.name}</span> : null}
          <span className="text-slate-500 text-[10px] uppercase tracking-wide">Valorización hoy</span>
          <span className="text-white font-bold tabular-nums text-sm">{formatUSD(valorHoy)}</span>
          <span className={`text-[10px] font-bold flex items-center gap-1 ${changePercent >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
            {changePercent >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
          </span>
        </div>
      </div>
      <div className="border border-slate-800 rounded-lg p-2 bg-slate-900/40">
        <LineChart rows={rows} currentValue={currentValue} />
      </div>
    </>
  );
}

export default function GraficoComprasCard({ title = 'Gráfico de Activos', transactions = EMPTY_TRANSACTIONS, openTicker = '', quote = null, usdHistory = EMPTY_USD_HISTORY, usdclpPrice = null, currentValue = null, mercado = 'NACIONAL' }) {
  return (
    <Card title={title} icon={Activity} iconClassName="text-blue-400">
      <AssetChartBody
        transactions={transactions}
        openTicker={openTicker}
        quote={quote}
        usdHistory={usdHistory}
        usdclpPrice={usdclpPrice}
        currentValue={currentValue}
        mercado={mercado}
      />
    </Card>
  );
}