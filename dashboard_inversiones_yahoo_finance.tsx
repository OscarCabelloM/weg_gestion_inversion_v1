import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Calendar,
  LineChart,
  Plus,
  RefreshCw,
  PieChart,
  Database,
  Server,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Download,
  Sliders,
  CheckCircle,
  BarChart3,
  Activity,
  Layers,
  Sparkles,
  ChevronRight,
  Code
} from 'lucide-react';


// Simulación de respuesta de la API de Yahoo Finance para Velas (OHLCV)
const INITIAL_MARKET_DATA = {
  AAPL: { name: 'Apple Inc.', currentPrice: 228.40, changeDay: 2.15, changePercent: 0.95, currency: 'USD' },
  NVDA: { name: 'NVIDIA Corporation', currentPrice: 128.50, changeDay: -3.20, changePercent: -2.43, currency: 'USD' },
  MSFT: { name: 'Microsoft Corp.', currentPrice: 448.90, changeDay: 4.80, changePercent: 1.08, currency: 'USD' },
  TSLA: { name: 'Tesla, Inc.', currentPrice: 254.20, changeDay: 12.40, changePercent: 5.13, currency: 'USD' },
  'BTC-USD': { name: 'Bitcoin / USD', currentPrice: 64200.00, changeDay: -850.00, changePercent: -1.31, currency: 'USD' },
  SPY: { name: 'SPDR S&P 500 ETF', currentPrice: 552.10, changeDay: 1.80, changePercent: 0.33, currency: 'USD' }
};

// Generador de Velas Japonesas ficticias de Yahoo Finance
const generateCandles = (ticker, count = 30) => {
  const basePrice = INITIAL_MARKET_DATA[ticker]?.currentPrice || 100;
  const candles = [];
  let currentOpen = basePrice * 0.92;
  const now = new Date();

  for (let i = count; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const variation = (Math.random() - 0.48) * (basePrice * 0.035);
    const close = Math.max(1, currentOpen + variation);
    const high = Math.max(currentOpen, close) + Math.random() * (basePrice * 0.015);
    const low = Math.min(currentOpen, close) - Math.random() * (basePrice * 0.015);
    const volume = Math.floor(Math.random() * 5000000) + 1000000;

    candles.push({
      date: dateStr,
      open: parseFloat(currentOpen.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume
    });

    currentOpen = close;
  }
  return candles;
};

// Transacciones iniciales de ejemplo
const INITIAL_TRANSACTIONS = [
  { id: 'tx-1', ticker: 'AAPL', type: 'COMPRA', shares: 15, price: 185.20, date: '2024-01-15', notes: 'Compra estrategia DCA' },
  { id: 'tx-2', ticker: 'NVDA', type: 'COMPRA', shares: 20, price: 92.40, date: '2024-02-10', notes: 'Incentivo IA GPU' },
  { id: 'tx-3', ticker: 'MSFT', type: 'COMPRA', shares: 8, price: 405.00, date: '2024-03-01', notes: 'Suscripción Cloud' },
  { id: 'tx-4', ticker: 'TSLA', type: 'COMPRA', shares: 10, price: 210.00, date: '2024-04-12', notes: 'Rebote de soporte' },
  { id: 'tx-5', ticker: 'BTC-USD', type: 'COMPRA', shares: 0.15, price: 58000.00, date: '2024-05-20', notes: 'Reserva de valor' },
  { id: 'tx-6', ticker: 'AAPL', type: 'VENTA', shares: 5, price: 220.00, date: '2024-06-18', notes: 'Toma parcial de beneficios' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('portfolio'); // 'portfolio', 'transactions', 'performance', 'projection', 'skills'
  const [marketPrices, setMarketPrices] = useState(INITIAL_MARKET_DATA);
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [selectedTicker, setSelectedTicker] = useState('AAPL');
  const [candlestickData, setCandlestickData] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(new Date().toLocaleTimeString());
  
  // Filtros de transacciones
  const [searchFilter, setSearchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('TODOS');

  // Estado del Modal Nueva Operación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTx, setNewTx] = useState({
    ticker: 'AAPL',
    type: 'COMPRA',
    shares: '',
    price: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Estado de Proyección a 3 años
  const [projectionParams, setProjectionParams] = useState({
    initialCapital: 10000,
    monthlyContribution: 500,
    annualReturnRate: 12, // 12% promedio
    inflationRate: 3.5
  });

  useEffect(() => {
    const candles = generateCandles(selectedTicker, 35);
    setCandlestickData(candles);
  }, [selectedTicker]);

  // Simular consulta de Yahoo Finance API
  const handleSyncYahoo = () => {
    setIsSyncing(true);
    setTimeout(() => {
      const updated = { ...marketPrices };
      Object.keys(updated).forEach(t => {
        const deltaPercent = (Math.random() - 0.49) * 0.03; // +/- 3%
        const newPrice = updated[t].currentPrice * (1 + deltaPercent);
        const changeDay = newPrice - updated[t].currentPrice;
        updated[t] = {
          ...updated[t],
          currentPrice: parseFloat(newPrice.toFixed(2)),
          changeDay: parseFloat(changeDay.toFixed(2)),
          changePercent: parseFloat((deltaPercent * 100).toFixed(2))
        };
      });
      setMarketPrices(updated);
      setCandlestickData(generateCandles(selectedTicker, 35));
      setIsSyncing(false);
      setLastSyncTime(new Date().toLocaleTimeString());
    }, 900);
  };

  const portfolioSummary = useMemo(() => {
    const holdings = {};

    transactions.forEach(tx => {
      if (!holdings[tx.ticker]) {
        holdings[tx.ticker] = { ticker: tx.ticker, shares: 0, totalInvestedCost: 0 };
      }
      const numShares = parseFloat(tx.shares) || 0;
      const priceVal = parseFloat(tx.price) || 0;

      if (tx.type === 'COMPRA') {
        holdings[tx.ticker].shares += numShares;
        holdings[tx.ticker].totalInvestedCost += numShares * priceVal;
      } else if (tx.type === 'VENTA') {
        holdings[tx.ticker].shares -= numShares;
        // reduce cost proportionally
        if (holdings[tx.ticker].shares <= 0) {
          holdings[tx.ticker].shares = 0;
          holdings[tx.ticker].totalInvestedCost = 0;
        } else {
          holdings[tx.ticker].totalInvestedCost -= numShares * priceVal;
        }
      }
    });

    let totalPortfolioValue = 0;
    let totalCostBasis = 0;
    let totalDayChangeDollar = 0;

    const list = Object.values(holdings)
      .filter(h => h.shares > 0)
      .map(h => {
        const currentPrice = marketPrices[h.ticker]?.currentPrice || h.totalInvestedCost / (h.shares || 1);
        const name = marketPrices[h.ticker]?.name || h.ticker;
        const currentValue = h.shares * currentPrice;
        const avgBuyPrice = h.shares > 0 ? h.totalInvestedCost / h.shares : 0;
        const pnl = currentValue - h.totalInvestedCost;
        const pnlPercent = h.totalInvestedCost > 0 ? (pnl / h.totalInvestedCost) * 100 : 0;
        
        const dayChangeSingle = marketPrices[h.ticker]?.changeDay || 0;
        const totalAssetDayChange = h.shares * dayChangeSingle;

        totalPortfolioValue += currentValue;
        totalCostBasis += h.totalInvestedCost;
        totalDayChangeDollar += totalAssetDayChange;

        return {
          ...h,
          name,
          currentPrice,
          avgBuyPrice,
          currentValue,
          pnl,
          pnlPercent,
          totalAssetDayChange
        };
      });

    const overallPnL = totalPortfolioValue - totalCostBasis;
    const overallPnLPercent = totalCostBasis > 0 ? (overallPnL / totalCostBasis) * 100 : 0;

    return {
      holdingsList: list,
      totalPortfolioValue,
      totalCostBasis,
      overallPnL,
      overallPnLPercent,
      totalDayChangeDollar,
      assetCount: list.length
    };
  }, [transactions, marketPrices]);

  const handleAddTransaction = (e) => {
    e.preventDefault();
    if (!newTx.shares || !newTx.price) return;

    const created = {
      id: `tx-${Date.now()}`,
      ticker: newTx.ticker.toUpperCase(),
      type: newTx.type,
      shares: parseFloat(newTx.shares),
      price: parseFloat(newTx.price),
      date: newTx.date,
      notes: newTx.notes || '-'
    };

    setTransactions([created, ...transactions]);
    setIsModalOpen(false);
    setNewTx({
      ticker: 'AAPL',
      type: 'COMPRA',
      shares: '',
      price: '',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  const handleDeleteTransaction = (id) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesSearch = tx.ticker.toLowerCase().includes(searchFilter.toLowerCase()) ||
                            tx.notes.toLowerCase().includes(searchFilter.toLowerCase());
      const matchesType = typeFilter === 'TODOS' || tx.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [transactions, searchFilter, typeFilter]);

  const projectionData = useMemo(() => {
    const months = 36; // 3 años
    const monthlyRate = Math.pow(1 + projectionParams.annualReturnRate / 100, 1 / 12) - 1;
    let balance = projectionParams.initialCapital;
    let totalInvested = projectionParams.initialCapital;

    const list = [];
    for (let m = 1; m <= months; m++) {
      balance = balance * (1 + monthlyRate) + projectionParams.monthlyContribution;
      totalInvested += projectionParams.monthlyContribution;
      const profit = balance - totalInvested;

      list.push({
        month: m,
        year: Math.ceil(m / 12),
        monthInYear: ((m - 1) % 12) + 1,
        totalInvested: Math.round(totalInvested),
        totalBalance: Math.round(balance),
        profit: Math.round(profit)
      });
    }
    return list;
  }, [projectionParams]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      {}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
              <Activity className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">InvestPro Hub</h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Yahoo Finance Live
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Gestor de Portafolio, Velas OHLC & Proyección a 3 Años
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleSyncYahoo}
              disabled={isSyncing}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 transition-all active:scale-95 disabled:opacity-50"
              title="Sincronizar cotizaciones desde Yahoo Finance API"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Sincronizar Yahoo</span>
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Nueva Operación</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-t border-slate-800/80 bg-slate-900/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 overflow-x-auto py-1 scrollbar-none">
            {[
              { id: 'portfolio', label: 'Portafolio & Velas', icon: LineChart },
              { id: 'transactions', label: 'Detalle Diario', icon: Wallet },
              { id: 'performance', label: 'Vista Mensual/Anual', icon: Calendar },
              { id: 'projection', label: 'Proyección 3 Años', icon: TrendingUp },
              { id: 'skills', label: 'Backend Express & Yahoo API', icon: Code }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-md whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">

        {/* ================= TAB 1: PORTAFOLIO Y GRAFICO DE VELAS ================= */}
        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            
            {/* Stat Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition">
                <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
                  <span>Valor Total Portafolio</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-white tracking-tight">
                  ${portfolioSummary.totalPortfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
                  <span>Capital Invertido:</span>
                  <span className="font-semibold text-slate-200">
                    ${portfolioSummary.totalCostBasis.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition">
                <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
                  <span>Ganancia / Pérdida Total</span>
                  <PieChart className="w-4 h-4 text-cyan-400" />
                </div>
                <div className={`text-2xl font-black tracking-tight ${portfolioSummary.overallPnL >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                  {portfolioSummary.overallPnL >= 0 ? '+' : ''}
                  ${portfolioSummary.overallPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className={`text-xs font-semibold mt-2 flex items-center gap-1 ${portfolioSummary.overallPnLPercent >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                  {portfolioSummary.overallPnLPercent >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  <span>{portfolioSummary.overallPnLPercent.toFixed(2)}% Retorno Total</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition">
                <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
                  <span>Variación del Día</span>
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                </div>
                <div className={`text-2xl font-black tracking-tight ${portfolioSummary.totalDayChangeDollar >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                  {portfolioSummary.totalDayChangeDollar >= 0 ? '+' : ''}
                  ${portfolioSummary.totalDayChangeDollar.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                  <span>Última sinc.:</span>
                  <span className="text-slate-300 font-mono">{lastSyncTime}</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition">
                <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
                  <span>Activos Posicionados</span>
                  <Layers className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl font-black text-white tracking-tight">
                  {portfolioSummary.assetCount} Tickers
                </div>
                <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Conexión API Yahoo activa</span>
                </div>
              </div>

            </div>

            {/* Main Interactive Candlestick Chart Section */}
            {}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Candlestick Interactive Board */}
              <div className="lg:col-span-2 rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">{selectedTicker}</h3>
                      <span className="text-xs text-slate-400 font-medium">
                        {marketPrices[selectedTicker]?.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-2xl font-extrabold text-white">
                        ${marketPrices[selectedTicker]?.currentPrice.toFixed(2)}
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        (marketPrices[selectedTicker]?.changePercent || 0) >= 0 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {(marketPrices[selectedTicker]?.changePercent || 0) >= 0 ? '+' : ''}
                        {marketPrices[selectedTicker]?.changePercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* Ticker Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 hidden sm:inline">Seleccionar Activo:</span>
                    <select
                      value={selectedTicker}
                      onChange={(e) => setSelectedTicker(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
                    >
                      {Object.keys(marketPrices).map(ticker => (
                        <option key={ticker} value={ticker}>
                          {ticker} - {marketPrices[ticker].name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* SVG Candlestick Rendering Engine */}
                <CandlestickChart candles={candlestickData} ticker={selectedTicker} />
              </div>

              {/* Asset Allocation Breakdown Side List */}
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                  <PieChart className="w-4 h-4 text-emerald-400" />
                  <span>Distribución de Cartera</span>
                </h3>

                <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1">
                  {portfolioSummary.holdingsList.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-8">
                      No hay posiciones abiertas actualmente. Registra una compra en el menú superior.
                    </p>
                  ) : (
                    portfolioSummary.holdingsList.map(item => {
                      const sharePct = portfolioSummary.totalPortfolioValue > 0 
                        ? (item.currentValue / portfolioSummary.totalPortfolioValue) * 100 
                        : 0;

                      return (
                        <div
                          key={item.ticker}
                          onClick={() => setSelectedTicker(item.ticker)}
                          className={`p-3 rounded-xl border transition cursor-pointer ${
                            selectedTicker === item.ticker
                              ? 'bg-slate-800 border-emerald-500/50'
                              : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              {item.ticker}
                              <span className="text-[10px] text-slate-400 font-normal">({item.shares} acc.)</span>
                            </span>
                            <span className="text-xs font-semibold text-slate-200">
                              ${item.currentValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>

                          {/* Allocation Bar */}
                          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden my-2">
                            <div
                              className="bg-emerald-500 h-1.5 rounded-full"
                              style={{ width: `${Math.min(100, sharePct)}%` }}
                            ></div>
                          </div>

                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">P&L: 
                              <span className={`ml-1 font-semibold ${item.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {item.pnl >= 0 ? '+' : ''}${item.pnl.toFixed(2)} ({item.pnlPercent.toFixed(1)}%)
                              </span>
                            </span>
                            <span className="text-slate-400">{sharePct.toFixed(1)}% del total</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

            {/* Detailed Portfolio Positions Table */}
            {}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span>Detalle de Posiciones en Portafolio</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Activo</th>
                      <th className="p-3">Cantidad</th>
                      <th className="p-3">Precio Promedio</th>
                      <th className="p-3">Precio Yahoo Live</th>
                      <th className="p-3">Valor Total</th>
                      <th className="p-3">Ganancia / Pérdida</th>
                      <th className="p-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {portfolioSummary.holdingsList.map(row => (
                      <tr key={row.ticker} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 font-bold text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          <div>
                            <div>{row.ticker}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{row.name}</div>
                          </div>
                        </td>
                        <td className="p-3 text-slate-200">{row.shares}</td>
                        <td className="p-3 text-slate-300">${row.avgBuyPrice.toFixed(2)}</td>
                        <td className="p-3 text-emerald-400 font-semibold">${row.currentPrice.toFixed(2)}</td>
                        <td className="p-3 text-white font-bold">${row.currentValue.toFixed(2)}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            row.pnl >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {row.pnl >= 0 ? '+' : ''}${row.pnl.toFixed(2)} ({row.pnlPercent.toFixed(2)}%)
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedTicker(row.ticker);
                              setActiveTab('portfolio');
                            }}
                            className="text-slate-400 hover:text-emerald-400 text-xs transition"
                          >
                            Ver Velas
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ================= TAB 2: DETALLE DIARIO DE COMPRAS Y VENTAS ================= */}
        {}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            
            {/* Header Controls & Filters */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white">Registro Diario de Compras y Ventas</h3>
                  <p className="text-xs text-slate-400">Historial completo de operaciones realizadas en el portafolio</p>
                </div>

                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar Operación</span>
                </button>
              </div>

              {/* Filters Bar */}
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

                <div className="text-xs text-slate-400 flex items-center justify-end font-medium">
                  Mostrando {filteredTransactions.length} de {transactions.length} registros
                </div>
              </div>
            </div>

            {/* Transactions Log Table */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
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
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="p-8 text-center text-slate-500">
                          No se encontraron operaciones registradas.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map(tx => {
                        const totalCost = tx.shares * tx.price;
                        return (
                          <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                            <td className="p-3 text-slate-300 font-mono">{tx.date}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                tx.type === 'COMPRA'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}>
                                {tx.type}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-white">{tx.ticker}</td>
                            <td className="p-3 text-slate-200">{tx.shares}</td>
                            <td className="p-3 text-slate-200">${tx.price.toFixed(2)}</td>
                            <td className="p-3 text-white font-bold">${totalCost.toFixed(2)}</td>
                            <td className="p-3 text-slate-400 max-w-xs truncate">{tx.notes}</td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => handleDeleteTransaction(tx.id)}
                                className="text-slate-500 hover:text-rose-400 p-1 transition"
                                title="Eliminar registro"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ================= TAB 3: VISTA MENSUAL Y ANUAL ================= */}
        {}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Desglose de Rendimiento Mensual y Anual</h3>
                  <p className="text-xs text-slate-400">Histórico estimado de rentabilidad de la cartera (%)</p>
                </div>
                <span className="text-xs bg-slate-800 px-3 py-1 rounded-lg text-slate-300 font-mono">
                  Año 2024 - 2026
                </span>
              </div>

              {/* Heatmap Grid of Months */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
                {[
                  { month: 'Enero', returnPct: 3.2, trades: 4 },
                  { month: 'Febrero', returnPct: 5.1, trades: 2 },
                  { month: 'Marzo', returnPct: -1.4, trades: 3 },
                  { month: 'Abril', returnPct: 2.8, trades: 1 },
                  { month: 'Mayo', returnPct: 4.5, trades: 5 },
                  { month: 'Junio', returnPct: -0.8, trades: 2 },
                  { month: 'Julio', returnPct: 6.2, trades: 4 },
                  { month: 'Agosto', returnPct: 1.9, trades: 3 },
                  { month: 'Septiembre', returnPct: -2.1, trades: 2 },
                  { month: 'Octubre', returnPct: 3.8, trades: 4 },
                  { month: 'Noviembre', returnPct: 4.1, trades: 1 },
                  { month: 'Diciembre', returnPct: 2.5, trades: 3 }
                ].map(m => (
                  <div
                    key={m.month}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-2 hover:border-slate-700 transition"
                  >
                    <div className="text-xs font-semibold text-slate-400">{m.month}</div>
                    <div className={`text-lg font-bold ${m.returnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {m.returnPct >= 0 ? '+' : ''}{m.returnPct}%
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {m.trades} operaciones
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Annual Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="text-xs text-slate-400 font-medium">Rentabilidad Acumulada 2024</div>
                <div className="text-2xl font-black text-emerald-400">+28.4%</div>
                <p className="text-xs text-slate-500">Superando al S&P 500 (+21.2%)</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="text-xs text-slate-400 font-medium">Rentabilidad Acumulada 2025</div>
                <div className="text-2xl font-black text-emerald-400">+19.8%</div>
                <p className="text-xs text-slate-500">Impulsado por Tecnología e IA</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="text-xs text-slate-400 font-medium">Proyección Cierre 2026</div>
                <div className="text-2xl font-black text-cyan-400">+22.5%</div>
                <p className="text-xs text-slate-500">Basado en la tasa de retorno actual</p>
              </div>
            </div>

          </div>
        )}

        {/* ================= TAB 4: PROYECCION A 3 AÑOS ================= */}
        {}
        {activeTab === 'projection' && (
          <div className="space-y-6">
            
            {/* Interactive Simulator Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Parameters Slider Form */}
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-5">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-400" />
                    <span>Parámetros de Interés Compuesto</span>
                  </h3>
                  <p className="text-xs text-slate-400">Simulación del crecimiento del capital a 36 meses</p>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <div className="flex justify-between font-semibold text-slate-300 mb-1">
                      <span>Capital Inicial</span>
                      <span className="text-emerald-400 font-mono">${projectionParams.initialCapital.toLocaleString()}</span>
                    </div>
                    <input
                      type="range"
                      min="1000"
                      max="100000"
                      step="1000"
                      value={projectionParams.initialCapital}
                      onChange={(e) => setProjectionParams({ ...projectionParams, initialCapital: parseFloat(e.target.value) })}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between font-semibold text-slate-300 mb-1">
                      <span>Aporte Mensual</span>
                      <span className="text-emerald-400 font-mono">${projectionParams.monthlyContribution.toLocaleString()} / mes</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="5000"
                      step="100"
                      value={projectionParams.monthlyContribution}
                      onChange={(e) => setProjectionParams({ ...projectionParams, monthlyContribution: parseFloat(e.target.value) })}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between font-semibold text-slate-300 mb-1">
                      <span>Tasa Anual Estimada (%)</span>
                      <span className="text-emerald-400 font-mono">{projectionParams.annualReturnRate}%</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="30"
                      step="0.5"
                      value={projectionParams.annualReturnRate}
                      onChange={(e) => setProjectionParams({ ...projectionParams, annualReturnRate: parseFloat(e.target.value) })}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Final Result Milestone Highlights */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="text-xs text-slate-400 font-medium">Patrimonio Estimado al Mes 36 (3 Años):</div>
                  <div className="text-3xl font-black text-emerald-400">
                    ${projectionData[35]?.totalBalance.toLocaleString()}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-slate-500 block">Aportes Totales:</span>
                      <span className="font-bold text-slate-200">${projectionData[35]?.totalInvested.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Interés Generado:</span>
                      <span className="font-bold text-cyan-400">+${projectionData[35]?.profit.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Graphical Visualizer for Projection */}
              <div className="lg:col-span-2 rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-white mb-1">Evolución de Capital vs Intereses</h3>
                  <p className="text-xs text-slate-400">Proyección gráfica mensual hasta el mes 36</p>
                </div>

                {/* Simulated Chart Bars */}
                <div className="h-64 flex items-end justify-between gap-1 pt-6 px-2 border-b border-slate-800">
                  {projectionData.filter((_, idx) => (idx + 1) % 2 === 0).map((d) => {
                    const maxVal = projectionData[35].totalBalance || 1;
                    const investedHeight = (d.totalInvested / maxVal) * 100;
                    const totalHeight = (d.totalBalance / maxVal) * 100;

                    return (
                      <div key={d.month} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                        
                        {/* Hover Tooltip */}
                        <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition bg-slate-950 border border-slate-700 text-[10px] p-2 rounded shadow-xl pointer-events-none z-20 whitespace-nowrap">
                          <p className="font-bold text-emerald-400">Mes {d.month} (Año {d.year})</p>
                          <p>Balance: ${d.totalBalance.toLocaleString()}</p>
                          <p className="text-slate-400">Invertido: ${d.totalInvested.toLocaleString()}</p>
                        </div>

                        <div className="w-full max-w-[12px] relative flex flex-col justify-end h-full">
                          {/* Total Balance bar */}
                          <div
                            className="w-full bg-emerald-500 rounded-t transition-all group-hover:bg-emerald-400"
                            style={{ height: `${totalHeight}%` }}
                          ></div>
                        </div>
                        <span className="text-[9px] text-slate-500 mt-2 font-mono">M{d.month}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-emerald-500"></span>
                    <span>Valor Total Proyectado</span>
                  </div>
                  <span className="font-mono text-emerald-400 font-bold">Horizonte: 36 Meses</span>
                </div>
              </div>

            </div>

            {/* Projection Milestone Table */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
              <h3 className="text-sm font-bold text-white">Hitos Anuales Destacados</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[12, 24, 36].map(m => {
                  const item = projectionData[m - 1];
                  return (
                    <div key={m} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        Año {m / 12} (Mes {m})
                      </div>
                      <div className="text-2xl font-extrabold text-white">
                        ${item?.totalBalance.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-400 space-y-1">
                        <div className="flex justify-between">
                          <span>Aportes acumulados:</span>
                          <span className="text-slate-200 font-mono">${item?.totalInvested.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Ganancia neta:</span>
                          <span className="text-cyan-400 font-mono">+${item?.profit.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* ================= TAB 5: SKILL & ARCHITECTURE PROMPT ================= */}
        {}
        {activeTab === 'skills' && (
          <div className="space-y-6">
            
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-6">
              
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Code className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Skill & Especificación de Proyecto Backend</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Guía de integración completa para **React 19 + Vite 8 + Express 5 + Supabase + Yahoo Finance API** desplegable en Vercel.
                  </p>
                </div>
              </div>

              {/* Express Serverless Code Snippet */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-emerald-400" />
                    <span>Endpoint Express Serverless Proxy (api/yahoo.js)</span>
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">Node / Express 5</span>
                </div>
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px] overflow-x-auto">
{`// api/yahoo.js - Endpoint Express 5 para evitar bloqueos CORS con Yahoo Finance
import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

app.get('/api/yahoo/candles/:ticker', async (req, res) => {
  const { ticker } = req.params;
  const { interval = '1d', range = '1mo' } = req.query;

  try {
    const url = \`https://query1.finance.yahoo.com/v8/finance/chart/\${ticker}?interval=\${interval}&range=\${range}\`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    const data = await response.json();
    const result = data.chart.result[0];

    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];

    const candles = timestamps.map((ts, idx) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      open: quotes.open[idx],
      high: quotes.high[idx],
      low: quotes.low[idx],
      close: quotes.close[idx],
      volume: quotes.volume[idx]
    }));

    res.json({ success: true, ticker, candles });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default app;`}
                </pre>
              </div>

              {/* Supabase Schema Snippet */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-cyan-400" />
                    <span>Esquema SQL de Base de Datos Supabase (PostgreSQL)</span>
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">PostgreSQL</span>
                </div>
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px] overflow-x-auto">
{`-- Tabla de Transacciones Diario
CREATE TABLE public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ticker VARCHAR(20) NOT NULL,
    type VARCHAR(10) CHECK (type IN ('COMPRA', 'VENTA')) NOT NULL,
    shares NUMERIC(12, 6) NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden gestionar sus propias transacciones"
ON public.transactions FOR ALL
USING (auth.uid() = user_id);`}
                </pre>
              </div>

            </div>

          </div>
        )}

      </main>

      {}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Registrar Nueva Operación</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Tipo de Orden</label>
                  <select
                    value={newTx.type}
                    onChange={(e) => setNewTx({ ...newTx, type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="COMPRA">COMPRA</option>
                    <option value="VENTA">VENTA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Ticker / Activo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: AAPL, BTC-USD"
                    value={newTx.ticker}
                    onChange={(e) => setNewTx({ ...newTx, ticker: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 font-bold uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Cantidad (Acciones)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="10"
                    value={newTx.shares}
                    onChange={(e) => setNewTx({ ...newTx, shares: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Precio por Acción ($)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="185.50"
                    value={newTx.price}
                    onChange={(e) => setNewTx({ ...newTx, price: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Fecha de Operación</label>
                <input
                  type="date"
                  required
                  value={newTx.date}
                  onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Notas / Estrategia</label>
                <input
                  type="text"
                  placeholder="Ej: Rebalanceo trimestral"
                  value={newTx.notes}
                  onChange={(e) => setNewTx({ ...newTx, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 transition"
                >
                  Guardar Registro
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function CandlestickChart({ candles, ticker }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!candles || candles.length === 0) {
    return <div className="h-64 flex items-center justify-center text-xs text-slate-500">Cargando velas...</div>;
  }

  // Encontrar mínimos y máximos para escalar SVG
  const pricesLow = candles.map(c => c.low);
  const pricesHigh = candles.map(c => c.high);
  const minPrice = Math.min(...pricesLow) * 0.99;
  const maxPrice = Math.max(...pricesHigh) * 1.01;
  const priceRange = maxPrice - minPrice || 1;

  const activeCandle = hoverIndex !== null ? candles[hoverIndex] : candles[candles.length - 1];

  return (
    <div className="space-y-3">
      
      {/* OHLC Interactive Header Bar */}
      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
        <span className="text-slate-400 font-bold">{activeCandle?.date}:</span>
        <div className="flex gap-3">
          <span>O: <strong className="text-slate-200">${activeCandle?.open.toFixed(2)}</strong></span>
          <span>H: <strong className="text-emerald-400">${activeCandle?.high.toFixed(2)}</strong></span>
          <span>L: <strong className="text-rose-400">${activeCandle?.low.toFixed(2)}</strong></span>
          <span>C: <strong className="text-white">${activeCandle?.close.toFixed(2)}</strong></span>
        </div>
        <span className="text-slate-400 hidden sm:inline">Vol: {activeCandle?.volume.toLocaleString()}</span>
      </div>

      {/* SVG Canvas for Candlesticks */}
      <div className="relative h-64 w-full bg-slate-950 rounded-xl p-2 border border-slate-800 overflow-hidden">
        <svg
          className="w-full h-full overflow-visible"
          viewBox={`0 0 ${candles.length * 20} 200`}
          preserveAspectRatio="none"
        >
          {/* Horizontal Grid lines */}
          {[0.2, 0.5, 0.8].map(ratio => (
            <line
              key={ratio}
              x1="0"
              y1={200 * ratio}
              x2={candles.length * 20}
              y2={200 * ratio}
              stroke="#1e293b"
              strokeDasharray="2,2"
              strokeWidth="1"
            />
          ))}

          {/* Render Candles */}
          {candles.map((candle, idx) => {
            const isGreen = candle.close >= candle.open;
            const color = isGreen ? '#10b981' : '#ef4444';
            
            const x = idx * 20 + 10;
            
            // Map prices to SVG Y coordinates (0 at top, 200 at bottom)
            const yHigh = 180 - ((candle.high - minPrice) / priceRange) * 160;
            const yLow = 180 - ((candle.low - minPrice) / priceRange) * 160;
            const yOpen = 180 - ((candle.open - minPrice) / priceRange) * 160;
            const yClose = 180 - ((candle.close - minPrice) / priceRange) * 160;
            
            const bodyTop = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(2, Math.abs(yOpen - yClose));

            return (
              <g
                key={candle.date}
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
                className="cursor-pointer group"
              >
                {/* High/Low Wick Line */}
                <line
                  x1={x}
                  y1={yHigh}
                  x2={x}
                  y2={yLow}
                  stroke={color}
                  strokeWidth="1.5"
                />

                {/* Candle Body */}
                <rect
                  x={x - 5}
                  y={bodyTop}
                  width="10"
                  height={bodyHeight}
                  fill={color}
                  rx="1"
                  className="transition-opacity group-hover:opacity-80"
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex justify-between text-[10px] text-slate-500 font-mono px-1">
        <span>{candles[0]?.date}</span>
        <span>Rango: 30 Días (Yahoo Feed)</span>
        <span>{candles[candles.length - 1]?.date}</span>
      </div>

    </div>
  );
}