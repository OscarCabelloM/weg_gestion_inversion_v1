/**
 * Cliente del proxy Yahoo Finance (/api/yahoo — Express serverless en Vercel).
 * Si el backend no está disponible (p. ej. desarrollo sin `npm run api`, o el
 * proxy 404/faillea en Vercel), se genera una serie sintética determinística
 * por ticker para que la UI nunca quede colgada en "Cargando gráfico...".
 */

const API_BASE = '/api/yahoo';

// Generador pseudoaleatorio determinístico (seed derivada del ticker) para el
// fallback simulado: misma serie por símbolo en cada carga, sin estado global.
function makeRandom(seedStr) {
  let hash = 1779033703;
  for (let i = 0; i < seedStr.length; i += 1) {
    hash = Math.imul(hash ^ seedStr.charCodeAt(i), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  let seed = hash >>> 0;
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RANGE_DAYS = { '5d': 5, '1mo': 22, '3mo': 66, '6mo': 132, '1y': 260 };

function simulateCandleSeries(symbol, days) {
  const rand = makeRandom(`series-${symbol}`);
  let close = 60 + rand() * 350;
  const dates = [];
  const cursor = new Date();
  while (dates.length < days) {
    const dow = cursor.getUTCDay();
    if (dow !== 0 && dow !== 6) dates.push(cursor.toISOString().split('T')[0]);
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  dates.reverse();
  return dates.map((date) => {
    const previous = close;
    close = Math.max(0.5, previous * (1 + (rand() - 0.48) * 0.03));
    const open = previous * (1 + (rand() - 0.5) * 0.02);
    return {
      date,
      open: Math.round(open * 100) / 100,
      high: Math.round(Math.max(open, close) * (1 + rand() * 0.02) * 100) / 100,
      low: Math.round(Math.min(open, close) * (1 - rand() * 0.02) * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume: Math.round(1e6 + rand() * 4e7),
    };
  });
}

function quoteFromSeries(symbol, series) {
  const last = series[series.length - 1];
  const previous = series[series.length - 2] ?? last;
  const change = last.close - previous.close;
  return {
    ticker: symbol,
    name: symbol,
    currency: 'USD',
    currentPrice: last.close,
    changeDay: Math.round(change * 100) / 100,
    changePercent: Math.round((change / previous.close) * 1000) / 10,
  };
}

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
  const days = RANGE_DAYS[options?.range] ?? 66;
  try {
    return await requestCandles(symbol, options);
  } catch (error) {
    // El reintento ".SN" solo aplica a tickers reales sin alias (acciones chilenas).
    if (symbol !== base) return simulateCandleSeries(symbol, days);
    try {
      return await requestCandles(`${symbol}.SN`, options);
    } catch {
      return simulateCandleSeries(symbol, days);
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

    if (Object.keys(quotes).length === 0) throw new Error('Sin cotizaciones (todas fallaron)');

    return { quotes, source: 'yahoo' };
  } catch {
    // Fallback simulado: cotizaciones sintéticas con la clave resuelta (p. ej. BTC-USD)
    // para que el re-mapeo a ticker original del portafolio funcione igual que con Yahoo.
    const resolvedMap = new Map(tickers.map((t) => [t, resolveSymbol(t)]));
    const resolvedList = [...new Set(resolvedMap.values())];
    const quotes = {};
    resolvedList.forEach((symbol) => {
      quotes[symbol] = quoteFromSeries(symbol, simulateCandleSeries(symbol, 3));
    });
    return { quotes, source: 'simulado' };
  }
}
