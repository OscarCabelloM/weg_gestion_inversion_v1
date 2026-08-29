import { useMemo, useState } from 'react';
import { Plus, Search, Wallet } from 'lucide-react';
import Card from '@/components/ui/Card';
import TransactionsTable from '@/components/transactions/TransactionsTable';

/**
 * Tab 2 — Registro diario de compras, ventas, dividendos y comisiones
 * con filtros de ticker (desde tgi_nemotecnico) y tipo de operación.
 */
export default function TransactionsPage({ transactions, onEdit, nemotecnicos = [] }) {
  const [tickerFilter, setTickerFilter] = useState('TODOS');
  const [typeFilter, setTypeFilter] = useState('TODOS');

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesTicker = tickerFilter === 'TODOS' || tx.nemotecnico === tickerFilter;
      const matchesType = typeFilter === 'TODOS' || tx.tipo === typeFilter;
      return matchesTicker && matchesType;
    });
  }, [transactions, tickerFilter, typeFilter]);

  return (
    <div className="space-y-6">
      {/* Controles y filtros */}
      <Card title="Registro Diario de Compras, Ventas, Dividendos y Comisiones" icon={Wallet}>
        <div className="flex flex-wrap items-center justify-between gap-4 -mt-2">
          <p className="text-xs text-slate-400">Historial completo de operaciones realizadas en el portafolio</p>
          <span className="text-xs text-slate-400 font-medium">
            Mostrando {filteredTransactions.length} de {transactions.length} registros
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div>
            <label htmlFor="tx-ticker-filter" className="sr-only">Filtrar por ticker</label>
            <Search className="w-4 h-4 absolute mt-2.5 ml-3 text-slate-500" />
            <select
              id="tx-ticker-filter"
              value={tickerFilter}
              onChange={(e) => setTickerFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="TODOS">Todos los Tickers</option>
              {nemotecnicos.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="tx-type-filter" className="sr-only">Filtrar por tipo</label>
            <select
              id="tx-type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
            <option value="TODOS">Todas las Operaciones</option>
            <option value="COMPRA">Solo Compras</option>
            <option value="VENTA">Solo Ventas</option>
            <option value="DIVIDENDO">Solo Dividendos</option>
            <option value="COMISION">Solo Comisiones</option>
          </select>
          </div>
        </div>
      </Card>

      {/* Tabla de operaciones */}
      <Card title="Historial de Operaciones" icon={Plus} iconClassName="text-cyan-400">
        <TransactionsTable transactions={filteredTransactions} onEdit={onEdit} />
      </Card>
    </div>
  );
}
