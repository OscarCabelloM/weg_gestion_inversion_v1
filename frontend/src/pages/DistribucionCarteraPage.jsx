import { PieChart, DollarSign, LineChart, Bitcoin } from 'lucide-react';
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
 * Tab "Distribución de Cartera" — gráfico de torta a la izquierda, cards de posiciones a la derecha.
 */
export default function DistribucionCarteraPage({ portfolioSummary, portfolioNacional, portfolioCrypto }) {
  const openPositions = portfolioSummary.holdingsList.filter((h) => !h.closed);
  const nacionalPositions = openPositions.filter((h) => h.mercado === 'NACIONAL');
  const cryptoPositions = openPositions.filter((h) => h.mercado === 'CRYPTO');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
          label="Total Portfolio Crypto"
          icon={Bitcoin}
          iconColor="text-amber-400"
          value={portfolioCrypto?.totalPortfolioValue ?? 0}
          costBasis={portfolioCrypto?.totalCostBasis ?? 0}
          pnlPercent={portfolioCrypto?.overallPnLPercent ?? 0}
        />
      </div>

      <DistributionCard title="Distribución de Cartera Nacional" holdingsList={nacionalPositions} />
      <DistributionCard title="Distribución de Crypto" holdingsList={cryptoPositions} />
    </div>
  );
}
