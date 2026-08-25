import { PieChart } from 'lucide-react';
import Card from '@/components/ui/Card';
import PortfolioPieChart from '@/components/portfolio/PortfolioPieChart';
import { formatUSD } from '@/lib/formatters';

/**
 * Tab "Distribución de Cartera" — gráfico de torta a la izquierda, cards de posiciones a la derecha.
 */
export default function DistribucionCarteraPage({ portfolioSummary }) {
  const totalValue = portfolioSummary.totalPortfolioValue;
  const openPositions = portfolioSummary.holdingsList
    .filter((h) => !h.closed)
    .sort((a, b) => b.currentValue - a.currentValue);

  return (
    <div className="space-y-6">
      <Card title="Distribución de Cartera" icon={PieChart}>
        <p className="text-xs text-slate-400 mb-4">
          Valor total del portafolio: <span className="text-white font-semibold">{formatUSD(totalValue)}</span>
        </p>

        {openPositions.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-12">
            No hay posiciones abiertas actualmente. Registra una compra en el menú superior.
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Izquierda: gráfico de torta */}
            <div className="flex items-center justify-center">
              <PortfolioPieChart holdingsList={openPositions} totalValue={totalValue} />
            </div>

            {/* Derecha: cards de cada acción */}
            <div className="space-y-3">
              {openPositions.map((item) => {
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
    </div>
  );
}
