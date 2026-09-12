import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import NewTransactionModal from '@/components/transactions/NewTransactionModal';
import ManageNemotecnicosModal from '@/components/transactions/ManageNemotecnicosModal';
import PortfolioPage from '@/pages/PortfolioPage';
import TransactionsPage from '@/pages/TransactionsPage';
import DistribucionCarteraPage from '@/pages/DistribucionCarteraPage';
import LoginPage from '@/pages/LoginPage';
import { useAuth } from '@/context/AuthContext';
import { useMarketData } from '@/hooks/useMarketData';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useTransactions } from '@/hooks/useTransactions';
import { useNemotecnicos } from '@/hooks/useNemotecnicos';

export default function App() {
  const { user, isAuthenticated, isAuthRequired, isLoading, signOut } = useAuth();

  if (isAuthRequired && isLoading) {
    return (
      <div className="min-h-dvh bg-slate-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-xs font-mono text-slate-500">Restaurando sesión...</p>
      </div>
    );
  }

  if (isAuthRequired && !isAuthenticated) {
    return <LoginPage />;
  }

  // Remonta todo el contenido autenticado por usuario (key = user.id): evita filtrar
  // datos de una sesión a otra (mismo patrón que los modales con key).
  return <DashboardContent key={user?.id ?? 'local'} user={user} signOut={signOut} />;
}

function DashboardContent({ user, signOut }) {
  const [activeTab, setActiveTab] = useState('distribution');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isManageNemotecnicosOpen, setIsManageNemotecnicosOpen] = useState(false);

  const market = useMarketData();
  const { transactions, addTransaction, updateTransaction, removeTransaction } = useTransactions();
  const portfolioAll = usePortfolio(transactions, market.prices, market.usdHistory, market.usdclpPrice);
  const portfolioNacional = usePortfolio(transactions, market.prices, market.usdHistory, market.usdclpPrice, 'NACIONAL');
  const portfolioInternacional = usePortfolio(transactions, market.prices, market.usdHistory, market.usdclpPrice, 'INTERNACIONAL');
  const portfolioCrypto = usePortfolio(transactions, market.prices, market.usdHistory, market.usdclpPrice, 'CRYPTO');
  const { rows, loaded, loadError, addNemotecnico, updateNemotecnico, removeNemotecnico } = useNemotecnicos(user?.id ?? null);

  const watchTickers = useMemo(
    () =>
      [
        ...new Set(
          transactions.flatMap((t) => {
            const ticker = String(t?.nemotecnico ?? '').trim().toUpperCase();
            return ticker ? [ticker] : [];
          })
        ),
      ],
    [transactions]
  );

  // Primera acción abierta del mercado NACIONAL para la selección por defecto
  // del gráfico de valorización (si no hay nacional, cae a la primera abierta).
  const firstOpenTicker = useMemo(
    () =>
      portfolioNacional.holdingsList.find((h) => !h.closed)?.ticker ||
      portfolioInternacional.holdingsList.find((h) => !h.closed)?.ticker ||
      portfolioAll.holdingsList.find((h) => !h.closed)?.ticker ||
      null,
    [portfolioNacional.holdingsList, portfolioInternacional.holdingsList, portfolioAll.holdingsList]
  );

  // Al montar el dashboard, el gráfico arranca siempre en la primera acción de la
  // lista "Posiciones Activas Nacional" (primera posición abierta de mercado NACIONAL).
  const initializedTickerRef = useRef(false);
  useEffect(() => {
    if (initializedTickerRef.current || !firstOpenTicker) return;
    initializedTickerRef.current = true;
    market.setSelectedTicker(firstOpenTicker);
  }, [firstOpenTicker, market.setSelectedTicker]);

  const lastSyncedPortfolioRef = useRef('');
  useEffect(() => {
    const key = watchTickers.join(',');
    if (!key || lastSyncedPortfolioRef.current === key) return;
    lastSyncedPortfolioRef.current = key;
    market.syncQuotes(watchTickers);
  }, [watchTickers, market.syncQuotes]);

  // Carga el historial diario de USD/CLP del rango cubierto por las operaciones,
  // para convertir el Monto Total con el valor del dólar de la fecha de ingreso.
  useEffect(() => {
    if (transactions.length === 0) return;
    const fechas = transactions
      .flatMap((t) => {
        const f = String(t?.fecha_ing ?? '').trim();
        return /^\d{4}-\d{2}-\d{2}$/.test(f) ? [f] : [];
      })
      .sort();
    if (fechas.length === 0) return;
    market.loadUsdHistory(fechas[0], fechas[fechas.length - 1]);
  }, [transactions, market.loadUsdHistory]);

  const handleAddTransaction = async (form) => {
    await addTransaction(form);
  };

  const handleEditTransaction = (tx) => {
    setEditingTransaction(tx);
    setIsModalOpen(true);
  };

  const handleUpdateTransaction = async (form) => {
    if (editingTransaction) {
      await updateTransaction(editingTransaction.id, form);
    }
  };

  const handleDeleteTransaction = async (id) => {
    await removeTransaction(id);
  };

  const handleOpenNew = () => {
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-slate-950">
          <Header
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onSync={() => market.syncQuotes(watchTickers)}
            isSyncing={market.isSyncing}
            onNewTransaction={handleOpenNew}
            onManageNemotecnicos={() => setIsManageNemotecnicosOpen(true)}
            user={user}
            onSignOut={signOut}
          />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        {activeTab === 'portfolio' && (
          <PortfolioPage
            portfolioSummary={portfolioNacional}
            mercado="NACIONAL"
            onSelectTicker={market.setSelectedTicker}
            lastSyncTime={market.lastSyncTime}
            usdclpPrice={market.usdclpPrice}
            transactions={transactions}
            usdHistory={market.usdHistory}
            prices={market.prices}
          />
        )}

        {activeTab === 'portfolio-internacional' && (
          <PortfolioPage
            portfolioSummary={portfolioInternacional}
            mercado="INTERNACIONAL"
            onSelectTicker={market.setSelectedTicker}
            lastSyncTime={market.lastSyncTime}
            usdclpPrice={market.usdclpPrice}
            transactions={transactions}
            usdHistory={market.usdHistory}
            prices={market.prices}
          />
        )}

        {activeTab === 'portfolio-crypto' && (
          <PortfolioPage
            portfolioSummary={portfolioCrypto}
            mercado="CRYPTO"
            onSelectTicker={market.setSelectedTicker}
            lastSyncTime={market.lastSyncTime}
            usdclpPrice={market.usdclpPrice}
            transactions={transactions}
            usdHistory={market.usdHistory}
            prices={market.prices}
          />
        )}

        {activeTab === 'transactions' && <TransactionsPage transactions={transactions} onEdit={handleEditTransaction} rows={rows} usdHistory={market.usdHistory} />}

        {activeTab === 'distribution' && (
          <DistribucionCarteraPage portfolioSummary={portfolioAll} portfolioNacional={portfolioNacional} portfolioInternacional={portfolioInternacional} portfolioCrypto={portfolioCrypto} />
        )}
      </main>

      <NewTransactionModal
        key={isModalOpen ? 'open' : 'closed'}
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingTransaction(null); }}
        onSubmit={editingTransaction ? handleUpdateTransaction : handleAddTransaction}
        onDelete={handleDeleteTransaction}
        editing={editingTransaction}
        rows={rows}
      />

      <ManageNemotecnicosModal
        key={isManageNemotecnicosOpen ? 'open' : 'closed'}
        isOpen={isManageNemotecnicosOpen}
        onClose={() => setIsManageNemotecnicosOpen(false)}
        rows={rows}
        loaded={loaded}
        loadError={loadError}
        onAdd={addNemotecnico}
        onUpdate={updateNemotecnico}
        onDelete={removeNemotecnico}
      />
    </div>
  );
}
