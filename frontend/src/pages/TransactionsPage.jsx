import { useMemo, useState } from 'react';
import { Plus, Search, Wallet } from 'lucide-react';
import Card from '@/components/ui/Card';
import TransactionsTable from '@/components/transactions/TransactionsTable';

/**
 * Tab 2 — Registro diario de compras y ventas con filtros
 * de búsqueda por texto y tipo de operación.
 */
export default function TransactionsPage({ transactions, onDelete }) {
  const [searchFilter, setSearchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('TODOS');

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch =
        tx.nemotecnico.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (tx.notas || '').toLowerCase().includes(searchFilter.toLowerCase());
      const matchesType = typeFilter === 'TODOS' || tx.tipo === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [transactions, searchFilter, typeFilter]);

  return (
    <div className="space-y-6">
      {/* Controles y filtros */}
      <Card title="Registro Diario de Compras y Ventas" icon={Wallet}>
        <div className="flex flex-wrap items-center justify-between gap-4 -mt-2">
          <p className="text-xs text-slate-400">Historial completo de operaciones realizadas en el portafolio</p>
          <span className="text-xs text-slate-400 font-medium">
            Mostrando {filteredTransactions.length} de {transactions.length} registros
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por ticker o nota..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="TODOS">Todas las Operaciones</option>
            <option value="COMPRA">Solo Compras</option>
            <option value="VENTA">Solo Ventas</option>
          </select>
        </div>
      </Card>

      {/* Tabla de operaciones */}
      <Card title="Historial de Operaciones" icon={Plus} iconClassName="text-cyan-400">
        <TransactionsTable transactions={filteredTransactions} onDelete={onDelete} />
      </Card>
    </div>
  );
}
