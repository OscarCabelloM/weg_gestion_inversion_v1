import { Wallet } from 'lucide-react';
import Card from '@/components/ui/Card';
import { formatUSD } from '@/lib/formatters';

/**
 * Tabla detallada de posiciones abiertas del portafolio.
 */
export default function PositionsTable({ holdingsList, onViewChart }) {
  return (
    <Card title="Detalle de Posiciones en Portafolio" icon={Wallet}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider">
            <tr>
              <th className="p-3">Activo</th>
              <th className="p-3">Cantidad</th>
              <th className="p-3">Precio Promedio</th>
              <th className="p-3">Precio Yahoo Live</th>
              <th className="p-3">Valor Total</th>
              <th className="p-3">Ganancia / Pérdida</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {holdingsList.map((row) => (
              <tr key={row.ticker} className="hover:bg-slate-800/40 transition">
                <td className="p-3 font-bold text-white">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                    <div>
                      <div>{row.ticker}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{row.name}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3 text-slate-200">{row.shares}</td>
                <td className="p-3 text-slate-300">{formatUSD(row.avgBuyPrice)}</td>
                <td className="p-3 text-emerald-400 font-semibold">{formatUSD(row.currentPrice)}</td>
                <td className="p-3 text-white font-bold">{formatUSD(row.currentValue)}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      row.pnl >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}
                  >
                    {formatUSD(row.pnl)} ({row.pnlPercent.toFixed(2)}%)
                  </span>
                </td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => onViewChart(row.ticker)}
                    className="text-slate-400 hover:text-emerald-400 text-xs transition"
                  >
                    Ver Velas
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
