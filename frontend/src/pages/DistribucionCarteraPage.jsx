import { useMemo, useState } from 'react';
import { PieChart, DollarSign, LineChart, Bitcoin, Globe, Layers } from 'lucide-react';
import Card from '@/components/ui/Card';
import StatCard from '@/components/portfolio/StatCard';
import PortfolioPieChart from '@/components/portfolio/PortfolioPieChart';
import { formatUSD } from '@/lib/formatters';

/**
 * Card de distribución de un grupo de posiciones: gráfico de torta a la izquierda,
 * cards de posiciones a la derecha.
 */
function DistributionCard({ title, holdingsList }) {
  const totalValue = holdingsList.reduce((acc, h) => acc + h.currentValue, 0);
  const sorted = holdingsList.toSorted((a, b) => b.currentValue - a.currentValue);

  return (
    <Card title={title} icon={PieChart}>
      {sorted.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-12">
          No hay posiciones abiertas actualmente. Registra una compra en el menú superior.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Izquierda: gráfico de torta */}
          <div className="flex items-center justify-center">
            <PortfolioPieChart holdingsList={sorted} totalValue={totalValue} />
          </div>

          {/* Derecha: cards de cada acción */}
          <div className="space-y-3">
            {sorted.map((item) => {
              const sharePct = totalValue > 0 ? (item.currentValue / totalValue) * 100 : 0;

              return (
                <div
                  key={item.ticker}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Izquierda: ticker + nombre */}
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-white">{item.ticker}</span>
                      <span className="block text-[10px] text-slate-400 truncate max-w-[260px]">{item.name}</span>
                    </div>

                    {/* Derecha: valor + acciones */}
                    <div className="text-right shrink-0">
                      <span className="text-base font-black text-white">{formatUSD(item.currentValue)}</span>
                      <span className="block text-[10px] text-slate-400">{Number(item.shares).toLocaleString('es-CL')} acc.</span>
                    </div>
                  </div>

                  {/* Barra + % */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-bold text-slate-300 w-10 text-right tabular-nums">{sharePct.toFixed(1)}%</span>
                    <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, sharePct)}%` }} />
                    </div>
                  </div>

                  {/* P&L + Div */}
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-[11px]">
                    <span className="text-slate-400">
                      P&L:
                      <span className={`ml-1 font-semibold ${item.pnl >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                        {formatUSD(item.pnl)} ({item.pnlPercent >= 0 ? '+' : ''}{item.pnlPercent.toFixed(2)}%)
                      </span>
                    </span>
                    <span className="text-slate-400">
                      Div: <span className={`font-semibold ${item.dividends > 0 ? 'text-purple-400' : 'text-slate-500'}`}>{formatUSD(item.dividends)}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

/** Card de métrica resumen de un mercado: capital invertido + rentabilidad con color. */
function PortfolioMetricCard({ label, icon: Icon, iconColor, value, costBasis, pnlPercent }) {
  const isPositive = pnlPercent >= 0;
  return (
    <StatCard
      label={<span className="flex items-center gap-1">{label} <Icon className={`w-4 h-4 ${iconColor}`} /></span>}
      value={formatUSD(value)}
    >
      <div>
        Capital Invertido: <span className="font-semibold text-slate-200">{formatUSD(costBasis)}</span>
        {' · '}Rentabilidad:{' '}
        <span className={`font-semibold ${isPositive ? 'text-blue-400' : 'text-rose-400'}`}>
          {isPositive ? '+' : ''}{pnlPercent.toFixed(2)}%
        </span>
      </div>
    </StatCard>
  );
}

/**
 * Card "Total Distribución de Cartera": torta con el % de cada mercado
 * (Nacional / Internacional / Crypto) sobre el total valorizado.
 */
function TotalDistribucionCarteraCard({ nacionalValue, internacionalValue, cryptoValue }) {
  const [hovered, setHovered] = useState(null);

  const segments = useMemo(() => {
    const items = [
      { label: 'Total Portfolio Nacional', value: nacionalValue ?? 0, color: '#3b82f6' },
      { label: 'Total Portfolio Internacional', value: internacionalValue ?? 0, color: '#06b6d4' },
      { label: 'Total Portfolio Crypto', value: cryptoValue ?? 0, color: '#f59e0b' },
    ];
    const total = items.reduce((acc, s) => acc + s.value, 0);
    if (total <= 0) return { slices: [], total: 0 };

    const active = items.filter((s) => s.value > 0);
    let cumAngle = -90;
    const slices = active.map((s) => {
      const pct = (s.value / total) * 100;
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

      return {
        ...s,
        pct,
        path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`,
        lx: cx + labelR * Math.cos(midRad),
        ly: cy + labelR * Math.sin(midRad),
      };
    });

    // Porcentajes de display que siempre suman 100.0.
    const rounded = slices.map((s) => Number(s.pct.toFixed(1)));
    const sumExceptLast = rounded.slice(0, -1).reduce((a, b) => a + b, 0);
    const displayPcts = rounded.map((v, i) =>
      i < rounded.length - 1 ? v.toFixed(1) : (100 - sumExceptLast).toFixed(1)
    );

    return { slices, total, displayPcts };
  }, [nacionalValue, internacionalValue, cryptoValue]);

  const { slices, total, displayPcts } = segments;
  const isSingleSlice = slices.length === 1;

  return (
    <Card title="Total Distribución de Cartera" icon={Layers}>
      {slices.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-12">
          No hay posiciones abiertas actualmente. Registra una compra en el menú superior.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Izquierda: torta por mercado */}
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
                  onMouseEnter={() => setHovered(slices[0].label)}
                  onMouseLeave={() => setHovered(null)}
                />
              ) : (
                slices.map((s) => (
                  <path
                    key={s.label}
                    d={s.path}
                    fill={s.color}
                    stroke="#0f172a"
                    strokeWidth="1.5"
                    className="transition-opacity cursor-pointer"
                    opacity={hovered === s.label ? 1 : hovered ? 0.45 : 0.85}
                    onMouseEnter={() => setHovered(s.label)}
                    onMouseLeave={() => setHovered(null)}
                  />
                ))
              )}
              {slices.map((s, i) =>
                parseFloat(displayPcts[i]) > 5 ? (
                  <text
                    key={`lbl-${s.label}`}
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
                {total >= 1_000_000
                  ? `$${(total / 1_000_000).toFixed(1)}M`
                  : `$${(total / 1_000).toFixed(0)}K`}
              </text>
              <text x="100" y="112" textAnchor="middle" className="fill-slate-400 text-[7px] font-medium">
                TOTAL
              </text>
            </svg>

            {/* Leyenda */}
            <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-[11px] w-full">
              {slices.map((s, i) => (
                <div
                  key={s.label}
                  title={s.label}
                  className="flex items-center gap-1.5 truncate cursor-pointer transition-opacity"
                  style={{ opacity: hovered && hovered !== s.label ? 0.45 : 1 }}
                  onMouseEnter={() => setHovered(s.label)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-slate-300 truncate font-medium">{s.label}</span>
                  <span className="text-slate-500 ml-auto tabular-nums">{displayPcts[i]}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Derecha: detalle por mercado */}
          <div className="space-y-3">
            {slices.map((s, i) => (
              <div
                key={s.label}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-opacity cursor-pointer"
                style={{ opacity: hovered && hovered !== s.label ? 0.45 : 1 }}
                onMouseEnter={() => setHovered(s.label)}
                onMouseLeave={() => setHovered(null)}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-sm font-bold text-white">{s.label}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-base font-black text-white">{formatUSD(s.value)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-bold text-slate-300 w-10 text-right tabular-nums">{displayPcts[i]}%</span>
                  <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, s.pct)}%`, backgroundColor: s.color }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

/**
 * Tab "Distribución de Cartera" — gráfico de torta a la izquierda, cards de posiciones a la derecha.
 */
export default function DistribucionCarteraPage({ portfolioSummary, portfolioNacional, portfolioInternacional, portfolioCrypto }) {
  const openPositions = portfolioSummary.holdingsList.filter((h) => !h.closed);
  const nacionalPositions = openPositions.filter((h) => h.mercado === 'NACIONAL');
  const internacionalPositions = openPositions.filter((h) => h.mercado === 'INTERNACIONAL');
  const cryptoPositions = openPositions.filter((h) => h.mercado === 'CRYPTO');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <PortfolioMetricCard
          label="Total Portfolio"
          icon={DollarSign}
          iconColor="text-blue-400"
          value={portfolioSummary.totalPortfolioValue}
          costBasis={portfolioSummary.totalCostBasis}
          pnlPercent={portfolioSummary.overallPnLPercent}
        />
        <PortfolioMetricCard
          label="Total Portfolio Nacional"
          icon={LineChart}
          iconColor="text-blue-400"
          value={portfolioNacional?.totalPortfolioValue ?? 0}
          costBasis={portfolioNacional?.totalCostBasis ?? 0}
          pnlPercent={portfolioNacional?.overallPnLPercent ?? 0}
        />
        <PortfolioMetricCard
          label="Total Portfolio Internacional"
          icon={Globe}
          iconColor="text-cyan-400"
          value={portfolioInternacional?.totalPortfolioValue ?? 0}
          costBasis={portfolioInternacional?.totalCostBasis ?? 0}
          pnlPercent={portfolioInternacional?.overallPnLPercent ?? 0}
        />
        <PortfolioMetricCard
          label="Total Portfolio Crypto"
          icon={Bitcoin}
          iconColor="text-amber-400"
          value={portfolioCrypto?.totalPortfolioValue ?? 0}
          costBasis={portfolioCrypto?.totalCostBasis ?? 0}
          pnlPercent={portfolioCrypto?.overallPnLPercent ?? 0}
        />
      </div>

      <TotalDistribucionCarteraCard
        nacionalValue={portfolioNacional?.totalPortfolioValue ?? 0}
        internacionalValue={portfolioInternacional?.totalPortfolioValue ?? 0}
        cryptoValue={portfolioCrypto?.totalPortfolioValue ?? 0}
      />

      <DistributionCard title="Distribución de Cartera Nacional" holdingsList={nacionalPositions} />
      <DistributionCard title="Distribución Internacional" holdingsList={internacionalPositions} />
      <DistributionCard title="Distribución de Crypto" holdingsList={cryptoPositions} />
    </div>
  );
}
