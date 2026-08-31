import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchCandles, fetchQuotes } from '@/services/marketService';
import { currentTime } from '@/lib/formatters';

/**
 * Estado global de mercado: cotizaciones, velas OHLCV del ticker
 * seleccionado y sincronización con Yahoo Finance (vía proxy /api/yahoo).
 * Se remonta con una `key` por usuario en App para no filtrar datos entre sesiones.
 */
export function useMarketData() {
  const [prices, setPrices] = useState({});
  const [selectedTicker, setSelectedTicker] = useState('AAPL');
  const [candles, setCandles] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(() => currentTime());
  const pricesRef = useRef(prices);

  // El ref se sincroniza tras el commit (el render debe permanecer puro)
  useEffect(() => {
    pricesRef.current = prices;
  }, [prices]);

  // Carga velas mensuales (12 meses) al cambiar el ticker seleccionado
  useEffect(() => {
    let cancelled = false;
    setCandles([]);
    fetchCandles(selectedTicker, { interval: '1mo', range: '12mo' }).then((data) => {
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
      const extras = [...new Set([...(Array.isArray(extraTickers) ? extraTickers : []), 'USDCLP'])];
      const { quotes, source } = await fetchQuotes(pricesRef.current, extras);

      // Pequeña pausa cuando Yahoo no responde para feedback visual coherente
      if (source === 'simulado') {
        const elapsed = Date.now() - startedAt;
        if (elapsed < 600) await new Promise((r) => setTimeout(r, 600 - elapsed));
      }

      // Merge: conserva cotizaciones previas y añade los activos nuevos
      setPrices((prev) => ({ ...prev, ...quotes }));
      setCandles(await fetchCandles(selectedTicker, { interval: '1mo', range: '12mo' }));
      setLastSyncTime(currentTime());
    } finally {
      setIsSyncing(false);
    }
  }, [selectedTicker]);

  return {
    prices,
    selectedTicker,
    setSelectedTicker,
    candles,
    isSyncing,
    lastSyncTime,
    syncQuotes,
    usdclpPrice: prices['USDCLP']?.currentPrice ?? null,
  };
}
