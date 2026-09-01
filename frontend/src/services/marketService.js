/**
 * Cliente del proxy Yahoo Finance (/api/yahoo — Express serverless en Vercel).
 * Si el backend no está disponible (p. ej. desarrollo sin `npm run api`),
 * se degrada devolviendo estructuras vacías para no romper la UI.
 */

const API_BASE = '/api/yahoo';

// Símbolo del par USD/CLP en Yahoo Finance (divisas usan el sufijo =X).
export const USD_SYMBOL = 'USDCLP=X';

// Alias de símbolos: nombres comunes → formato Yahoo Finance.
// Se mantiene en el cliente para no depender del despliegue del backend.
const TICKER_ALIASES = {
  BITCOIN: 'BTC-USD',
  ETHEREUM: 'ETH-USD',
  SOLANA: 'SOL-USD',
  DOGECOIN: 'DOGE-USD',
  LITECOIN: 'LTC-USD',
  RIPPLE: 'XRP-USD',
  DÓLAR: 'USDCLP=X',
  DOLAR: 'USDCLP=X',
};

function resolveSymbol(ticker) {
  const upper = String(ticker ?? '').trim().toUpperCase();
  return TICKER_ALIASES[upper] ?? upper;
}

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

/**
 * Obtiene el historial diario de USD/CLP entre dos fechas (YYYY-MM-DD).
 * Devuelve un mapa { fecha: cierre } para usar el valor del dólar en la
 * fecha de ingreso de cada operación. Si Yahoo falla, devuelve {}.
 *
 * Se amplía el rango ±2 días respecto a las fechas pedidas para absorber
 * los desfaces de zona horaria entre el cliente y Yahoo (que normaliza en
 * UTC), garantizando que cada fecha de ingreso quede cubierta.
 */
export async function fetchUsdHistory(startISO, endISO) {
  const start = new Date(`${startISO}T00:00:00`);
  const end = new Date(`${endISO}T23:59:59`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return {};

  const period1 = Math.floor(start.getTime() / 1000) - 2 * 86400;
  const period2 = Math.floor(end.getTime() / 1000) + 2 * 86400;

  try {
    const url = `${API_BASE}/candles/${encodeURIComponent(USD_SYMBOL)}?interval=1d&period1=${period1}&period2=${period2}`;
    const response = await fetch(url);
    if (!response.ok) return {};
    const json = await response.json();
    if (!json.success || !Array.isArray(json.candles)) return {};

    const usdHistory = {};
    json.candles.forEach((c) => {
      if (c?.date && typeof c.close === 'number' && c.close != null) {
        usdHistory[c.date] = c.close;
      }
    });
    return usdHistory;
  } catch {
    return {};
  }
}

/** Obtiene velas OHLCV de un ticker. Reintenta con sufijo .SN (Bolsa de Santiago). */
export async function fetchCandles(ticker, options = {}) {
  const base = String(ticker ?? '').trim().toUpperCase();
  const symbol = resolveSymbol(base);
  try {
    return await requestCandles(symbol, options);
  } catch (error) {
    // El reintento ".SN" solo aplica a tickers reales sin alias (acciones chilenas).
    if (symbol !== base) return [];
    try {
      return await requestCandles(`${symbol}.SN`, options);
    } catch {
      return [];
    }
  }
}

/**
 * Actualiza cotizaciones de todos los tickers conocidos más los extras.
 * Si Yahoo falla, devuelve cotizaciones vacías sin romper la UI.
 */
export async function fetchQuotes(prices, extraTickers = []) {
  const extras = Array.isArray(extraTickers)
    ? extraTickers.flatMap((t) => {
        const ticker = String(t).trim().toUpperCase();
        return ticker ? [ticker] : [];
      })
    : [];

  const tickers = [...new Set([...extras, ...Object.keys(prices)])];
  if (tickers.length === 0) return { quotes: {}, source: 'simulado' };

  try {
    // Resuelve aliases (p. ej. BITCOIN → BTC-USD) y envío la lista resuelta.
    const resolvedMap = new Map(tickers.map((t) => [t, resolveSymbol(t)]));
    const resolvedList = [...new Set(resolvedMap.values())];

    const response = await fetch(`${API_BASE}/quotes?tickers=${encodeURIComponent(resolvedList.join(','))}`);
    if (!response.ok) throw new Error(`API respondió ${response.status}`);
    const json = await response.json();
    if (!json.success || !json.quotes) throw new Error(json.error || 'Sin cotizaciones');

    // Re-mapea las claves de la respuesta al ticker original del portafolio.
    // Mapa resuelto → originals, priorizando coincidencia exacta (p. ej. BTC-USD).
    const byResolved = new Map();
    resolvedMap.forEach((resolved, original) => {
      if (!byResolved.has(resolved)) byResolved.set(resolved, []);
      byResolved.get(resolved).push(original);
    });

    const quotes = {};
    Object.entries(json.quotes).forEach(([key, value]) => {
      const originals = byResolved.get(key);
      if (!originals) return;
      const original = originals.find((o) => o === key) ?? originals[0];
      quotes[original] = value;
    });

    // Autocuración: solo para tickers reales sin alias que puedan necesitar ".SN"
    const sinCotizar = extras.filter((t) => !quotes[t] && resolveSymbol(t) === t);
    if (sinCotizar.length > 0) {
      const retry = await fetch(`${API_BASE}/quotes?tickers=${encodeURIComponent(sinCotizar.map((t) => `${t}.SN`).join(','))}`);
      if (retry.ok) {
        const retryJson = await retry.json();
        if (retryJson.success && retryJson.quotes) {
          sinCotizar.forEach((t) => {
            if (retryJson.quotes[`${t}.SN`]) quotes[t] = retryJson.quotes[`${t}.SN`];
          });
        }
      }
    }

    return { quotes, source: 'yahoo' };
  } catch {
    return { quotes: {}, source: 'simulado' };
  }
}
