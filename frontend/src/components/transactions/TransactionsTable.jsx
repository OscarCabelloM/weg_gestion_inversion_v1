import { Pencil } from 'lucide-react';
import { formatUSD, toCLP } from '@/lib/formatters';

const EMPTY_USD_HISTORY = {};

/**
 * Tabla del registro diario de operaciones (compras y ventas).
 * El Monto Total se convierte a CLP usando el valor del dólar de la fecha de
 * ingreso (usdHistory: { fecha: cierre }) cuando el mercado no es NACIONAL.
 * Si no hay histórico para una fecha, se degrada al valor actual del dólar y,
 * si tampoco hay, se muestra el monto en USD sin conversión.
 */
export default function TransactionsTable({ transactions, onEdit, usdclpPrice = null, usdHistory = EMPTY_USD_HISTORY }) {
  const convert = (usd, date) => toCLP(usd, date, usdHistory, usdclpPrice);
  const totals = transactions.reduce(
    (acc, tx) => {
      const montoBase = (parseFloat(tx.cantidad) || 0) * (parseFloat(tx.precio) || 0);
      const monto = tx.mercado !== 'NACIONAL' ? convert(montoBase, tx.fecha_ing) : montoBase;
      if (tx.tipo === 'COMPRA') {
        acc.COMPRA += monto;
        acc.count.COMPRA += 1;
      } else if (tx.tipo === 'VENTA') {
        acc.VENTA += monto;
        acc.count.VENTA += 1;
      } else if (tx.tipo === 'DIVIDENDO') {
        acc.DIVIDENDO += monto;
        acc.count.DIVIDENDO += 1;
      } else if (tx.tipo === 'COMISION') {
        acc.COMISION += monto;
        acc.count.COMISION += 1;
      }
      acc.TOTAL += monto;
      return acc;
    },
    { COMPRA: 0, VENTA: 0, DIVIDENDO: 0, COMISION: 0, TOTAL: 0, count: { COMPRA: 0, VENTA: 0, DIVIDENDO: 0, COMISION: 0 } }
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider">
          <tr>
            <th className="p-3">Fecha</th>
            <th className="p-3">Tipo</th>
            <th className="p-3">Mercado</th>
            <th className="p-3">Nemotécnico</th>
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
              <td colSpan="9" className="p-8 text-center text-slate-500">
                No se encontraron operaciones registradas.
              </td>
            </tr>
          ) : (
            transactions.map((tx) => {
              const totalCostBase = tx.cantidad * tx.precio;
              const totalCost = tx.mercado !== 'NACIONAL' ? convert(totalCostBase, tx.fecha_ing) : totalCostBase;
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
                  <td className="p-3">
                    {tx.mercado ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-slate-700/60 bg-slate-800/60 text-slate-300 uppercase">
                        {tx.mercado}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="p-3 font-bold text-white">{tx.nemotecnico}</td>
                  <td className="p-3 text-slate-200 tabular-nums">{Number(tx.cantidad).toLocaleString('es-CL')}</td>
                  <td className="p-3 text-slate-200 tabular-nums">{formatUSD(tx.precio, 2)}</td>
                  <td className="p-3 text-white font-bold tabular-nums">{formatUSD(totalCost, 2)}</td>
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
              <td className="p-3 text-blue-400">Compras ({totals.count.COMPRA})</td>
              <td className="p-3 text-right tabular-nums text-blue-400">{formatUSD(totals.COMPRA)}</td>
              <td></td>
            </tr>
            <tr>
              <td colSpan="5"></td>
              <td className="p-3 text-rose-400">Ventas ({totals.count.VENTA})</td>
              <td className="p-3 text-right tabular-nums text-rose-400">{formatUSD(totals.VENTA)}</td>
              <td></td>
            </tr>
            <tr>
              <td colSpan="5"></td>
              <td className="p-3 text-purple-400">Dividendos ({totals.count.DIVIDENDO})</td>
              <td className="p-3 text-right tabular-nums text-purple-400">{formatUSD(totals.DIVIDENDO)}</td>
              <td></td>
            </tr>
            <tr>
              <td colSpan="5"></td>
              <td className="p-3 text-amber-400">Comisiones ({totals.count.COMISION})</td>
              <td className="p-3 text-right tabular-nums text-amber-400">{formatUSD(totals.COMISION)}</td>
              <td></td>
            </tr>
            <tr className="border-t border-slate-700">
              <td colSpan="5"></td>
              <td className="p-3 text-white">Total General ({transactions.length})</td>
              <td className="p-3 text-right tabular-nums text-white">{formatUSD(totals.TOTAL)}</td>
              <td></td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
