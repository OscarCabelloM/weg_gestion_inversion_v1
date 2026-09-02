import { useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Wallet } from 'lucide-react';
import Card from '@/components/ui/Card';
import { formatUSD } from '@/lib/formatters';

const COLUMNS = {
  ticker: { label: 'Activo', align: 'left', getValue: (r) => r.ticker },
  totalInvestedCost: { label: 'Inversión Inicial', align: 'right', getValue: (r) => r.totalInvestedCost || 0 },
  pnlValue: { label: 'Ganancias Acciones', align: 'right', getValue: (r) => (r.ticker === 'CUENTA2.AFP' ? 0 : (r.currentValue || 0) - (r.totalInvestedCost || 0)) },
  currentValue: { label: 'Valorización Actual', align: 'right', getValue: (r) => r.currentValue || 0 },
  dividends: { label: 'Dividendos', align: 'right', getValue: (r) => r.dividends || 0 },
  commissions: { label: 'Comisiones', align: 'right', getValue: (r) => r.commissions || 0 },
  pnl: { label: 'Total G/P', align: 'right', getValue: (r) => (r.currentValue || 0) - (r.totalInvestedCost || 0) + (r.dividends || 0) - (r.commissions || 0) },
  totalValuePlusDividends: { label: 'Total Valorización Acción', align: 'right', getValue: (r) => (r.currentValue || 0) },
  pnlPercent: { label: 'Rentabilidad %', align: 'right', getValue: (r) => r.pnlPercent || 0 },
};

function SortIcon({ column, sort }) {
  if (sort.key !== column) return <ChevronsUpDown className="w-3 h-3 inline ml-1 opacity-40" />;
  return sort.dir === 'asc'
    ? <ChevronUp className="w-3 h-3 inline ml-1" />
    : <ChevronDown className="w-3 h-3 inline ml-1" />;
}

/**
 * Tabla de posiciones abiertas del portafolio. Siempre visible.
 */
export default function PositionsTable({ holdingsList, onViewChart, title = 'Posiciones Activas', actions, footer }) {
  const [sort, setSort] = useState({ key: 'ticker', dir: 'asc' });

  const handleSort = (key) => {
    setSort((prev) => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedList = useMemo(() => {
    const col = COLUMNS[sort.key];
    if (!col) return holdingsList;
    return holdingsList.toSorted((a, b) => {
      // En la columna Activo (ascendente) se agrupa por bolsa/fondos: primero los
      // que terminan en *.SN, luego *.AFT/*.AFP, y después el resto.
      if (sort.key === 'ticker') {
        const sfx = (t) => {
          const up = String(t).toUpperCase();
          if (up.endsWith('.SN')) return 0;
          if (up.endsWith('.AFT') || up.endsWith('.AFP')) return 1;
          return 2;
        };
        const ta = String(a.ticker);
        const tb = String(b.ticker);
        const bySfx = sfx(ta) - sfx(tb);
        if (bySfx !== 0) return sort.dir === 'asc' ? bySfx : -bySfx;
        return sort.dir === 'asc' ? ta.localeCompare(tb) : tb.localeCompare(ta);
      }
      const va = col.getValue(a);
      const vb = col.getValue(b);
      if (typeof va === 'string') return sort.dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sort.dir === 'asc' ? va - vb : vb - va;
    });
  }, [holdingsList, sort]);

  const totalInicial = holdingsList.reduce((acc, r) => acc + (r.totalInvestedCost || 0), 0);
  const totalActual = holdingsList.reduce((acc, r) => acc + (r.currentValue || 0), 0);
  const totalPnLValue = holdingsList.reduce((acc, r) => acc + ((r.currentValue || 0) - (r.totalInvestedCost || 0)), 0);
  const totalDividendos = holdingsList.reduce((acc, r) => acc + (r.dividends || 0), 0);
  const totalComisiones = holdingsList.reduce((acc, r) => acc + (r.commissions || 0), 0);
  const totalCapitalPnL = holdingsList.reduce((acc, r) => acc + (r.pnl || 0), 0);
  const totalPnL = totalCapitalPnL + totalDividendos - totalComisiones;
  const totalPct = totalInicial > 0 ? (totalPnL / totalInicial) * 100 : 0;

  const thClass = 'p-3 cursor-pointer select-none hover:text-slate-200 transition-colors';

  return (
    <Card title={title} icon={Wallet} actions={actions}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider">
            <tr>
              <th className={`${thClass} text-center`} onClick={() => handleSort('ticker')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('ticker'); } }} role="button" tabIndex={0}>
                Activo<SortIcon column="ticker" sort={sort} />
              </th>
              <th className="p-3 text-center">Cantidad</th>
              <th className="p-3 text-center">Precio Promedio</th>
              <th className={`${thClass} text-center`} onClick={() => handleSort('totalInvestedCost')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('totalInvestedCost'); } }} role="button" tabIndex={0}>
                Inversión Inicial<SortIcon column="totalInvestedCost" sort={sort} />
              </th>
              <th className={`${thClass} text-center`} onClick={() => handleSort('pnlValue')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('pnlValue'); } }} role="button" tabIndex={0}>
                Ganancias Acciones<SortIcon column="pnlValue" sort={sort} />
              </th>
              <th className={`${thClass} text-center`} onClick={() => handleSort('dividends')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('dividends'); } }} role="button" tabIndex={0}>
                Dividendos<SortIcon column="dividends" sort={sort} />
              </th>
              <th className={`${thClass} text-center`} onClick={() => handleSort('commissions')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('commissions'); } }} role="button" tabIndex={0}>
                Comisiones<SortIcon column="commissions" sort={sort} />
              </th>
              <th className={`${thClass} text-center`} onClick={() => handleSort('currentValue')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('currentValue'); } }} role="button" tabIndex={0}>
                Valorización Actual<SortIcon column="currentValue" sort={sort} />
              </th>
              <th className={`${thClass} text-center`} onClick={() => handleSort('pnl')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('pnl'); } }} role="button" tabIndex={0}>
                Total G/P<SortIcon column="pnl" sort={sort} />
              </th>
              <th className={`${thClass} text-center`} onClick={() => handleSort('totalValuePlusDividends')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('totalValuePlusDividends'); } }} role="button" tabIndex={0}>
                Total Valorización Acción<SortIcon column="totalValuePlusDividends" sort={sort} />
              </th>
              <th className={`${thClass} text-center`} onClick={() => handleSort('pnlPercent')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('pnlPercent'); } }} role="button" tabIndex={0}>
                Rentabilidad %<SortIcon column="pnlPercent" sort={sort} />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {sortedList.map((row) => (
              <tr
                key={row.ticker}
                className="transition hover:bg-slate-800/40"
              >
                <td className="p-3">
                  <button
                    onClick={() => onViewChart(row.ticker)}
                    aria-label={`Ver gráfico de ${row.ticker}`}
                    className="flex items-center gap-2 text-left font-bold text-white hover:text-blue-400 transition-colors cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full shrink-0 bg-blue-400"></span>
                    <span>
                      {row.ticker}
                      <span className="block text-[10px] text-slate-400 font-normal">{row.name}</span>
                    </span>
                  </button>
                </td>
                <td className="p-3 text-slate-200 text-right tabular-nums">{Number(row.shares).toLocaleString('es-CL')}</td>
                <td className="p-3 text-slate-300 text-right tabular-nums">{formatUSD(row.avgBuyPrice)}</td>
                <td className="p-3 text-slate-300 text-right tabular-nums">{formatUSD(row.totalInvestedCost)}</td>
                {(() => {
                  const pnlValue = row.ticker === 'CUENTA2.AFP' ? 0 : (row.currentValue || 0) - (row.totalInvestedCost || 0);
                  return (
                    <td className={`p-3 font-bold text-right tabular-nums ${pnlValue >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                      {pnlValue >= 0 ? '+' : ''}{formatUSD(pnlValue)}
                    </td>
                  );
                })()}
                <td className={`p-3 font-semibold text-right tabular-nums ${row.dividends > 0 ? 'text-purple-400' : 'text-slate-500'}`}>
                  {row.dividends > 0 ? formatUSD(row.dividends) : '—'}
                </td>
                <td className={`p-3 font-semibold text-right tabular-nums ${row.commissions > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                  {row.commissions > 0 ? formatUSD(row.commissions) : '—'}
                </td>
                <td className="p-3 text-white font-bold text-right tabular-nums">{formatUSD(row.currentValue)}</td>
                <td className="p-3 text-right">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      row.totalPnL >= 0 ? 'bg-blue-500/10 text-blue-400' : 'bg-rose-500/10 text-rose-400'
                    }`}
                  >
                    {formatUSD(row.totalPnL)}
                  </span>
                </td>
                <td className="p-3 text-white font-bold text-right tabular-nums">{formatUSD(row.currentValue || 0)}</td>
                <td className={`p-3 font-bold text-right tabular-nums ${row.totalPnL >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                  {row.totalPnL >= 0 ? '+' : ''}
                  {row.pnlPercent.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-slate-800 bg-slate-950/60 font-bold">
            <tr>
              <td className="p-3 text-white text-left">Total ({holdingsList.length} activos)</td>
              <td className="p-3 text-right tabular-nums"></td>
              <td className="p-3 text-slate-500 text-right tabular-nums">—</td>
              <td className="p-3 text-slate-300 text-right tabular-nums">{formatUSD(totalInicial)}</td>
              <td className={`p-3 font-bold text-right tabular-nums ${totalPnLValue >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                {totalPnLValue >= 0 ? '+' : ''}{formatUSD(totalPnLValue)}
              </td>
              <td className={`p-3 font-bold text-right tabular-nums ${totalDividendos > 0 ? 'text-purple-400' : 'text-slate-500'}`}>
                {totalDividendos > 0 ? formatUSD(totalDividendos) : '—'}
              </td>
              <td className={`p-3 font-bold text-right tabular-nums ${totalComisiones > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                {totalComisiones > 0 ? formatUSD(totalComisiones) : '—'}
              </td>
              <td className="p-3 text-white font-bold text-right tabular-nums">{formatUSD(totalActual)}</td>
              <td className="p-3 text-right">
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    totalPnL >= 0 ? 'bg-blue-500/10 text-blue-400' : 'bg-rose-500/10 text-rose-400'
                  }`}
                >
                  {formatUSD(totalPnL)}
                </span>
              </td>
              <td className="p-3 text-white font-bold text-right tabular-nums">{formatUSD(totalActual)}</td>
              <td className={`p-3 text-right tabular-nums ${totalPnL >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                {totalPnL >= 0 ? '+' : ''}
                {totalPct.toFixed(2)}%
              </td>
            </tr>
          </tfoot>
        </table>
        </div>
      {footer}
    </Card>
  );
}
