import { useEffect } from 'react';
import { Activity, DollarSign, PieChart, BarChart3, Percent, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Card from '@/components/ui/Card';
import StatCard from '@/components/portfolio/StatCard';
import ColumnChart from '@/components/charts/ColumnChart';
import PositionsTable from '@/components/portfolio/PositionsTable';
import ClosedPositionsTable from '@/components/portfolio/ClosedPositionsTable';
import { formatUSD, formatSignedUSD } from '@/lib/formatters';

/** Tarjetas de métricas resumen del mercado. */
function MetricCards({ portfolioSummary, lastSyncTime }) {
  const isPositivePnL = portfolioSummary.overallPnL >= 0;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Total Portfolio" icon={DollarSign} value={formatUSD(portfolioSummary.totalPortfolioValue)}>
        <div className="flex items-center justify-between">
          <span>Capital Invertido:</span>
          <span className="font-semibold text-slate-200">{formatUSD(portfolioSummary.totalCostBasis)}</span>
        </div>
      </StatCard>

      <StatCard
        label="Total Ganancia / Pérdida"
        icon={PieChart}
        iconClassName="text-cyan-400"
        value={formatSignedUSD(portfolioSummary.overallPnL)}
        valueClassName={isPositivePnL ? 'text-blue-400' : 'text-rose-500'}
      >
        <div className={`font-semibold flex items-center gap-1 ${isPositivePnL ? 'text-blue-400' : 'text-rose-500'}`}>
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

      <StatCard label="Rentabilidad Total" icon={Percent} iconClassName="text-purple-400" value={`${portfolioSummary.overallPnLPercent.toFixed(2)}%`}>
        <div className="text-slate-400 flex items-center gap-1">
          <span>{portfolioSummary.assetCount} activos posicionados</span>
        </div>
      </StatCard>
    </div>
  );
}

/** Cabecera del gráfico: ticker, nombre, precio actual y variación del día. */
function ChartHeader({ selectedTicker, selectedQuote, chartPrice, changePercent }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-white">{selectedTicker}</h3>
          <span className="text-xs text-slate-400 font-medium">{selectedQuote?.name}</span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-2xl font-extrabold text-white">{formatUSD(chartPrice)}</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${changePercent >= 0 ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
            {changePercent >= 0 ? '+' : ''}
            {changePercent.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
}

/** Sección de tablas: posiciones activas (NACIONAL/CRYPTO) y cerradas del mercado. */
function PositionsSection({ mercado, openPositions, closedPositions, onSelectTicker, usdclpPrice }) {
  return (
    <>
      {mercado === 'NACIONAL' ? (
        <PositionsTable holdingsList={openPositions} onViewChart={onSelectTicker} title="Posiciones Activas Nacional" />
      ) : (
        <PositionsTable
          holdingsList={openPositions}
          onViewChart={onSelectTicker}
          title="Posiciones Activas Crypto"
          footer={
            <div className="flex items-center justify-start gap-2 text-xs border-t border-slate-800 pt-3">
              <span className="text-slate-400 font-semibold">Valor Dólar:</span>
              {usdclpPrice != null ? (
                <span className="px-2 py-0.5 rounded font-bold text-white bg-slate-800 border border-blue-500/30 text-blue-300">
                  {formatUSD(usdclpPrice, 2)}
                </span>
              ) : (
                <span className="text-slate-600">—</span>
              )}
            </div>
          }
        />
      )}
      {closedPositions.length > 0 && (
        <ClosedPositionsTable holdingsList={closedPositions} onViewChart={onSelectTicker} />
      )}
    </>
  );
}

/**
 * Tab 1 — Resumen del portafolio filtrado por mercado (`mercado`):
 * tarjetas de métricas, gráfico línea, y tablas de posiciones del mercado.
 */
export default function PortfolioPage({
  portfolioSummary,
  marketPrices,
  selectedTicker,
  onSelectTicker,
  candles,
  lastSyncTime,
  usdclpPrice = null,
  mercado = 'NACIONAL',
}) {
  const selectedQuote = marketPrices[selectedTicker];
  const selectedHolding = portfolioSummary.holdingsList.find((h) => h.ticker === selectedTicker);
  // La cuenta CUENTA2.AFP no se revaloriza con el mercado: se grafica y muestra con el
  // precio promedio (costo) de la posición.
  const isCuentaFondo = selectedTicker === 'CUENTA2.AFP';
  const chartPrice = isCuentaFondo
    ? selectedHolding?.avgBuyPrice ?? selectedQuote?.currentPrice ?? null
    : selectedQuote?.currentPrice ?? null;
  const chartShares = selectedHolding
    ? selectedHolding.shares > 0
      ? selectedHolding.shares
      : selectedHolding.closedShares
    : 0;
  const changePercent = selectedQuote?.changePercent || 0;
  const openPositions = portfolioSummary.holdingsList.filter((h) => !h.closed && h.mercado === mercado);
  const closedPositions = portfolioSummary.holdingsList.filter((h) => h.closed && h.mercado === mercado);

  // Al abrir la vista, el gráfico apunta al primer activo del mercado si el
  // ticker seleccionado globalmente no pertenece a este mercado.
  useEffect(() => {
    const holds = portfolioSummary.holdingsList;
    if (holds.length === 0 || holds.some((h) => h.ticker === selectedTicker)) return;
    const first = holds.find((h) => !h.closed)?.ticker ?? holds[0]?.ticker;
    if (first) onSelectTicker(first);
  }, [portfolioSummary.holdingsList, selectedTicker, onSelectTicker]);

  return (
    <div className="space-y-6">
      <MetricCards portfolioSummary={portfolioSummary} lastSyncTime={lastSyncTime} />

      <Card title="Gráfico de Valorización" icon={Activity}>
        <ChartHeader selectedTicker={selectedTicker} selectedQuote={selectedQuote} chartPrice={chartPrice} changePercent={changePercent} />
        <ColumnChart candles={candles} ticker={selectedTicker} shares={chartShares} usdToClp={mercado === 'CRYPTO' ? usdclpPrice : null} currentPrice={selectedQuote?.currentPrice ?? null} flatPrice={isCuentaFondo ? (selectedHolding?.avgBuyPrice ?? null) : null} />
      </Card>

      <PositionsSection
        mercado={mercado}
        openPositions={openPositions}
        closedPositions={closedPositions}
        onSelectTicker={onSelectTicker}
        usdclpPrice={usdclpPrice}
      />
    </div>
  );
}
