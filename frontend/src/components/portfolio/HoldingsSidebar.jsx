import { PieChart } from 'lucide-react';
import Card from '@/components/ui/Card';
import { formatUSD } from '@/lib/formatters';

/**
 * Panel lateral con la distribución porcentual de cada posición
 * dentro del valor total del portafolio.
 */
export default function HoldingsSidebar({ holdingsList, totalValue, selectedTicker, onSelectTicker }) {
  return (
    <Card title="Distribución de Cartera" icon={PieChart}>
      <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1">
        {holdingsList.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">
            No hay posiciones abiertas actualmente. Registra una compra en el menú superior.
          </p>
        ) : (
          holdingsList.map((item) => {
            const sharePct = totalValue > 0 ? (item.currentValue / totalValue) * 100 : 0;

            return (
              <button
                type="button"
                key={item.ticker}
                onClick={() => onSelectTicker(item.ticker)}
                className={`w-full text-left p-3 rounded-xl border transition cursor-pointer ${
                  selectedTicker === item.ticker
                    ? 'bg-slate-800 border-emerald-500/50'
                    : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    {item.ticker}
                    <span className="text-[10px] text-slate-400 font-normal">({item.shares} acc.)</span>
                  </span>
                  <span className="text-xs font-semibold text-slate-200">{formatUSD(item.currentValue)}</span>
                </div>

                {/* Barra de asignación */}
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden my-2">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, sharePct)}%` }} />
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">
                    P&L:
                    <span className={`ml-1 font-semibold ${item.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatUSD(item.pnl)} ({item.pnlPercent.toFixed(1)}%)
                    </span>
                  </span>
                  <span className="text-slate-400">{sharePct.toFixed(1)}% del total</span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </Card>
  );
}
