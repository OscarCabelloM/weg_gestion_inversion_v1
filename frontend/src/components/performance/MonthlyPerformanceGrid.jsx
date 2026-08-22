import Card from '@/components/ui/Card';
import { MONTHLY_PERFORMANCE } from '@/data/mockData';

/**
 * Cuadrícula tipo heatmap con el rendimiento mensual estimado.
 */
export default function MonthlyPerformanceGrid() {
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white">Desglose de Rendimiento Mensual y Anual</h3>
          <p className="text-xs text-slate-400">Histórico estimado de rentabilidad de la cartera (%)</p>
        </div>
        <span className="text-xs bg-slate-800 px-3 py-1 rounded-lg text-slate-300 font-mono">Año 2024 - 2026</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
        {MONTHLY_PERFORMANCE.map((m) => (
          <div
            key={m.month}
            className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-2 hover:border-slate-700 transition"
          >
            <div className="text-xs font-semibold text-slate-400">{m.month}</div>
            <div className={`text-lg font-bold ${m.returnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {m.returnPct >= 0 ? '+' : ''}
              {m.returnPct}%
            </div>
            <div className="text-[10px] text-slate-500 font-mono">{m.trades} operaciones</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
