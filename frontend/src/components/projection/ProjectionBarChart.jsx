import { formatUSD } from '@/lib/formatters';

/**
 * Gráfico de barras de la proyección mensual (balance total vs aportes)
 * con tooltip al pasar el cursor.
 */
export default function ProjectionBarChart({ series }) {
  const finalMonth = series[series.length - 1];
  const maxVal = finalMonth?.totalBalance || 1;

  return (
    <div className="h-64 flex items-end justify-between gap-1 pt-6 px-2 border-b border-slate-800">
      {series
        .filter((_, idx) => (idx + 1) % 2 === 0)
        .map((d) => {
          const totalHeight = (d.totalBalance / maxVal) * 100;

          return (
            <div key={d.month} className="flex-1 flex flex-col items-center group relative h-full justify-end">
              {/* Tooltip al hover */}
              <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition bg-slate-950 border border-slate-700 text-[10px] p-2 rounded shadow-xl pointer-events-none z-20 whitespace-nowrap">
                <p className="font-bold text-blue-400">
                  Mes {d.month} (Año {d.year})
                </p>
                <p>Balance: {formatUSD(d.totalBalance, 0)}</p>
                <p className="text-slate-400">Invertido: {formatUSD(d.totalInvested, 0)}</p>
              </div>

              <div className="w-full max-w-[12px] relative flex flex-col justify-end h-full">
                <div
                  className="w-full bg-blue-500 rounded-t transition-all group-hover:bg-blue-400"
                  style={{ height: `${totalHeight}%` }}
                />
              </div>
              <span className="text-[9px] text-slate-500 mt-2 font-mono">M{d.month}</span>
            </div>
          );
        })}
    </div>
  );
}
