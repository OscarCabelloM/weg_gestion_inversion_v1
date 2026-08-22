/**
 * Cliente del proxy Yahoo Finance (/api/yahoo — Express serverless en Vercel).
 * Si el backend no está disponible (p. ej. desarrollo sin `npm run api`),
 * se degrada automáticamente a datos simulados para no romper la UI.
 */
import { generateCandles, MOCK_MARKET_DATA } from '@/data/mockData';

const API_BASE = '/api/yahoo';
const CANDLE_COUNT = 35;

/** Obtiene velas OHLCV de un ticker. Fallback: velas simuladas. */
export async function fetchCandles(ticker, { interval = '1d', range = '1mo' } = {}) {
  try {
    const response = await fetch(
      `${API_BASE}/candles/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}`
    );
    if (!response.ok) throw new Error(`API respondió ${response.status}`);
    const json = await response.json();
    if (!json.success || !Array.isArray(json.candles) || json.candles.length === 0) {
      throw new Error(json.error || 'Respuesta vacía');
    }
    return json.candles;
  } catch {
    return generateCandles(ticker, CANDLE_COUNT);
  }
}

/** Simulación local de cotizaciones (+/- 3%) cuando no hay backend. */
function simulateQuotes(prices) {
  const quotes = {};
  Object.entries(prices).forEach(([ticker, quote]) => {
    const deltaPercent = (Math.random() - 0.49) * 0.03;
    const newPrice = quote.currentPrice * (1 + deltaPercent);
    const changeDay = newPrice - quote.currentPrice;
    quotes[ticker] = {
      ...quote,
      currentPrice: parseFloat(newPrice.toFixed(2)),
      changeDay: parseFloat(changeDay.toFixed(2)),
      changePercent: parseFloat((deltaPercent * 100).toFixed(2)),
    };
  });
  return quotes;
}

/**
 * Actualiza cotizaciones de todos los tickers.
 * @returns {{ quotes: object, source: 'yahoo'|'simulado' }}
 */
export async function fetchQuotes(prices) {
  const tickers = Object.keys(prices);
  try {
    const response = await fetch(`${API_BASE}/quotes?tickers=${tickers.join(',')}`);
    if (!response.ok) throw new Error(`API respondió ${response.status}`);
    const json = await response.json();
    if (!json.success || !json.quotes) throw new Error(json.error || 'Sin cotizaciones');
    return { quotes: json.quotes, source: 'yahoo' };
  } catch {
    return { quotes: simulateQuotes(MOCK_MARKET_DATA), source: 'simulado' };
  }
}
