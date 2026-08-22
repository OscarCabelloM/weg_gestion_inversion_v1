import Card from '@/components/ui/Card';
import MonthlyPerformanceGrid from '@/components/performance/MonthlyPerformanceGrid';
import { ANNUAL_SUMMARY } from '@/data/mockData';

/**
 * Tab 3 — Rendimiento mensual (heatmap) y resumen anual acumulado.
 */
export default function PerformancePage() {
  return (
    <div className="space-y-6">
      <MonthlyPerformanceGrid />

      {/* Resumen anual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ANNUAL_SUMMARY.map((item) => (
          <Card key={item.label} className="space-y-2">
            <div className="text-xs text-slate-400 font-medium">{item.label}</div>
            <div className={`text-2xl font-black ${item.tone}`}>{item.value}</div>
            <p className="text-xs text-slate-500">{item.note}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
