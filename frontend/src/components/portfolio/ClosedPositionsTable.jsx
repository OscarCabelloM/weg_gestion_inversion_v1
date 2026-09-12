import { useState, Fragment } from 'react';
import { Lock, ChevronDown, ChevronRight, ChevronUp, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import Card from '@/components/ui/Card';
import { AssetChartBody } from '@/components/portfolio/GraficoComprasCard';
import { formatUSD } from '@/lib/formatters';

const EMPTY_TRANSACTIONS = [];
const EMPTY_PRICES = {};
const EMPTY_USD_HISTORY = {};

/**
 * Tabla de posiciones cerradas del portafolio (venta total). Colapsable.
 * Al hacer click en un activo se despliega el Gráfico de Activos en la línea
 * inmediatamente inferior; por defecto permanece oculto.
 */
export default function ClosedPositionsTable({ holdingsList, onViewChart, transactions = EMPTY_TRANSACTIONS, prices = EMPTY_PRICES, usdHistory = EMPTY_USD_HISTORY, usdclpPrice = null, mercado = 'NACIONAL' }) {
  const [collapsed, setCollapsed] = useState(true);
  const [expandedTicker, setExpandedTicker] = useState(null);

  const handleToggleChart = (ticker) => {
    setExpandedTicker((prev) => (prev === ticker ? null : ticker));
    onViewChart?.(ticker);
  };
  const totalVenta = holdingsList.reduce((acc, r) => acc + (r.currentValue || 0), 0);
  const totalCosto = holdingsList.reduce((acc, r) => acc + (r.closedCost || 0), 0);
  const totalDividendos = holdingsList.reduce((acc, r) => acc + (r.dividends || 0), 0);
  const totalComisiones = holdingsList.reduce((acc, r) => acc + (r.commissions || 0), 0);
  const totalPnL = totalVenta - totalCosto + totalDividendos - totalComisiones;
  const totalPct = totalCosto > 0 ? (totalPnL / totalCosto) * 100 : 0;
  const totalValorHoy = holdingsList.reduce((acc, r) => acc + (r.currentPrice || 0), 0);

  return (
    <Card
      title="Posiciones Cerradas"
      icon={Lock}
      iconClassName="text-slate-400"
      actions={
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="text-slate-400 hover:text-blue-400 transition-colors p-1"
          title={collapsed ? 'Expandir' : 'Colapsar'}
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      }
    >
      {!collapsed && (
        <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider">
            <tr>
              <th className="p-3">Activo</th>
              <th className="p-3 text-right">Valor Hoy</th>
              <th className="p-3 text-right">Cantidad</th>
              <th className="p-3 text-right">Inversión Inicial</th>
              <th className="p-3 text-right">Valorización Venta</th>
              <th className="p-3 text-right">Dividendos</th>
              <th className="p-3 text-right">Comisiones</th>
              <th className="p-3 text-right">Ganancia / Pérdida</th>
              <th className="p-3 text-right">Rentabilidad %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {holdingsList.map((row) => {
              const isExpanded = expandedTicker === row.ticker;
              return (
                <Fragment key={row.ticker}>
                  <tr className={`transition hover:bg-slate-800/40 ${isExpanded ? 'bg-slate-800/40' : ''}`}>
                <td className="p-3">
                  <button
                    onClick={() => handleToggleChart(row.ticker)}
                    aria-label={`Ver gráfico de ${row.ticker}`}
                    aria-expanded={isExpanded}
                    className="flex items-center gap-2 text-left font-bold text-white hover:text-blue-400 transition-colors cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full shrink-0 bg-slate-500"></span>
                    <span>
                      {row.ticker}
                      <span className="block text-[10px] text-slate-400 font-normal">{row.name}</span>
                    </span>
                    {isExpanded
                      ? <ChevronDown className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      : <ChevronUp className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
                  </button>
                </td>
                <td className="p-3 text-right">
                  <div className="text-white font-bold tabular-nums">{formatUSD(row.currentPrice)}</div>
                  <div className={`text-[11px] font-bold flex items-center justify-end gap-1 ${row.changePercent >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                    {row.changePercent >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {row.changePercent >= 0 ? '+' : ''}{row.changePercent.toFixed(2)}%
                  </div>
                </td>
                <td className="p-3 text-slate-200 text-right tabular-nums">{Number(row.closedShares).toLocaleString('es-CL')}</td>
                <td className="p-3 text-slate-300 text-right tabular-nums">{formatUSD(row.closedCost)}</td>
                <td className="p-3 text-white font-bold text-right tabular-nums">{formatUSD(row.currentValue)}</td>
                <td className={`p-3 font-semibold text-right tabular-nums ${row.dividends > 0 ? 'text-purple-400' : 'text-slate-500'}`}>
                  {row.dividends > 0 ? formatUSD(row.dividends) : '—'}
                </td>
                <td className={`p-3 font-semibold text-right tabular-nums ${row.commissions > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                  {row.commissions > 0 ? formatUSD(row.commissions) : '—'}
                </td>
                <td className="p-3 text-right">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      row.pnl >= 0 ? 'bg-blue-500/10 text-blue-400' : 'bg-rose-500/10 text-rose-400'
                    }`}
                  >
                    {formatUSD(row.pnl)}
                  </span>
                </td>
                <td className={`p-3 font-bold text-right tabular-nums ${row.pnl >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                  {row.pnl >= 0 ? '+' : ''}
                  {row.pnlPercent.toFixed(2)}%
                </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-slate-950/60">
                      <td colSpan={9} className="p-3">
                        <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-2">
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <Activity className="w-4 h-4 text-blue-400" />
                            <span>Gráfico de Activos — {row.ticker}</span>
                          </h4>
                          <AssetChartBody
                            transactions={transactions}
                            openTicker={row.ticker}
                            quote={prices[row.ticker]}
                            currentValue={row.currentValue}
                            usdHistory={usdHistory}
                            usdclpPrice={usdclpPrice}
                            mercado={row.mercado ?? mercado}
                            rentabilidadPercent={row.pnlPercent}
                          />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-slate-800 bg-slate-950/60 font-bold">
            <tr>
              <td className="p-3 text-white text-right">Total ({holdingsList.length} cerradas)</td>
              <td className="p-3 text-white font-bold text-right tabular-nums">{formatUSD(totalValorHoy)}</td>
              <td className="p-3 text-right tabular-nums"></td>
              <td className="p-3 text-slate-300 text-right tabular-nums">{formatUSD(totalCosto)}</td>
              <td className="p-3 text-white font-bold text-right tabular-nums">{formatUSD(totalVenta)}</td>
              <td className={`p-3 font-bold text-right tabular-nums ${totalDividendos > 0 ? 'text-purple-400' : 'text-slate-500'}`}>
                {totalDividendos > 0 ? formatUSD(totalDividendos) : '—'}
              </td>
              <td className={`p-3 font-bold text-right tabular-nums ${totalComisiones > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                {totalComisiones > 0 ? formatUSD(totalComisiones) : '—'}
              </td>
              <td className="p-3 text-right">
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    totalPnL >= 0 ? 'bg-blue-500/10 text-blue-400' : 'bg-rose-500/10 text-rose-400'
                  }`}
                >
                  {formatUSD(totalPnL)}
                </span>
              </td>
              <td className={`p-3 text-right tabular-nums ${totalPnL >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                {totalPnL >= 0 ? '+' : ''}
                {totalPct.toFixed(2)}%
              </td>
            </tr>
          </tfoot>
        </table>
        </div>
      )}
    </Card>
  );
}
