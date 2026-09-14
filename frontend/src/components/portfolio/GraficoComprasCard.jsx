import { useMemo } from 'react';
import { Activity } from 'lucide-react';
import Card from '@/components/ui/Card';
import { formatUSD, toCLP, todayISO } from '@/lib/formatters';

const EMPTY_USD_HISTORY = {};
const EMPTY_TRANSACTIONS = [];

const WIDTH = 1600;
const HEIGHT = 230;
const PAD_LEFT = 120;
const PAD_RIGHT = 16;
const PAD_TOP = 30;
const PAD_BOTTOM = 46;

/**
 * Gráfico de barras SVG: una barra por compra del activo, sobre el monto total
 * acumulado de cada operación (fecha vs monto acumulado). Cierra siempre con
 * una barra final con la fecha de hoy y el total de valorización actual del activo.
 * Barras azules con la última destacada.
 */
function BarChart({ rows, currentValue, rentabilidadPercent = null, netShares = null }) {
  const { points, totalCost } = useMemo(() => {
    let acc = 0;
    let sharesAcc = 0;
    const base = rows.map((tx) => {
      acc += tx.monto;
      sharesAcc += parseFloat(tx.cantidad) || 0;
      return {
        date: tx.fecha_ing,
        value: acc,
        monto: acc,
        cumShares: sharesAcc,
        cumCost: acc,
      };
    });
    // Barra final "hoy": total de valorización actual del activo. Si la última
    // compra es de hoy, esa barra toma el valor actual (evita barras duplicadas).
    const today = todayISO();
    const todayValue = typeof currentValue === 'number' ? currentValue : acc;
    const last = base[base.length - 1];
    if (last && last.date === today) {
      last.value = todayValue;
      last.monto = todayValue;
    } else {
      base.push({ date: today, value: todayValue, monto: todayValue, cumShares: sharesAcc, cumCost: acc });
    }
    return { points: base, totalCost: acc };
  }, [rows, currentValue]);

  if (points.length === 0) return null;

  const maxValue = Math.max(...points.map((p) => p.value));
  const range = maxValue || 1;
  const innerW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const slot = innerW / points.length;
  const barWidth = Math.min(slot * 0.6, 90);
  const xAt = (i) => PAD_LEFT + i * slot + slot / 2;
  const barX = (i) => xAt(i) - barWidth / 2;
  const yAt = (v) => PAD_TOP + innerH - (v / range) * innerH;
  const baseY = PAD_TOP + innerH;

  // Rentabilidad por barra: cada compra aporta acciones a distinto precio, por
  // lo que la rentabilidad acumulada a cada fecha se calcula con el precio
  // unitario actual (valorización / acciones netas). La barra final usa la
  // rentabilidad oficial de la posición para calzar con la tabla.
  const overallRent =
    rentabilidadPercent ??
    (totalCost > 0 && typeof currentValue === 'number' ? ((currentValue - totalCost) / totalCost) * 100 : null);
  const currentUnit = typeof currentValue === 'number' && netShares > 0 ? currentValue / netShares : null;
  const rentAt = (i) => {
    if (i === points.length - 1) return overallRent;
    const p = points[i];
    if (currentUnit == null || !(p.cumCost > 0)) return null;
    return ((p.cumShares * currentUnit - p.cumCost) / p.cumCost) * 100;
  };
  const fmtRent = (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
  const pctFontSize = points.length > 10 ? 12 : 14;

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
    const v = f * range;
    return { y: yAt(v), v };
  });

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto" role="img" aria-label={`Gráfico de barras de compras de ${rows[0]?.nemotecnico ?? ''}`}>
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={t.y} y2={t.y} stroke="#1e293b" strokeDasharray="3 3" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <text x={PAD_LEFT - 8} y={t.y + 3} textAnchor="end" fontSize="18" fill="#64748b" fontFamily="JetBrains Mono, monospace">
            {formatUSD(t.v)}
          </text>
        </g>
      ))}

      {points.map((p, i) => {
        const isLast = i === points.length - 1;
        const barH = Math.max((p.value / range) * innerH, 2);
        const rent = rentAt(i);
        const pctX = Math.min(Math.max(xAt(i), PAD_LEFT + 30), WIDTH - PAD_RIGHT - 30);
        return (
          <g key={i}>
            <rect
              x={barX(i)}
              y={baseY - barH}
              width={barWidth}
              height={barH}
              rx="6"
              fill="#3b82f6"
              fillOpacity={isLast ? 1 : 0.65}
              stroke="#020617"
              strokeWidth="1.5"
              style={{ cursor: 'pointer' }}
            >
              <title>{rent == null ? `${p.date} — ${formatUSD(p.monto)}` : `${p.date} — ${formatUSD(p.monto)} (${fmtRent(rent)} rentabilidad)`}</title>
            </rect>
            {rent != null && barH >= 30 && (
              <text x={pctX} y={baseY - barH / 2 + 5} textAnchor="middle" fontSize={pctFontSize} fontWeight="700" fill="#ffffff" fontFamily="JetBrains Mono, monospace" pointerEvents="none">
                {fmtRent(rent)}
              </text>
            )}
          </g>
        );
      })}

      {visibleDates.map((i) => {
        // Etiqueta de monto centrada sobre la barra, recortada a los bordes
        // para que no se corte en la primera/última barra.
        const labelX = Math.min(Math.max(xAt(i), PAD_LEFT + 60), WIDTH - PAD_RIGHT - 60);
        return (
          <text key={`v-${i}`} x={labelX} y={yAt(points[i].value) - 10} textAnchor="middle" fontSize="15" fill="#94a3b8" fontFamily="JetBrains Mono, monospace">
            {formatUSD(points[i].monto)}
          </text>
        );
      })}

      {visibleDates.map((i) => {
        // Etiqueta de fecha centrada bajo la barra, recortada a los bordes
        // para que no se corte en la primera/última barra.
        const dateX = Math.min(Math.max(xAt(i), PAD_LEFT + 50), WIDTH - PAD_RIGHT - 50);
        return (
          <text key={i} x={dateX} y={HEIGHT - 10} textAnchor="middle" fontSize="15" fill="#94a3b8" fontFamily="JetBrains Mono, monospace">
            {points[i].date}
          </text>
        );
      })}
    </svg>
  );
}

/**
 * Card "Gráfico de Activos": por defecto muestra el primer activo activo del
 * mercado (Posiciones Activas). Grafica las compras del registro diario usando
 * fecha y monto total de cada operación.
 */
export function AssetChartBody({ transactions = EMPTY_TRANSACTIONS, openTicker = '', quote = null, usdHistory = EMPTY_USD_HISTORY, usdclpPrice = null, currentValue = null, mercado = 'NACIONAL', rentabilidadPercent = null }) {
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

  // Acciones netas del activo (compras menos ventas) para derivar el precio
  // unitario actual y la rentabilidad acumulada de cada barra.
  const netShares = useMemo(() => {
    let s = 0;
    for (const tx of transactions) {
      if ((tx.mercado ?? null) !== mercado) continue;
      if (String(tx.nemotecnico ?? '').trim().toUpperCase() !== target) continue;
      const q = parseFloat(tx.cantidad) || 0;
      if (tx.tipo === 'COMPRA') s += q;
      else if (tx.tipo === 'VENTA') s -= q;
    }
    return s;
  }, [transactions, mercado, target]);

  if (rows.length === 0 || !openTicker) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
        No hay compras registradas para este activo.
      </div>
    );
  }

  return (
    <div className="border border-slate-800 rounded-lg p-2 bg-slate-900/40">
      <BarChart rows={rows} currentValue={currentValue} rentabilidadPercent={rentabilidadPercent} netShares={netShares} />
    </div>
  );
}

export default function GraficoComprasCard({ title = 'Gráfico de Activos', transactions = EMPTY_TRANSACTIONS, openTicker = '', quote = null, usdHistory = EMPTY_USD_HISTORY, usdclpPrice = null, currentValue = null, mercado = 'NACIONAL', rentabilidadPercent = null }) {
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
        rentabilidadPercent={rentabilidadPercent}
      />
    </Card>
  );
}