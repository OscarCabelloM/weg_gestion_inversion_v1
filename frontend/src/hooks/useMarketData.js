import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchQuotes, fetchUsdHistory, USD_SYMBOL } from '@/services/marketService';
import { currentTime } from '@/lib/formatters';

/**
 * Estado global de mercado: cotizaciones, historial de USD/CLP y
 * sincronización con Yahoo Finance (vía proxy /api/yahoo).
 * Se remonta con una `key` por usuario en App para no filtrar datos entre sesiones.
 */
export function useMarketData() {
  const [prices, setPrices] = useState({});
  const [selectedTicker, setSelectedTicker] = useState('AAPL');
  const [usdHistory, setUsdHistory] = useState({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(() => currentTime());
  const [marketSource, setMarketSource] = useState('yahoo');
  const pricesRef = useRef(prices);

  // El ref se sincroniza tras el commit (el render debe permanecer puro)
  useEffect(() => {
    pricesRef.current = prices;
  }, [prices]);

  /** Refresca cotizaciones reales (incluye activos extras del portafolio y el dólar). */
  const syncQuotes = useCallback(async (extraTickers = []) => {
    setIsSyncing(true);
    try {
      const extras = [...new Set([...(Array.isArray(extraTickers) ? extraTickers : []), USD_SYMBOL])];
      const { quotes, source } = await fetchQuotes(pricesRef.current, extras);
      setMarketSource(source ?? 'yahoo');

      // Merge: solo cotizaciones reales; sin dato real se conserva la anterior.
      if (quotes && Object.keys(quotes).length > 0) {
        setPrices((prev) => ({ ...prev, ...quotes }));
      }
      setLastSyncTime(currentTime());
    } finally {
      setIsSyncing(false);
    }
  }, []);

  /** Carga el historial diario de USD/CLP del rango de fechas dado (YYYY-MM-DD). */
  const loadUsdHistory = useCallback(async (startISO, endISO) => {
    if (!startISO || !endISO) return;
    const history = await fetchUsdHistory(startISO, endISO);
    setUsdHistory((prev) => ({ ...prev, ...history }));
  }, []);

  return {
    prices,
    selectedTicker,
    setSelectedTicker,
    usdHistory,
    loadUsdHistory,
    isSyncing,
    lastSyncTime,
    syncQuotes,
    marketSource,
    usdclpPrice: prices[USD_SYMBOL]?.currentPrice ?? null,
  };
}
