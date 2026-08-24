import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import NewTransactionModal from '@/components/transactions/NewTransactionModal';
import PortfolioPage from '@/pages/PortfolioPage';
import TransactionsPage from '@/pages/TransactionsPage';
import PerformancePage from '@/pages/PerformancePage';
import LoginPage from '@/pages/LoginPage';
import { useAuth } from '@/context/AuthContext';
import { useMarketData } from '@/hooks/useMarketData';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useTransactions } from '@/hooks/useTransactions';

export default function App() {
  const { user, isAuthenticated, isAuthRequired, isLoading, signOut } = useAuth();

  const [activeTab, setActiveTab] = useState('portfolio');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const market = useMarketData();
  const { transactions, addTransaction, removeTransaction } = useTransactions();
  const portfolioSummary = usePortfolio(transactions, market.prices);

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

  useEffect(() => {
    if (watchTickers.length > 0 && !watchTickers.includes(market.selectedTicker)) {
      market.setSelectedTicker(watchTickers[0]);
    }
  }, [watchTickers, market.selectedTicker, market.setSelectedTicker]);

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
            onNewTransaction={() => setIsModalOpen(true)}
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

        {activeTab === 'transactions' && <TransactionsPage transactions={transactions} onDelete={removeTransaction} />}

        {activeTab === 'performance' && <PerformancePage />}
      </main>

      <NewTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAddTransaction} />
    </div>
  );
}
