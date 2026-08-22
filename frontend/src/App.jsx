import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import NewTransactionModal from '@/components/transactions/NewTransactionModal';
import PortfolioPage from '@/pages/PortfolioPage';
import TransactionsPage from '@/pages/TransactionsPage';
import PerformancePage from '@/pages/PerformancePage';
import ProjectionPage from '@/pages/ProjectionPage';
import SkillsPage from '@/pages/SkillsPage';
import LoginPage from '@/pages/LoginPage';
import { useAuth } from '@/context/AuthContext';
import { useMarketData } from '@/hooks/useMarketData';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useTransactions } from '@/hooks/useTransactions';
import { useProjection } from '@/hooks/useProjection';

export default function App() {
  // Sesión: con Supabase configurado se exige login; sin él, modo local abierto
  const { user, isAuthenticated, isAuthRequired, isLoading, signOut } = useAuth();

  // Navegación y modal global
  const [activeTab, setActiveTab] = useState('portfolio');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estado de negocio (mercado, transacciones, portafolio y proyección)
  const market = useMarketData();
  const { transactions, addTransaction, removeTransaction } = useTransactions();
  const portfolioSummary = usePortfolio(transactions, market.prices);
  const { params, setParams, series } = useProjection();

  const handleAddTransaction = async (form) => {
    await addTransaction(form);
    setIsModalOpen(false);
  };

  // Restaurando sesión desde localStorage: pantalla de carga
  if (isAuthRequired && isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <p className="text-xs font-mono text-slate-500">Restaurando sesión...</p>
      </div>
    );
  }

  // Sin sesión activa (y Supabase configurado): mostrar login
  if (isAuthRequired && !isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSync={market.syncQuotes}
        isSyncing={market.isSyncing}
        dataSource={market.dataSource}
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

        {activeTab === 'projection' && <ProjectionPage params={params} onParamsChange={setParams} series={series} />}

        {activeTab === 'skills' && <SkillsPage />}
      </main>

      <NewTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAddTransaction} />
    </div>
  );
}
