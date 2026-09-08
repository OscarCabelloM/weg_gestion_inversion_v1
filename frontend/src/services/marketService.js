/**
 * Cliente del proxy Yahoo Finance (/api/yahoo — Express serverless en Vercel).
 * Orden de fuentes (reales primero): proxy → Yahoo directo desde el navegador
 * (IP residencial, no bloqueada como las de datacenter) → Binance/mindicador.cl
 * directos → serie sintética determinística solo como último recurso para que
 * la UI nunca quede colgada en "Cargando gráfico...".
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

async function requestCandles(symbol, { interval = '1d', range = '1mo' } = {}) {
  const response = await fetch(
    `${API_BASE}/candles/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`
  );
  if (!response.ok) throw new Error(`API respondió ${response.status}`);
  const json = await response.json();
  if (!json.success || !Array.isArray(json.candles) || json.candles.length < 6) {
    throw new Error(json.error || 'Respuesta vacía o insuficiente');
  }
  return { candles: json.candles, source: json.source ?? 'yahoo' };
}

// Yahoo directo desde el navegador: usa la IP residencial del usuario, que Yahoo
// no bloquea (a diferencia de las IPs de datacenter de Vercel). Sin headers
// personalizados para no disparar preflight CORS.
const YAHOO_DIRECT_HOSTS = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];

async function yahooDirectChart(symbol, params) {
  const query = new URLSearchParams(params).toString();
  let lastError = null;
  for (const host of YAHOO_DIRECT_HOSTS) {
    try {
      const response = await fetch(`https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?${query}`, {
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) {
        lastError = new Error(`Yahoo directo respondió ${response.status}`);
        continue;
      }
      const data = await response.json();
      const result = data?.chart?.result?.[0];
      if (!result) {
        lastError = new Error(`Sin datos directos para "${symbol}"`);
        continue;
      }
      return result;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error('Yahoo directo no respondió');
}

function mapDirectCandles(result) {
  const timestamps = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0] ?? {};
  return timestamps
    .map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      open: quote.open?.[i] ?? null,
      high: quote.high?.[i] ?? null,
      low: quote.low?.[i] ?? null,
      close: quote.close?.[i] ?? null,
      volume: quote.volume?.[i] ?? 0,
    }))
    .filter((c) => c.close !== null);
}

function mapDirectQuote(symbol, result) {
  const meta = result.meta ?? {};
  const price = meta.regularMarketPrice;
  if (!Number.isFinite(price)) throw new Error(`Sin precio directo para "${symbol}"`);
  const previousClose = meta.chartPreviousClose ?? price;
  const changeDay = price - previousClose;
  const round2 = (n) => Math.round(n * 100) / 100;
  return {
    ticker: symbol,
    name: meta.longName || meta.shortName || meta.symbol || symbol,
    currency: meta.currency || 'USD',
    currentPrice: round2(price),
    changeDay: round2(changeDay),
    changePercent: round2((changeDay / previousClose) * 100),
  };
}

async function fetchDirectCandles(symbol, options = {}) {
  const params = { interval: options?.interval ?? '1d' };
  if (Number.isFinite(options?.period1) && Number.isFinite(options?.period2)) {
    params.period1 = String(Math.round(options.period1));
    params.period2 = String(Math.round(options.period2));
  } else {
    params.range = options?.range ?? '1mo';
  }
  // Reintento ".SN" solo para tickers reales sin alias (acciones chilenas).
  const candidates = [symbol];
  if (resolveSymbol(symbol) === String(symbol ?? '').trim().toUpperCase() && !symbol.endsWith('.SN')) {
    candidates.push(`${symbol}.SN`);
  }
  for (const candidate of candidates) {
    try {
      const result = await yahooDirectChart(candidate, params);
      const candles = mapDirectCandles(result);
      if (candles.length >= 6) return candles;
    } catch {
      // Prueba el siguiente candidato.
    }
  }
  throw new Error(`Yahoo directo sin serie para "${symbol}"`);
}

async function fetchDirectQuotes(symbols) {
  const results = await Promise.allSettled(
    symbols.map(async (symbol) => {
      const result = await yahooDirectChart(symbol, { interval: '1d', range: '5d' });
      return mapDirectQuote(symbol, result);
    })
  );
  const quotes = {};
  results.forEach((item, i) => {
    if (item.status === 'fulfilled') quotes[symbols[i]] = item.value;
  });
  return quotes;
}

// Binance directo desde el navegador (CORS abierto): último recurso real para
// crypto si Yahoo directo también falla.
const BINANCE_PAIRS = {
  'BTC-USD': 'BTCUSDT',
  'ETH-USD': 'ETHUSDT',
  'SOL-USD': 'SOLUSDT',
  'DOGE-USD': 'DOGEUSDT',
  'LTC-USD': 'LTCUSDT',
  'XRP-USD': 'XRPUSDT',
};

async function fetchDirectBinanceQuote(symbol) {
  const pair = BINANCE_PAIRS[symbol];
  if (!pair) throw new Error(`Sin par Binance para "${symbol}"`);
  const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${pair}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Binance directo respondió ${response.status}`);
  const data = await response.json();
  const price = Number(data?.lastPrice);
  if (!Number.isFinite(price)) throw new Error(`Binance sin precio para "${symbol}"`);
  const changeDay = Number(data?.priceChange ?? 0);
  const changePercent = Number(data?.priceChangePercent ?? 0);
  const round2 = (n) => Math.round(Number(n) * 100) / 100;
  return {
    ticker: symbol,
    name: symbol,
    currency: 'USD',
    currentPrice: round2(price),
    changeDay: round2(changeDay),
    changePercent: round2(changePercent),
  };
}

// mindicador.cl directo desde el navegador (API pública chilena, CORS abierto):
// último recurso real para USD/CLP si Yahoo directo falla.
async function fetchDirectMindicadorHistory(startISO, endISO) {
  const from = new Date(`${startISO}T00:00:00Z`);
  const to = new Date(`${endISO}T23:59:59Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return {};
  const history = {};
  for (let year = from.getUTCFullYear(); year <= to.getUTCFullYear(); year += 1) {
    try {
      const response = await fetch(`https://mindicador.cl/api/dolar/${year}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) continue;
      const data = await response.json();
      const serie = Array.isArray(data?.serie) ? data.serie : [];
      serie.forEach((entry) => {
        if (!entry?.fecha || !Number.isFinite(entry.valor)) return;
        const date = String(entry.fecha).split('T')[0];
        if (date >= startISO && date <= endISO) history[date] = entry.valor;
      });
    } catch {
      // Año sin respuesta: se continúa con el resto del rango.
    }
  }
  return history;
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
    if (!response.ok) throw new Error(`API respondió ${response.status}`);
    const json = await response.json();
    if (json.success && Array.isArray(json.candles) && json.source !== 'simulado') {
      const usdHistory = {};
      json.candles.forEach((c) => {
        if (c?.date && typeof c.close === 'number' && c.close != null) {
          usdHistory[c.date] = c.close;
        }
      });
      if (Object.keys(usdHistory).length >= 1) return usdHistory;
    }
    throw new Error('Proxy sin historial real de USD');
  } catch {
    // Yahoo directo (IP residencial) y luego mindicador.cl directo, ambos reales.
    try {
      const result = await yahooDirectChart(USD_SYMBOL, { interval: '1d', period1, period2 });
      const history = {};
      mapDirectCandles(result).forEach((c) => {
        if (c?.date && typeof c.close === 'number') history[c.date] = c.close;
      });
      if (Object.keys(history).length >= 1) return history;
    } catch {
      // Cae a mindicador.cl directo.
    }
    try {
      const history = await fetchDirectMindicadorHistory(startISO, endISO);
      if (Object.keys(history).length >= 1) return history;
    } catch {
      // Sin fuente real disponible.
    }
    return {};
  }
}

/**
 * Obtiene velas OHLCV de un ticker. Orden de fuentes (todas reales antes de
 * simular): proxy → Yahoo directo (navegador) → serie sintética determinística.
 */
export async function fetchCandles(ticker, options = {}) {
  const base = String(ticker ?? '').trim().toUpperCase();
  const symbol = resolveSymbol(base);
  const days = RANGE_DAYS[options?.range] ?? 66;
  try {
    const { candles, source } = await requestCandles(symbol, options);
    if (source !== 'simulado') return candles;
    throw new Error('Proxy devolvió serie simulada');
  } catch {
    // El reintento ".SN" solo aplica a tickers reales sin alias (acciones chilenas).
    if (symbol !== base) {
      try {
        return await fetchDirectCandles(symbol, options);
      } catch {
        return simulateCandleSeries(symbol, days);
      }
    }
    try {
      const { candles, source } = await requestCandles(`${symbol}.SN`, options);
      if (source !== 'simulado') return candles;
      throw new Error('Proxy devolvió serie simulada (.SN)');
    } catch {
      try {
        return await fetchDirectCandles(symbol, options);
      } catch {
        return simulateCandleSeries(symbol, days);
      }
    }
  }
}

/**
 * Actualiza cotizaciones de todos los tickers conocidos más los extras.
 * Orden de fuentes (todas reales antes de simular): proxy (+autocuración .SN)
 * → Yahoo directo desde el navegador → Binance/mindicador directos → simulado.
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

  // Resuelve aliases (p. ej. BITCOIN → BTC-USD) y envío la lista resuelta.
  const resolvedMap = new Map(tickers.map((t) => [t, resolveSymbol(t)]));
  const resolvedList = [...new Set(resolvedMap.values())];

  // Re-mapea claves resueltas (p. ej. BTC-USD) al ticker original del portafolio.
  const remapQuotes = (rawQuotes) => {
    const byResolved = new Map();
    resolvedMap.forEach((resolved, original) => {
      if (!byResolved.has(resolved)) byResolved.set(resolved, []);
      byResolved.get(resolved).push(original);
    });
    const quotes = {};
    Object.entries(rawQuotes ?? {}).forEach(([key, value]) => {
      const originals = byResolved.get(key);
      if (!originals) return;
      const original = originals.find((o) => o === key) ?? originals[0];
      quotes[original] = value;
    });
    return quotes;
  };

  const buildSimulated = () => {
    const quotes = {};
    const byResolved = new Map();
    resolvedMap.forEach((resolved, original) => {
      if (!byResolved.has(resolved)) byResolved.set(resolved, []);
      byResolved.get(resolved).push(original);
    });
    resolvedList.forEach((symbol) => {
      const simulated = quoteFromSeries(symbol, simulateCandleSeries(symbol, 3));
      (byResolved.get(symbol) ?? [symbol]).forEach((original) => {
        quotes[original] = simulated;
      });
    });
    return quotes;
  };

  let proxyQuotes = {};
  let proxyReal = false;
  try {
    const response = await fetch(`${API_BASE}/quotes?tickers=${encodeURIComponent(resolvedList.join(','))}`);
    if (!response.ok) throw new Error(`API respondió ${response.status}`);
    const json = await response.json();
    if (!json.success || !json.quotes) throw new Error(json.error || 'Sin cotizaciones');
    if (json.source !== 'simulado') {
      proxyQuotes = remapQuotes(json.quotes);
      proxyReal = Object.keys(proxyQuotes).length > 0;
    } else {
      throw new Error('Proxy devolvió cotizaciones simuladas');
    }

    // Autocuración: solo para tickers reales sin alias que puedan necesitar ".SN"
    const sinCotizar = extras.filter((t) => !proxyQuotes[t] && resolveSymbol(t) === t);
    if (sinCotizar.length > 0) {
      const retry = await fetch(`${API_BASE}/quotes?tickers=${encodeURIComponent(sinCotizar.map((t) => `${t}.SN`).join(','))}`);
      if (retry.ok) {
        const retryJson = await retry.json();
        if (retryJson.success && retryJson.quotes && retryJson.source !== 'simulado') {
          sinCotizar.forEach((t) => {
            if (retryJson.quotes[`${t}.SN`]) proxyQuotes[t] = retryJson.quotes[`${t}.SN`];
          });
        }
      }
    }

    if (Object.keys(proxyQuotes).length === 0) throw new Error('Sin cotizaciones reales del proxy');
  } catch {
    proxyQuotes = {};
    proxyReal = false;
  }

  const faltantes = tickers.filter((t) => !proxyQuotes[t]);
  if (faltantes.length === 0) {
    return { quotes: proxyQuotes, source: proxyReal ? 'yahoo' : 'simulado' };
  }

  // Yahoo directo desde el navegador para los faltantes (IP residencial real).
  const faltantesResueltos = [...new Set(faltantes.map((t) => resolvedMap.get(t)))];
  let directQuotes = {};
  try {
    directQuotes = await fetchDirectQuotes(faltantesResueltos);
  } catch {
    directQuotes = {};
  }
  const directRemapped = remapQuotes(directQuotes);

  // Último recurso real por activo antes de simular: Binance (crypto) y
  // Yahoo directo con ".SN" ya cubierto por fetchDirectCandles; el dólar usa
  // la cotización directa si llegó.
  const aunFaltantes = faltantes.filter((t) => !directRemapped[t]);
  for (const t of aunFaltantes) {
    const resolved = resolvedMap.get(t);
    try {
      if (BINANCE_PAIRS[resolved]) {
        directRemapped[t] = await fetchDirectBinanceQuote(resolved);
      }
    } catch {
      // Se simula abajo solo este ticker.
    }
  }

  const quotes = { ...proxyQuotes, ...directRemapped };
  const todaviaFaltan = tickers.filter((t) => !quotes[t]);
  if (todaviaFaltan.length > 0) {
    const simulated = buildSimulated();
    todaviaFaltan.forEach((t) => {
      if (simulated[t]) quotes[t] = simulated[t];
    });
    // Si algún ticker sigue simulado, se marca para que la UI lo refleje.
    return { quotes, source: Object.keys(directRemapped).length > 0 || proxyReal ? 'mixto' : 'simulado' };
  }

  return { quotes, source: proxyReal || Object.keys(directRemapped).length > 0 ? 'yahoo' : 'simulado' };
}
