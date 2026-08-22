import { Sliders } from 'lucide-react';
import Card from '@/components/ui/Card';
import { formatUSD } from '@/lib/formatters';

/**
 * Panel de parámetros del simulador de interés compuesto (sliders)
 * con el resultado proyectado al mes 36.
 */
export default function ProjectionControls({ params, onChange, finalMonth }) {
  const sliders = [
    {
      key: 'initialCapital',
      label: 'Capital Inicial',
      display: formatUSD(params.initialCapital, 0),
      min: 1000,
      max: 100000,
      step: 1000,
    },
    {
      key: 'monthlyContribution',
      label: 'Aporte Mensual',
      display: `${formatUSD(params.monthlyContribution, 0)} / mes`,
      min: 0,
      max: 5000,
      step: 100,
    },
    {
      key: 'annualReturnRate',
      label: 'Tasa Anual Estimada (%)',
      display: `${params.annualReturnRate}%`,
      min: 1,
      max: 30,
      step: 0.5,
    },
  ];

  return (
    <Card title="Parámetros de Interés Compuesto" icon={Sliders}>
      <p className="text-xs text-slate-400 -mt-2">Simulación del crecimiento del capital a 36 meses</p>

      <div className="space-y-4 text-xs">
        {sliders.map((slider) => (
          <div key={slider.key}>
            <div className="flex justify-between font-semibold text-slate-300 mb-1">
              <span>{slider.label}</span>
              <span className="text-emerald-400 font-mono">{slider.display}</span>
            </div>
            <input
              type="range"
              min={slider.min}
              max={slider.max}
              step={slider.step}
              value={params[slider.key]}
              onChange={(e) => onChange({ ...params, [slider.key]: parseFloat(e.target.value) })}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>
        ))}
      </div>

      {/* Resultado final */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
        <div className="text-xs text-slate-400 font-medium">Patrimonio Estimado al Mes 36 (3 Años):</div>
        <div className="text-3xl font-black text-emerald-400">{formatUSD(finalMonth?.totalBalance, 0)}</div>
        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
          <div>
            <span className="text-slate-500 block">Aportes Totales:</span>
            <span className="font-bold text-slate-200">{formatUSD(finalMonth?.totalInvested, 0)}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Interés Generado:</span>
            <span className="font-bold text-cyan-400">+{formatUSD(finalMonth?.profit, 0)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
