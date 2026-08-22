import { Sliders } from 'lucide-react';
import Card from '@/components/ui/Card';
import ProjectionControls from '@/components/projection/ProjectionControls';
import ProjectionBarChart from '@/components/projection/ProjectionBarChart';
import { formatUSD } from '@/lib/formatters';

/**
 * Tab 4 — Simulador de interés compuesto a 3 años:
 * parámetros ajustables, gráfico de evolución e hitos anuales.
 */
export default function ProjectionPage({ params, onParamsChange, series }) {
  const finalMonth = series[series.length - 1];
  const milestones = [12, 24, 36].map((m) => series[m - 1]).filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Parámetros del simulador */}
        <ProjectionControls params={params} onChange={onParamsChange} finalMonth={finalMonth} />

        {/* Gráfico de proyección */}
        <Card className="lg:col-span-2 flex flex-col justify-between" title="Evolución de Capital vs Intereses" icon={Sliders}>
          <p className="text-xs text-slate-400 -mt-2">Proyección gráfica mensual hasta el mes 36</p>

          <ProjectionBarChart series={series} />

          <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-emerald-500"></span>
              <span>Valor Total Proyectado</span>
            </div>
            <span className="font-mono text-emerald-400 font-bold">Horizonte: 36 Meses</span>
          </div>
        </Card>
      </div>

      {/* Hitos anuales */}
      <Card title="Hitos Anuales Destacados">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {milestones.map((item) => (
            <div key={item.month} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Año {item.year} (Mes {item.month})
              </div>
              <div className="text-2xl font-extrabold text-white">{formatUSD(item.totalBalance, 0)}</div>
              <div className="text-xs text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Aportes acumulados:</span>
                  <span className="text-slate-200 font-mono">{formatUSD(item.totalInvested, 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ganancia neta:</span>
                  <span className="text-cyan-400 font-mono">+{formatUSD(item.profit, 0)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
