import { Trash2 } from 'lucide-react';
import { formatUSD } from '@/lib/formatters';

/**
 * Tabla del registro diario de operaciones (compras y ventas).
 */
export default function TransactionsTable({ transactions, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider">
          <tr>
            <th className="p-3">Fecha</th>
            <th className="p-3">Tipo</th>
            <th className="p-3">Ticker</th>
            <th className="p-3">Cantidad / Acciones</th>
            <th className="p-3">Precio Ejecutado</th>
            <th className="p-3">Monto Total</th>
            <th className="p-3">Notas</th>
            <th className="p-3 text-right">Acción</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 font-medium">
          {transactions.length === 0 ? (
            <tr>
              <td colSpan="8" className="p-8 text-center text-slate-500">
                No se encontraron operaciones registradas.
              </td>
            </tr>
          ) : (
            transactions.map((tx) => {
              const totalCost = tx.cantidad * tx.precio;
              return (
                <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3 text-slate-300 font-mono">{tx.fecha_ing}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        tx.tipo === 'COMPRA'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : tx.tipo === 'DIVIDENDO'
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            : tx.tipo === 'COMISION'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}
                    >
                      {tx.tipo}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-white">{tx.nemotecnico}</td>
                  <td className="p-3 text-slate-200">{Number(tx.cantidad).toLocaleString('es-CL')}</td>
                  <td className="p-3 text-slate-200">{formatUSD(tx.precio)}</td>
                  <td className="p-3 text-white font-bold">{formatUSD(totalCost)}</td>
                  <td className="p-3 text-slate-400 max-w-xs truncate">{tx.notas}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => onDelete(tx.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition"
                      title="Eliminar registro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
