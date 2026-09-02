import { useMemo, useState } from 'react';
import { Plus, Search, Wallet } from 'lucide-react';
import Card from '@/components/ui/Card';
import TransactionsTable from '@/components/transactions/TransactionsTable';
import { formatUSD } from '@/lib/formatters';

const MERCADO_OPTIONS = ['NACIONAL', 'INTERNACIONAL', 'CRYPTO'];
const EMPTY_ROWS = [];
const EMPTY_USD_HISTORY = {};

/**
 * Tab 2 — Registro diario de compras, ventas, dividendos y comisiones
 * con filtros de ticker (desde tgi_nemotecnico), mercado y tipo de operación.
 */
export default function TransactionsPage({ transactions, onEdit, rows = EMPTY_ROWS, usdclpPrice = null, usdHistory = EMPTY_USD_HISTORY }) {
  const [tickerFilter, setTickerFilter] = useState('TODOS');
  const [typeFilter, setTypeFilter] = useState('TODOS');
  const [mercadoFilter, setMercadoFilter] = useState('TODOS');

  // Nemotécnicos del catálogo `rows` (tgi_nemotecnico) agrupados por mercado de la
  // misma forma que el selector de "Registrar Nueva Operación": NACIONAL → INTERNACIONAL
  // → CRYPTO → Sin mercado, y alfabético dentro de cada grupo.
  const catalogGroups = useMemo(() => {
    const order = (m) => (m ? MERCADO_OPTIONS.indexOf(m) : MERCADO_OPTIONS.length);
    const nacionalSort = (a, b) => {
      const sfx = (t) => (t.endsWith('.SN') ? 0 : t.endsWith('.AFT') || t.endsWith('.AFP') ? 1 : 2);
      return sfx(a) - sfx(b) || a.localeCompare(b);
    };
    const grupo = {};
    rows.forEach((r) => {
      const ticker = String(r?.nemotecnico ?? '').trim().toUpperCase();
      if (!ticker) return;
      const clave = r?.mercado || 'Sin mercado';
      (grupo[clave] = grupo[clave] || []).push(ticker);
    });
    return Object.entries(grupo)
      .sort(([a], [b]) => order(a) - order(b) || a.localeCompare(b))
      .map(([mercado, options]) => ({
        label: mercado,
        options: options.sort(mercado === 'NACIONAL' ? nacionalSort : (a, b) => a.localeCompare(b)),
      }));
  }, [rows]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesTicker = tickerFilter === 'TODOS' || tx.nemotecnico === tickerFilter;
      const matchesType = typeFilter === 'TODOS' || tx.tipo === typeFilter;
      const matchesMercado = mercadoFilter === 'TODOS' || tx.mercado === mercadoFilter;
      return matchesTicker && matchesType && matchesMercado;
    });
  }, [transactions, tickerFilter, typeFilter, mercadoFilter]);

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
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-base text-slate-200 focus:outline-none focus:border-blue-500"
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
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-base text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="TODOS">{mercadoFilter === 'TODOS' ? 'Todos los Nemotécnicos' : 'Todos del Mercado'}</option>
                {catalogGroups.map((grupo) => (
                  <optgroup key={grupo.label} label={grupo.label}>
                    {grupo.options.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </optgroup>
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
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-base text-slate-200 focus:outline-none focus:border-blue-500"
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
      <Card
        title="Historial de Operaciones"
        icon={Plus}
        iconClassName="text-cyan-400"
        actions={
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold">Valor Dólar:</span>
            {usdclpPrice != null ? (
              <span className="px-2 py-0.5 rounded font-bold text-white bg-slate-800 border border-blue-500/30 text-blue-300">
                {formatUSD(usdclpPrice, 2)}
              </span>
            ) : (
              <span className="text-slate-600">—</span>
            )}
          </div>
        }
      >
        <TransactionsTable transactions={filteredTransactions} onEdit={onEdit} usdHistory={usdHistory} />
      </Card>
    </div>
  );
}
