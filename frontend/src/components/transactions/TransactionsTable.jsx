import { Pencil } from 'lucide-react';
import { formatUSD } from '@/lib/formatters';

/**
 * Tabla del registro diario de operaciones (compras y ventas).
 */
export default function TransactionsTable({ transactions, onEdit }) {
  const totals = transactions.reduce(
    (acc, tx) => {
      const monto = (parseFloat(tx.cantidad) || 0) * (parseFloat(tx.precio) || 0);
      if (tx.tipo === 'COMPRA') acc.COMPRA += monto;
      else if (tx.tipo === 'VENTA') acc.VENTA += monto;
      else if (tx.tipo === 'DIVIDENDO') acc.DIVIDENDO += monto;
      else if (tx.tipo === 'COMISION') acc.COMISION += monto;
      acc.TOTAL += monto;
      return acc;
    },
    { COMPRA: 0, VENTA: 0, DIVIDENDO: 0, COMISION: 0, TOTAL: 0 }
  );

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
                      onClick={() => onEdit(tx)}
                      className="text-slate-500 hover:text-blue-400 p-1 transition"
                      title="Editar registro"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
        {transactions.length > 0 && (
          <tfoot className="border-t-2 border-slate-800 bg-slate-950/60 font-bold text-[11px]">
            <tr>
              <td colSpan="5" className="p-3 text-slate-400 uppercase tracking-wider">Totales por Tipo</td>
              <td className="p-3 text-blue-400">Compras</td>
              <td className="p-3 text-right tabular-nums text-blue-400">{formatUSD(totals.COMPRA)}</td>
              <td></td>
            </tr>
            <tr>
              <td colSpan="5"></td>
              <td className="p-3 text-rose-400">Ventas</td>
              <td className="p-3 text-right tabular-nums text-rose-400">{formatUSD(totals.VENTA)}</td>
              <td></td>
            </tr>
            <tr>
              <td colSpan="5"></td>
              <td className="p-3 text-purple-400">Dividendos</td>
              <td className="p-3 text-right tabular-nums text-purple-400">{formatUSD(totals.DIVIDENDO)}</td>
              <td></td>
            </tr>
            <tr>
              <td colSpan="5"></td>
              <td className="p-3 text-amber-400">Comisiones</td>
              <td className="p-3 text-right tabular-nums text-amber-400">{formatUSD(totals.COMISION)}</td>
              <td></td>
            </tr>
            <tr className="border-t border-slate-700">
              <td colSpan="5"></td>
              <td className="p-3 text-white">Total General</td>
              <td className="p-3 text-right tabular-nums text-white">{formatUSD(totals.TOTAL)}</td>
              <td></td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
