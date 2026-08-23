import { useCallback, useEffect, useRef, useState } from 'react';
import { MOCK_MARKET_DATA } from '@/data/mockData';
import { fetchCandles, fetchQuotes } from '@/services/marketService';
import { currentTime } from '@/lib/formatters';

/**
 * Estado global de mercado: cotizaciones, velas OHLCV del ticker
 * seleccionado y sincronización con Yahoo Finance (vía proxy /api/yahoo).
 */
export function useMarketData() {
  const [prices, setPrices] = useState(MOCK_MARKET_DATA);
  const [selectedTicker, setSelectedTicker] = useState('AAPL');
  const [candles, setCandles] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(() => currentTime());
  const [dataSource, setDataSource] = useState('simulado');
  const pricesRef = useRef(prices);

  // El ref se sincroniza tras el commit (el render debe permanecer puro)
  useEffect(() => {
    pricesRef.current = prices;
  }, [prices]);

  // Carga velas al cambiar el ticker seleccionado
  useEffect(() => {
    let cancelled = false;
    setCandles([]);
    fetchCandles(selectedTicker).then((data) => {
      if (!cancelled) setCandles(data);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedTicker]);

  /** Refresca cotizaciones (incluye activos extras del portafolio) y velas del activo actual. */
  const syncQuotes = useCallback(async (extraTickers = []) => {
    setIsSyncing(true);
    try {
      const startedAt = Date.now();
      const extras = Array.isArray(extraTickers) ? extraTickers : [];
      const { quotes, source } = await fetchQuotes(pricesRef.current, extras);

      // Pequeña pausa en modo simulado para feedback visual coherente
      if (source === 'simulado') {
        const elapsed = Date.now() - startedAt;
        if (elapsed < 600) await new Promise((r) => setTimeout(r, 600 - elapsed));
      }

      // Merge: conserva cotizaciones previas y añade los activos nuevos
      setPrices((prev) => ({ ...prev, ...quotes }));
      setDataSource(source);
      setCandles(await fetchCandles(selectedTicker));
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
    dataSource,
    syncQuotes,
  };
}
