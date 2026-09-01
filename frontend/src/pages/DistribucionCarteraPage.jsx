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
        <StatCard
          label={<span className="flex items-center gap-1">Total Portfolio <DollarSign className="w-4 h-4 text-blue-400" /></span>}
          value={formatUSD(portfolioSummary.totalPortfolioValue)}
        >
          <div>
            Capital Invertido: <span className="font-semibold text-slate-200">{formatUSD(portfolioSummary.totalCostBasis)}</span>
            {' · '}Rentabilidad:{' '}
            <span className={`font-semibold ${portfolioSummary.overallPnLPercent >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
              {portfolioSummary.overallPnLPercent >= 0 ? '+' : ''}{portfolioSummary.overallPnLPercent.toFixed(2)}%
            </span>
          </div>
        </StatCard>

        <StatCard
          label={<span className="flex items-center gap-1">Total Portfolio Nacional <LineChart className="w-4 h-4 text-blue-400" /></span>}
          value={formatUSD(portfolioNacional?.totalPortfolioValue ?? 0)}
        >
          <div>
            Capital Invertido: <span className="font-semibold text-slate-200">{formatUSD(portfolioNacional?.totalCostBasis ?? 0)}</span>
            {' · '}Rentabilidad:{' '}
            <span className={`font-semibold ${(portfolioNacional?.overallPnLPercent ?? 0) >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
              {(portfolioNacional?.overallPnLPercent ?? 0) >= 0 ? '+' : ''}{(portfolioNacional?.overallPnLPercent ?? 0).toFixed(2)}%
            </span>
          </div>
        </StatCard>

        <StatCard
          label={<span className="flex items-center gap-1">Total Portfolio Crypto <Bitcoin className="w-4 h-4 text-amber-400" /></span>}
          value={formatUSD(portfolioCrypto?.totalPortfolioValue ?? 0)}
        >
          <div>
            Capital Invertido: <span className="font-semibold text-slate-200">{formatUSD(portfolioCrypto?.totalCostBasis ?? 0)}</span>
            {' · '}Rentabilidad:{' '}
            <span className={`font-semibold ${(portfolioCrypto?.overallPnLPercent ?? 0) >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
              {(portfolioCrypto?.overallPnLPercent ?? 0) >= 0 ? '+' : ''}{(portfolioCrypto?.overallPnLPercent ?? 0).toFixed(2)}%
            </span>
          </div>
        </StatCard>
      </div>

      <DistributionCard title="Distribución de Cartera Nacional" holdingsList={nacionalPositions} />
      <DistributionCard title="Distribución de Crypto" holdingsList={cryptoPositions} />
    </div>
  );
}
