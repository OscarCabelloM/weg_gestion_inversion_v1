import { DollarSign, PieChart, BarChart3, Layers, CheckCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Card from '@/components/ui/Card';
import StatCard from '@/components/portfolio/StatCard';
import LineChart from '@/components/charts/LineChart';
import HoldingsSidebar from '@/components/portfolio/HoldingsSidebar';
import PositionsTable from '@/components/portfolio/PositionsTable';
import { formatUSD, formatSignedUSD } from '@/lib/formatters';

/**
 * Tab 1 — Resumen del portafolio, gráfico interactivo de velas,
 * distribución de cartera y detalle de posiciones.
 */
export default function PortfolioPage({
  portfolioSummary,
  marketPrices,
  selectedTicker,
  onSelectTicker,
  candles,
  lastSyncTime,
}) {
  const selectedQuote = marketPrices[selectedTicker];
  const changePercent = selectedQuote?.changePercent || 0;
  const isPositivePnL = portfolioSummary.overallPnL >= 0;

  return (
    <div className="space-y-6">
      {/* Tarjetas de métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Valorización Actual" icon={DollarSign} value={formatUSD(portfolioSummary.totalPortfolioValue)}>
          <div className="flex items-center justify-between">
            <span>Capital Invertido:</span>
            <span className="font-semibold text-slate-200">{formatUSD(portfolioSummary.totalCostBasis)}</span>
          </div>
        </StatCard>

        <StatCard
          label="Ganancia / Pérdida Total"
          icon={PieChart}
          iconClassName="text-cyan-400"
          value={formatSignedUSD(portfolioSummary.overallPnL)}
          valueClassName={isPositivePnL ? 'text-blue-400' : 'text-rose-500'}
        >
          <div
            className={`font-semibold flex items-center gap-1 ${
              isPositivePnL ? 'text-blue-400' : 'text-rose-500'
            }`}
          >
            {isPositivePnL ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            <span>{portfolioSummary.overallPnLPercent.toFixed(2)}% Retorno Total</span>
          </div>
        </StatCard>

        <StatCard
          label="Variación del Día"
          icon={BarChart3}
          iconClassName="text-amber-400"
          value={formatSignedUSD(portfolioSummary.totalDayChangeDollar)}
          valueClassName={portfolioSummary.totalDayChangeDollar >= 0 ? 'text-blue-400' : 'text-rose-500'}
        >
          <div className="flex items-center gap-1">
            <span>Última sinc.:</span>
            <span className="text-slate-300 font-mono">{lastSyncTime}</span>
          </div>
        </StatCard>

        <StatCard label="Activos Posicionados" icon={Layers} iconClassName="text-purple-400" value={`${portfolioSummary.assetCount} Tickers`}>
          <div className="text-blue-400 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Conexión API Yahoo activa</span>
          </div>
        </StatCard>
      </div>

      {/* Gráfico de velas + distribución */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{selectedTicker}</h3>
                <span className="text-xs text-slate-400 font-medium">{selectedQuote?.name}</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-2xl font-extrabold text-white">{formatUSD(selectedQuote?.currentPrice)}</span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded ${
                    changePercent >= 0
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {changePercent >= 0 ? '+' : ''}
                  {changePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          <LineChart candles={candles} ticker={selectedTicker} />
        </Card>

        <HoldingsSidebar
          holdingsList={portfolioSummary.holdingsList}
          totalValue={portfolioSummary.totalPortfolioValue}
          selectedTicker={selectedTicker}
          onSelectTicker={onSelectTicker}
        />
      </div>

      {/* Tabla de posiciones */}
      <PositionsTable holdingsList={portfolioSummary.holdingsList} onViewChart={onSelectTicker} />
    </div>
  );
}
