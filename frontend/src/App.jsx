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

  const [activeTab, setActiveTab] = useState('distribution');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isManageNemotecnicosOpen, setIsManageNemotecnicosOpen] = useState(false);

  const market = useMarketData();
  const { transactions, addTransaction, updateTransaction, removeTransaction } = useTransactions();
  const portfolioSummary = usePortfolio(transactions, market.prices);
  const { nemotecnicos, rows, addNemotecnico, updateNemotecnico, removeNemotecnico } = useNemotecnicos(transactions);

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

  const firstOpenTicker = useMemo(
    () => portfolioSummary.holdingsList.find((h) => !h.closed)?.ticker || null,
    [portfolioSummary.holdingsList]
  );

  useEffect(() => {
    if (firstOpenTicker && !watchTickers.includes(market.selectedTicker)) {
      market.setSelectedTicker(firstOpenTicker);
    }
  }, [firstOpenTicker, watchTickers, market.selectedTicker, market.setSelectedTicker]);

  const lastSyncedPortfolioRef = useRef('');
  useEffect(() => {
    const key = watchTickers.join(',');
    if (!key || lastSyncedPortfolioRef.current === key) return;
    lastSyncedPortfolioRef.current = key;
    market.syncQuotes(watchTickers);
  }, [watchTickers, market.syncQuotes]);

  const handleAddTransaction = async (form) => {
    await addTransaction(form);
    setIsModalOpen(false);
    setEditingTransaction(null);
  };

  const handleEditTransaction = (tx) => {
    setEditingTransaction(tx);
    setIsModalOpen(true);
  };

  const handleUpdateTransaction = async (form) => {
    if (editingTransaction) {
      await updateTransaction(editingTransaction.id, form);
    }
    setIsModalOpen(false);
    setEditingTransaction(null);
  };

  const handleDeleteTransaction = async (id) => {
    await removeTransaction(id);
    setIsModalOpen(false);
    setEditingTransaction(null);
  };

  const handleOpenNew = () => {
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  if (isAuthRequired && isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-xs font-mono text-slate-500">Restaurando sesión...</p>
      </div>
    );
  }

  if (isAuthRequired && !isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-slate-950">
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
            portfolioSummary={portfolioSummary}
            marketPrices={market.prices}
            selectedTicker={market.selectedTicker}
            onSelectTicker={market.setSelectedTicker}
            candles={market.candles}
            lastSyncTime={market.lastSyncTime}
          />
        )}

        {activeTab === 'transactions' && <TransactionsPage transactions={transactions} onEdit={handleEditTransaction} nemotecnicos={nemotecnicos} />}

        {activeTab === 'distribution' && (
          <DistribucionCarteraPage portfolioSummary={portfolioSummary} />
        )}
      </main>

      <NewTransactionModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingTransaction(null); }}
        onSubmit={editingTransaction ? handleUpdateTransaction : handleAddTransaction}
        onDelete={handleDeleteTransaction}
        editing={editingTransaction}
        nemotecnicos={nemotecnicos}
      />

      <ManageNemotecnicosModal
        isOpen={isManageNemotecnicosOpen}
        onClose={() => setIsManageNemotecnicosOpen(false)}
        rows={rows}
        onAdd={addNemotecnico}
        onUpdate={updateNemotecnico}
        onDelete={removeNemotecnico}
      />
    </div>
  );
}
