import { Wallet } from 'lucide-react';
import Card from '@/components/ui/Card';
import { formatUSD } from '@/lib/formatters';

/**
 * Tabla detallada de posiciones del portafolio (abiertas y cerradas).
 */
export default function PositionsTable({ holdingsList, onViewChart }) {
  const totalInicial = holdingsList.reduce((acc, r) => acc + (r.totalInvestedCost || r.closedCost || 0), 0);
  const totalActual = holdingsList.reduce((acc, r) => acc + (r.currentValue || 0), 0);
  const totalPnL = holdingsList.reduce((acc, r) => acc + (r.pnl || 0), 0);
  const totalPct = totalInicial > 0 ? (totalPnL / totalInicial) * 100 : 0;

  return (
    <Card title="Detalle de Posiciones en Portafolio" icon={Wallet}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider">
            <tr>
              <th className="p-3">Activo</th>
              <th className="p-3">Cantidad</th>
              <th className="p-3">Precio Promedio</th>
              <th className="p-3">Valorización Inicial</th>
              <th className="p-3">Precio Actual</th>
              <th className="p-3">Valorización Actual</th>
              <th className="p-3">Ganancia / Pérdida</th>
              <th className="p-3">Rentabilidad %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {holdingsList.map((row) => (
              <tr
                key={row.ticker}
                className={`transition ${row.closed ? 'opacity-50' : 'hover:bg-slate-800/40'}`}
              >
                <td className="p-3">
                  <button
                    onClick={() => onViewChart(row.ticker)}
                    aria-label={`Ver gráfico de ${row.ticker}`}
                    className="flex items-center gap-2 text-left font-bold text-white hover:text-blue-400 transition-colors cursor-pointer"
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${row.closed ? 'bg-slate-500' : 'bg-blue-400'}`}></span>
                    <span>
                      {row.ticker}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {row.name}
                        {row.closed && <span className="ml-1 text-rose-400 font-semibold">(Cerrada)</span>}
                      </span>
                    </span>
                  </button>
                </td>
                <td className="p-3 text-slate-200">{row.shares}</td>
                <td className="p-3 text-slate-300">{formatUSD(row.avgBuyPrice)}</td>
                <td className="p-3 text-slate-300">{formatUSD(row.totalInvestedCost || row.closedCost)}</td>
                <td className="p-3 text-blue-400 font-semibold">{formatUSD(row.currentPrice)}</td>
                <td className="p-3 text-white font-bold">{formatUSD(row.currentValue)}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      row.pnl >= 0 ? 'bg-blue-500/10 text-blue-400' : 'bg-rose-500/10 text-rose-400'
                    }`}
                  >
                    {formatUSD(row.pnl)}
                  </span>
                </td>
                <td className={`p-3 font-bold ${row.pnl >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                  {row.pnl >= 0 ? '+' : ''}
                  {row.pnlPercent.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-slate-800 bg-slate-950/60 font-bold">
            <tr>
              <td className="p-3 text-white">Total ({holdingsList.length} activos)</td>
              <td className="p-3"></td>
              <td className="p-3 text-slate-500">—</td>
              <td className="p-3 text-slate-300">{formatUSD(totalInicial)}</td>
              <td className="p-3 text-slate-500">—</td>
              <td className="p-3 text-white font-bold">{formatUSD(totalActual)}</td>
              <td className="p-3">
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    totalPnL >= 0 ? 'bg-blue-500/10 text-blue-400' : 'bg-rose-500/10 text-rose-400'
                  }`}
                >
                  {formatUSD(totalPnL)}
                </span>
              </td>
              <td className={`p-3 ${totalPnL >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                {totalPnL >= 0 ? '+' : ''}
                {totalPct.toFixed(2)}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}
