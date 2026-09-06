import { useMemo, useState } from 'react';

const COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#ec4899', '#6366f1'];

/**
 * Gráfico de torta SVG puro — muestra la distribución porcentual del portafolio.
 * Hover sobre un slice lo resalta (opacidad) junto con su fila en la leyenda.
 */
export default function PortfolioPieChart({ holdingsList, totalValue }) {
  const [hovered, setHovered] = useState(null);

  const slices = useMemo(() => {
    if (!holdingsList?.length || totalValue <= 0) return [];
    let cumAngle = -90;

    return holdingsList.map((item, i) => {
      const pct = (item.currentValue / totalValue) * 100;
      const angle = (pct / 100) * 360;
      const startAngle = cumAngle;
      cumAngle += angle;
      const endAngle = cumAngle;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      const largeArc = angle > 180 ? 1 : 0;
      const r = 90;
      const cx = 100;
      const cy = 100;

      const x1 = cx + r * Math.cos(startRad);
      const y1 = cy + r * Math.sin(startRad);
      const x2 = cx + r * Math.cos(endRad);
      const y2 = cy + r * Math.sin(endRad);

      const midRad = ((startAngle + endAngle) / 2 * Math.PI) / 180;
      const labelR = r * 0.62;
      const lx = cx + labelR * Math.cos(midRad);
      const ly = cy + labelR * Math.sin(midRad);

      return {
        ...item,
        pct,
        color: COLORS[i % COLORS.length],
        path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`,
        lx,
        ly,
      };
    });
  }, [holdingsList, totalValue]);

  if (!slices.length) return null;

  // Porcentajes de display que siempre suman 100.0: se redondea a 1 decimal
  // los N-1 primeros y el último absorbe la diferencia de redondeo.
  const rawPcts = slices.map((s) => s.pct);
  const roundedPcts = rawPcts.map((p) => Number(p.toFixed(1)));
  const sumExceptLast = roundedPcts.slice(0, -1).reduce((a, b) => a + b, 0);
  const displayPcts = roundedPcts.map((v, i) =>
    i < roundedPcts.length - 1 ? v.toFixed(1) : (100 - sumExceptLast).toFixed(1)
  );

  // Caso borde: un solo holding = 100% del círculo. Un path de arco con
  // inicio == fin no renderiza en SVG, por eso se dibuja un círculo completo.
  const isSingleSlice = slices.length === 1;

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox="0 0 200 200" className="w-full max-w-[260px]">
        {isSingleSlice ? (
          <circle
            cx="100"
            cy="100"
            r="90"
            fill={slices[0].color}
            stroke="#0f172a"
            strokeWidth="1.5"
            className="transition-opacity cursor-pointer"
            opacity={hovered ? 1 : 0.85}
            onMouseEnter={() => setHovered(slices[0].ticker)}
            onMouseLeave={() => setHovered(null)}
          />
        ) : (
          slices.map((s) => (
            <path
              key={s.ticker}
              d={s.path}
              fill={s.color}
              stroke="#0f172a"
              strokeWidth="1.5"
              className="transition-opacity cursor-pointer"
              opacity={hovered === s.ticker ? 1 : hovered ? 0.45 : 0.85}
              onMouseEnter={() => setHovered(s.ticker)}
              onMouseLeave={() => setHovered(null)}
            />
          ))
        )}
        {slices.map((s, i) =>
          parseFloat(displayPcts[i]) > 5 ? (
            <text
              key={`lbl-${s.ticker}`}
              x={s.lx}
              y={s.ly}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-white text-[9px] font-bold pointer-events-none"
            >
              {displayPcts[i]}%
            </text>
          ) : null
        )}

        <circle cx="100" cy="100" r="42" fill="#0f172a" />
        <text x="100" y="96" textAnchor="middle" className="fill-slate-100 text-[13px] font-black">
          {totalValue >= 1_000_000
            ? `$${(totalValue / 1_000_000).toFixed(1)}M`
            : `$${(totalValue / 1_000).toFixed(0)}K`}
        </text>
        <text x="100" y="112" textAnchor="middle" className="fill-slate-400 text-[7px] font-medium">
          TOTAL
        </text>
      </svg>

      {/* Leyenda */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] w-full">
        {slices.map((s, i) => (
          <div
            key={s.ticker}
            className="flex items-center gap-1.5 truncate cursor-pointer transition-opacity"
            style={{ opacity: hovered && hovered !== s.ticker ? 0.45 : 1 }}
            onMouseEnter={() => setHovered(s.ticker)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-slate-300 truncate font-medium">{s.ticker}</span>
            <span className="text-slate-500 ml-auto tabular-nums">{displayPcts[i]}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
