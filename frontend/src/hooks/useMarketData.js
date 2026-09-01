import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchCandles, fetchQuotes, fetchUsdHistory, USD_SYMBOL } from '@/services/marketService';
import { currentTime } from '@/lib/formatters';

/**
 * Estado global de mercado: cotizaciones, velas OHLCV del ticker
 * seleccionado, historial de USD/CLP y sincronización con Yahoo Finance
 * (vía proxy /api/yahoo).
 * Se remonta con una `key` por usuario en App para no filtrar datos entre sesiones.
 */
export function useMarketData() {
  const [prices, setPrices] = useState({});
  const [selectedTicker, setSelectedTicker] = useState('AAPL');
  const [candles, setCandles] = useState([]);
  const [usdHistory, setUsdHistory] = useState({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(() => currentTime());
  const pricesRef = useRef(prices);

  // El ref se sincroniza tras el commit (el render debe permanecer puro)
  useEffect(() => {
    pricesRef.current = prices;
  }, [prices]);

  // Carga velas diarias (últimos 3 meses) al cambiar el ticker seleccionado
  useEffect(() => {
    let cancelled = false;
    setCandles([]);
    fetchCandles(selectedTicker, { interval: '1d', range: '3mo' }).then((data) => {
      if (!cancelled) setCandles(data);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedTicker]);

  /** Refresca cotizaciones (incluye activos extras del portafolio y el dólar) y velas del activo actual. */
  const syncQuotes = useCallback(async (extraTickers = []) => {
    setIsSyncing(true);
    try {
      const startedAt = Date.now();
      const extras = [...new Set([...(Array.isArray(extraTickers) ? extraTickers : []), USD_SYMBOL])];
      const { quotes, source } = await fetchQuotes(pricesRef.current, extras);

      // Pequeña pausa cuando Yahoo no responde para feedback visual coherente
      if (source === 'simulado') {
        const elapsed = Date.now() - startedAt;
        if (elapsed < 600) await new Promise((r) => setTimeout(r, 600 - elapsed));
      }

      // Merge: conserva cotizaciones previas y añade los activos nuevos
      setPrices((prev) => ({ ...prev, ...quotes }));
      setCandles(await fetchCandles(selectedTicker, { interval: '1d', range: '3mo' }));
      setLastSyncTime(currentTime());
    } finally {
      setIsSyncing(false);
    }
  }, [selectedTicker]);

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
    candles,
    usdHistory,
    loadUsdHistory,
    isSyncing,
    lastSyncTime,
    syncQuotes,
    usdclpPrice: prices[USD_SYMBOL]?.currentPrice ?? null,
  };
}
