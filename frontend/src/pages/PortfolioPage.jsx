import { DollarSign, PieChart, BarChart3, Percent, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import StatCard from '@/components/portfolio/StatCard';
import PositionsTable from '@/components/portfolio/PositionsTable';
import ClosedPositionsTable from '@/components/portfolio/ClosedPositionsTable';
import { formatUSD, formatSignedUSD } from '@/lib/formatters';

const EMPTY_TRANSACTIONS = [];
const EMPTY_USD_HISTORY = {};
const EMPTY_PRICES = {};

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

/** Sección de tablas: posiciones activas (NACIONAL/CRYPTO) y cerradas del mercado. */
function PositionsSection({ mercado, openPositions, closedPositions, onSelectTicker, usdclpPrice, transactions, usdHistory, prices }) {
  return (
    <>
      {mercado === 'NACIONAL' ? (
        <PositionsTable
          holdingsList={openPositions}
          onViewChart={onSelectTicker}
          title="Posiciones Activas Nacional"
          transactions={transactions}
          prices={prices}
          usdHistory={usdHistory}
          usdclpPrice={usdclpPrice}
          mercado={mercado}
        />
      ) : mercado === 'CRYPTO' ? (
        <PositionsTable
          holdingsList={openPositions}
          onViewChart={onSelectTicker}
          title="Posiciones Activas Crypto"
          transactions={transactions}
          prices={prices}
          usdHistory={usdHistory}
          usdclpPrice={usdclpPrice}
          mercado={mercado}
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
      ) : (
        <PositionsTable
          holdingsList={openPositions}
          onViewChart={onSelectTicker}
          title="Posiciones Activas Internacional"
          transactions={transactions}
          prices={prices}
          usdHistory={usdHistory}
          usdclpPrice={usdclpPrice}
          mercado={mercado}
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
        <ClosedPositionsTable
          holdingsList={closedPositions}
          onViewChart={onSelectTicker}
          transactions={transactions}
          prices={prices}
          usdHistory={usdHistory}
          usdclpPrice={usdclpPrice}
          mercado={mercado}
        />
      )}
    </>
  );
}

/**
 * Tab 1 — Resumen del portafolio filtrado por mercado (`mercado`):
 * tarjetas de métricas y tablas de posiciones del mercado.
 */
export default function PortfolioPage({
  portfolioSummary,
  onSelectTicker,
  lastSyncTime,
  usdclpPrice = null,
  mercado = 'NACIONAL',
  transactions = EMPTY_TRANSACTIONS,
  usdHistory = EMPTY_USD_HISTORY,
  prices = EMPTY_PRICES,
}) {
  const openPositions = portfolioSummary.holdingsList.filter((h) => !h.closed && h.mercado === mercado);
  const closedPositions = portfolioSummary.holdingsList.filter((h) => h.closed && h.mercado === mercado);

  return (
    <div className="space-y-6">
      <MetricCards portfolioSummary={portfolioSummary} lastSyncTime={lastSyncTime} />

      <PositionsSection
        mercado={mercado}
        openPositions={openPositions}
        closedPositions={closedPositions}
        onSelectTicker={onSelectTicker}
        usdclpPrice={usdclpPrice}
        transactions={transactions}
        usdHistory={usdHistory}
        prices={prices}
      />
    </div>
  );
}
