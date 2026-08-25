/**
 * Cliente del proxy Yahoo Finance (/api/yahoo — Express serverless en Vercel).
 * Si el backend no está disponible (p. ej. desarrollo sin `npm run api`),
 * se degrada automáticamente a datos simulados para no romper la UI.
 */
import { generateCandles, MOCK_MARKET_DATA } from '@/data/mockData';

const API_BASE = '/api/yahoo';
const CANDLE_COUNT = 12;

async function requestCandles(symbol, { interval = '1d', range = '1mo' }) {
  const response = await fetch(
    `${API_BASE}/candles/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`
  );
  if (!response.ok) throw new Error(`API respondió ${response.status}`);
  const json = await response.json();
  if (!json.success || !Array.isArray(json.candles) || json.candles.length < 6) {
    throw new Error(json.error || 'Respuesta vacía o insuficiente');
  }
  return json.candles;
}

/** Obtiene velas OHLCV de un ticker. Reintenta con sufijo .SN (Bolsa de Santiago). */
export async function fetchCandles(ticker, options = {}) {
  const base = String(ticker ?? '').trim().toUpperCase();
  try {
    return await requestCandles(base, options);
  } catch {
    try {
      return await requestCandles(`${base}.SN`, options);
    } catch {
      return generateCandles(base, CANDLE_COUNT);
    }
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
 * Actualiza cotizaciones de todos los tickers conocidos más los extras.
 * Si Yahoo falla, degrada a datos simulados automáticamente.
 */
export async function fetchQuotes(prices, extraTickers = []) {
  const extras = Array.isArray(extraTickers)
    ? extraTickers.flatMap((t) => {
        const ticker = String(t).trim().toUpperCase();
        return ticker ? [ticker] : [];
      })
    : [];

  const tickers = [...new Set([...extras, ...Object.keys(prices)])];
  try {
    const response = await fetch(`${API_BASE}/quotes?tickers=${encodeURIComponent(tickers.join(','))}`);
    if (!response.ok) throw new Error(`API respondió ${response.status}`);
    const json = await response.json();
    if (!json.success || !json.quotes) throw new Error(json.error || 'Sin cotizaciones');

    // Autocuración: un activo del portafolio sin cotización se reintenta con sufijo ".SN"
    const sinCotizar = extras.filter((t) => !json.quotes[t]);
    if (sinCotizar.length > 0) {
      const retry = await fetch(`${API_BASE}/quotes?tickers=${encodeURIComponent(sinCotizar.map((t) => `${t}.SN`).join(','))}`);
      if (retry.ok) {
        const retryJson = await retry.json();
        if (retryJson.success && retryJson.quotes) {
          sinCotizar.forEach((t) => {
            if (retryJson.quotes[`${t}.SN`]) json.quotes[t] = retryJson.quotes[`${t}.SN`];
          });
        }
      }
    }

    return { quotes: json.quotes, source: 'yahoo' };
  } catch {
    const base = {};
    tickers.forEach((t) => {
      base[t] = MOCK_MARKET_DATA[t] || { name: t, currentPrice: 100, changeDay: 0, changePercent: 0, currency: 'CLP' };
    });
    return { quotes: simulateQuotes(base), source: 'simulado' };
  }
}
