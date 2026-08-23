/**
 * Tarjeta de métrica destacada (valor total, P&L, variación diaria, etc.).
 */
export default function StatCard({ label, icon: Icon, iconClassName = 'text-blue-400', value, valueClassName = 'text-white', children }) {
  return (
    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition">
      <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
        <span>{label}</span>
        {Icon && <Icon className={`w-4 h-4 ${iconClassName}`} />}
      </div>
      <div className={`text-2xl font-black tracking-tight ${valueClassName}`}>{value}</div>
      <div className="text-xs text-slate-400 mt-2">{children}</div>
    </div>
  );
}
