import { useMemo, useState } from 'react';
import { Plus, Search, Wallet } from 'lucide-react';
import Card from '@/components/ui/Card';
import TransactionsTable from '@/components/transactions/TransactionsTable';

const MERCADO_OPTIONS = ['NACIONAL', 'INTERNACIONAL', 'CRYPTO'];
const EMPTY_NEMOTECNICOS = [];
const EMPTY_ROWS = [];

/**
 * Tab 2 — Registro diario de compras, ventas, dividendos y comisiones
 * con filtros de ticker (desde tgi_nemotecnico), mercado y tipo de operación.
 */
export default function TransactionsPage({ transactions, onEdit, nemotecnicos = EMPTY_NEMOTECNICOS, rows = EMPTY_ROWS }) {
  const [tickerFilter, setTickerFilter] = useState('TODOS');
  const [typeFilter, setTypeFilter] = useState('TODOS');
  const [mercadoFilter, setMercadoFilter] = useState('TODOS');

  // Mapa ticker → mercado: SOLO desde el catálogo `rows` (tgi_nemotecnico en Supabase).
  const mercadoPorTicker = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      if (r?.nemotecnico) map[r.nemotecnico.toUpperCase()] = r.mercado || '';
    });
    return map;
  }, [rows]);

  // Nemotécnicos del mercado seleccionado; con "Todos los Mercados" se listan todos.
  const filteredNemotecnicos = useMemo(() => {
    if (mercadoFilter === 'TODOS') return nemotecnicos;
    return nemotecnicos.filter((t) => mercadoPorTicker[String(t).toUpperCase()] === mercadoFilter);
  }, [nemotecnicos, mercadoFilter, mercadoPorTicker]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesTicker = tickerFilter === 'TODOS' || tx.nemotecnico === tickerFilter;
      const matchesType = typeFilter === 'TODOS' || tx.tipo === typeFilter;
      const matchesMercado =
        mercadoFilter === 'TODOS' || mercadoPorTicker[String(tx.nemotecnico).toUpperCase()] === mercadoFilter;
      return matchesTicker && matchesType && matchesMercado;
    });
  }, [transactions, tickerFilter, typeFilter, mercadoFilter, mercadoPorTicker]);

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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div>
            <label htmlFor="tx-mercado-filter" className="block text-slate-400 mb-1 font-semibold">
              Mercado
            </label>
            <select
              id="tx-mercado-filter"
              value={mercadoFilter}
              onChange={(e) => {
                const value = e.target.value;
                setMercadoFilter(value);
                if (value !== 'TODOS') setTickerFilter('TODOS');
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="TODOS">Todos los Mercados</option>
              {MERCADO_OPTIONS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="tx-ticker-filter" className="block text-slate-400 mb-1 font-semibold">
              Nemotécnico
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute mt-2.5 ml-3 text-slate-500" />
              <select
                id="tx-ticker-filter"
                value={tickerFilter}
                onChange={(e) => setTickerFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="TODOS">{mercadoFilter === 'TODOS' ? 'Todos los Nemotécnicos' : 'Todos del Mercado'}</option>
                {filteredNemotecnicos.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="tx-type-filter" className="block text-slate-400 mb-1 font-semibold">
              Tipo de Operación
            </label>
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
        <TransactionsTable transactions={filteredTransactions} onEdit={onEdit} mercadoPorTicker={mercadoPorTicker} />
      </Card>
    </div>
  );
}
