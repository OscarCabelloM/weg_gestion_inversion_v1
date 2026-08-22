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
  const [lastSyncTime, setLastSyncTime] = useState(currentTime());
  const [dataSource, setDataSource] = useState('simulado');

  const pricesRef = useRef(prices);
  pricesRef.current = prices;

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

  /** Refresca cotizaciones y velas del activo actual. */
  const syncQuotes = useCallback(async () => {
    setIsSyncing(true);
    try {
      const startedAt = Date.now();
      const { quotes, source } = await fetchQuotes(pricesRef.current);

      // Pequeña pausa en modo simulado para feedback visual coherente
      if (source === 'simulado') {
        const elapsed = Date.now() - startedAt;
        if (elapsed < 600) await new Promise((r) => setTimeout(r, 600 - elapsed));
      }

      setPrices(quotes);
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
