/**
 * frontend/api/yahoo/_lib.js — Lógica pura del proxy Yahoo Finance.
 * Sin dependencias de Express: la importan tanto las funciones serverless
 * de Vercel (frontend/api/yahoo/*.js) como el servidor Express de dev local
 * (backend/api/yahoo.js). Fuente única de verdad para no duplicar código.
 */

const YAHOO_HOSTS = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];

// Headers de navegador completo: Yahoo bloquea 429 a clientes HTTP "de biblioteca"
// (fingerprint TLS o User-Agent). Sumarle la cookie de sesión ()A1/A3) evita los
// 401 de validación de crumb en ciertas rutas.
const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  Accept: 'application/json,text/plain,*/*',
  'Accept-Language': 'es-CL,es;q=0.9,en-US;q=0.8,en;q=0.7',
  'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  Referer: 'https://finance.yahoo.com/',
  Origin: 'https://finance.yahoo.com',
};

let yahooSessionCookie = null;
let sessionCookieExpiresAt = 0;

async function acquireSessionCookie() {
  if (yahooSessionCookie && Date.now() < sessionCookieExpiresAt) return yahooSessionCookie;
  try {
    const res = await fetch('https://fc.yahoo.com', { headers: BROWSER_HEADERS, redirect: 'manual', signal: AbortSignal.timeout(10000) });
    const setCookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
    const raw = res.headers.get('set-cookie');
    const parts = [...setCookies, ...(raw ? [raw] : [])].join(';').split(';');
    const cookies = [...new Set(parts.map((p) => p.trim()).filter((p) => p.startsWith('A1=') || p.startsWith('A3=')))];
    if (cookies.length > 0) {
      yahooSessionCookie = cookies.join('; ');
      sessionCookieExpiresAt = Date.now() + 45 * 60 * 1000;
    }
    return yahooSessionCookie;
  } catch {
    return null;
  }
}

function yahooHeaders() {
  return { ...BROWSER_HEADERS, ...(yahooSessionCookie ? { Cookie: yahooSessionCookie } : {}) };
}

async function yahooJson(path, params) {
  const query = new URLSearchParams(params).toString();
  let lastError = null;
  for (const host of YAHOO_HOSTS) {
    const url = `https://${host}${path}?${query}`;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (attempt === 1) await acquireSessionCookie();
      try {
        const response = await fetch(url, { headers: yahooHeaders(), signal: AbortSignal.timeout(15000) });
        const text = await response.text();
        if (response.ok) {
          let data;
          try {
            data = JSON.parse(text);
          } catch {
            throw new Error(`Yahoo devolvió JSON inválido para ${path}`);
          }
          if (data?.chart?.error) {
            throw new Error(`${data.chart.error.code}: ${data.chart.error.description ?? 'sin descripción'}`.trim());
          }
          return data;
        }
        if (response.status === 401 || response.status === 403 || response.status === 429) {
          lastError = new Error(`Yahoo Finance respondió ${response.status}`);
          await new Promise((r) => setTimeout(r, 500));
          continue;
        }
        throw new Error(`Yahoo Finance respondió ${response.status}`);
      } catch (error) {
        lastError = error;
        if (!(error instanceof Error && /Yahoo Finance respondió (40[13]|429)/.test(error.message))) break;
      }
    }
  }
  throw lastError ?? new Error('Yahoo Finance no respondió');
}

const ALLOWED_INTERVALS = new Set(['1h', '1d', '5d', '1wk', '1mo']);
const ALLOWED_RANGES = new Set(['5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', 'max']);

// Alias de símbolos: nombres comunes → formato Yahoo Finance
export const TICKER_ALIASES = {
  BITCOIN: 'BTC-USD',
  ETHEREUM: 'ETH-USD',
  SOLANA: 'SOL-USD',
  DOGECOIN: 'DOGE-USD',
  LITECOIN: 'LTC-USD',
  RIPPLE: 'XRP-USD',
  DÓLAR: 'USDCLP=X',
  DOLAR: 'USDCLP=X',
};

export function resolveSymbol(ticker) {
  const upper = String(ticker ?? '').trim().toUpperCase();
  return TICKER_ALIASES[upper] ?? upper;
}

function safeParam(value, allowed, fallback) {
  const normalized = String(value ?? '').trim();
  return allowed.has(normalized) ? normalized : fallback;
}

const round2 = (n) => Math.round(n * 100) / 100;

// Fallback de datos reales para crypto: Binance no bloquea IPs de datacenter como
// Yahoo. Devuelve el mismo shape { meta, timestamp, indicators } que /v8/chart.
const BINANCE_PAIRS = {
  'BTC-USD': 'BTCUSDT',
  'ETH-USD': 'ETHUSDT',
  'SOL-USD': 'SOLUSDT',
  'DOGE-USD': 'DOGEUSDT',
  'LTC-USD': 'LTCUSDT',
  'XRP-USD': 'XRPUSDT',
};
const BINANCE_HOSTS = ['api.binance.com', 'api.binance.us'];

async function fetchBinanceResult(symbol, { interval = '1d', range = '1mo' } = {}) {
  if (!BINANCE_PAIRS[symbol]) return null;
  const limit = RANGE_DAYS[range] ?? 66;
  const binanceInterval = interval === '1h' ? '1h' : '1d';
  let lastError = null;
  for (const host of BINANCE_HOSTS) {
    try {
      const url = `https://${host}/api/v3/klines?symbol=${BINANCE_PAIRS[symbol]}&interval=${binanceInterval}&limit=${limit}`;
      const res = await fetch(url, { headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'], Accept: 'application/json' }, signal: AbortSignal.timeout(12000) });
      if (!res.ok) {
        lastError = new Error(`Binance respondió ${res.status}`);
        continue;
      }
      const klines = await res.json();
      if (!Array.isArray(klines) || klines.length < 6) throw new Error('Binance sin velas suficientes');
      const timestamps = [];
      const quote = { open: [], high: [], low: [], close: [], volume: [] };
      klines.forEach((k) => {
        timestamps.push(k[0] / 1000);
        quote.open.push(Number(k[1]));
        quote.high.push(Number(k[2]));
        quote.low.push(Number(k[3]));
        quote.close.push(Number(k[4]));
        quote.volume.push(Number(k[5]));
      });
      const close = quote.close[quote.close.length - 1];
      return {
        meta: {
          symbol,
          regularMarketPrice: close,
          chartPreviousClose: quote.close[quote.close.length - 2] ?? close,
          currency: 'USD',
          longName: symbol,
          shortName: symbol,
        },
        timestamp: timestamps,
        indicators: { quote: [quote] },
      };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error('Binance no respondió');
}

// Historial diario de mindicador.cl por año (API pública chilena, sin clave).
async function fetchMindicadorYear(year) {
  const res = await fetch(`https://mindicador.cl/api/dolar/${year}`, {
    headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'], Accept: 'application/json' },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const serie = Array.isArray(data?.serie) ? data.serie : null;
  if (!serie) return null;
  return serie.filter((entry) => entry && Number.isFinite(entry.valor) && entry.fecha);
}

// Tasa USD/CLP actual sin clave y apta para datacenter (CORS abierto, CDN).
// Respaldo cuando Yahoo está bloqueado y mindicador.cl falla (intermitente).
async function fetchDollarCurrentRate() {
  // 1. mindicador.cl valor vigente.
  try {
    const res = await fetch('https://mindicador.cl/api/dolar', {
      headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'], Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const data = await res.json();
      const valor = Number(data?.serie?.[0]?.valor);
      if (Number.isFinite(valor) && valor > 0) return valor;
    }
  } catch {
    // Continúa con el siguiente respaldo.
  }
  // 2. open.er-api.com (gratuita, sin clave).
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const data = await res.json();
      const valor = Number(data?.rates?.CLP);
      if (Number.isFinite(valor) && valor > 0) return valor;
    }
  } catch {
    // Continúa con el siguiente respaldo.
  }
  // 3. currency-api por CDN (jsdelivr, sin clave).
  try {
    const res = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const data = await res.json();
      const valor = Number(data?.usd?.clp);
      if (Number.isFinite(valor) && valor > 0) return valor;
    }
  } catch {
    // Sin tasa disponible.
  }
  return null;
}

// Serie plana con la tasa vigente para cubrir el rango pedido cuando no hay
// historial (mejor que vacío: las conversiones degradan a la tasa actual).
function buildDollarResultFromRate(symbol, rate, fromISO, toISO) {
  const dates = [];
  const cursor = new Date(`${toISO}T12:00:00Z`);
  const stop = Date.parse(`${fromISO}T00:00:00Z`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(stop)) return null;
  while (dates.length < 400 && cursor.getTime() >= stop) {
    const dow = cursor.getUTCDay();
    if (dow !== 0 && dow !== 6) dates.push(cursor.toISOString().split('T')[0]);
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  if (dates.length === 0) dates.push(toISO);
  dates.reverse();
  const closes = dates.map(() => rate);
  return {
    meta: {
      symbol,
      regularMarketPrice: rate,
      chartPreviousClose: rate,
      currency: 'CLP',
      longName: 'Dólar observado',
      shortName: 'USDCLP',
    },
    timestamp: dates.map((d) => Date.parse(`${d}T12:00:00Z`) / 1000),
    indicators: { quote: [{ open: [...closes], high: [...closes], low: [...closes], close: [...closes], volume: closes.map(() => 0) }] },
  };
}

async function fetchUsdclpResult(symbol, fromISO, toISO) {
  if (symbol !== 'USDCLP=X') return null;
  const from = new Date(`${fromISO}T00:00:00Z`);
  const to = new Date(`${toISO}T23:59:59Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return null;
  const entries = [];
  for (let year = from.getUTCFullYear(); year <= to.getUTCFullYear(); year += 1) {
    try {
      const serie = await fetchMindicadorYear(year);
      if (serie) entries.push(...serie);
    } catch {
      // Año sin respuesta: se omite y se continúa con el resto del rango.
    }
  }
  const points = entries
    .map((entry) => ({ ts: Date.parse(entry.fecha) / 1000, close: entry.valor }))
    .filter((item) => Number.isFinite(item.ts) && item.ts >= Math.floor(from.getTime() / 1000) && item.ts <= Math.floor(to.getTime() / 1000))
    .sort((a, b) => a.ts - b.ts);
  if (points.length < 6) return null;
  const timestamps = points.map((item) => item.ts);
  const closes = points.map((item) => item.close);
  const last = closes[closes.length - 1];
  return {
    meta: {
      symbol,
      regularMarketPrice: last,
      chartPreviousClose: closes[closes.length - 2] ?? last,
      currency: 'CLP',
      longName: 'Dólar observado',
      shortName: 'USDCLP',
    },
    timestamp: timestamps,
    indicators: { quote: [{ open: [...closes], high: [...closes], low: [...closes], close: [...closes], volume: closes.map(() => 0) }] },
  };
}

function isoDaysAgo(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().split('T')[0];
}

const RANGE_DAYS = { '5d': 5, '1mo': 22, '3mo': 66, '6mo': 132, '1y': 260, '2y': 520, '5y': 1300 };

export async function fetchChart(ticker, { interval = '1d', range = '1mo', period1, period2 } = {}) {
  const safeInterval = safeParam(interval, ALLOWED_INTERVALS, '1d');
  const safeRange = safeParam(range, ALLOWED_RANGES, '1mo');

  // Si vienen fechas explícitas (timestamps Unix en segundos) se usan en lugar del rango,
  // permitiendo historial acotado (p. ej. el rango de fechas de las operaciones).
  const params = { interval: safeInterval };
  if (Number.isFinite(period1) && Number.isFinite(period2)) {
    params.period1 = String(Math.round(period1));
    params.period2 = String(Math.round(period2));
  } else {
    params.range = safeRange;
  }

  const path = `/v8/finance/chart/${encodeURIComponent(ticker)}`;

  try {
    const data = await yahooJson(path, params);
    const result = data?.chart?.result?.[0];
    if (!result) {
      throw new Error(`Sin datos disponibles para "${ticker}"`);
    }
    return { result, source: 'yahoo' };
  } catch (yahooError) {
    // Yahoo bloquea IPs de datacenter (Vercel) con 429/401. Se cae a fuentes de datos
    // reales accesibles desde servidores: Binance (crypto) y dólar (mindicador.cl
    // + tasa de respaldo er-api/currency-api si mindicador falla).
    if (BINANCE_PAIRS[ticker]) {
      const binance = await fetchBinanceResult(ticker, { interval: safeInterval, range: safeRange });
      return { result: binance, source: 'binance' };
    }
    if (ticker === 'USDCLP=X') {
      const fromISO =
        Number.isFinite(period1) && Number.isFinite(period2)
          ? new Date(period1 * 1000).toISOString().split('T')[0]
          : isoDaysAgo(RANGE_DAYS[safeRange] ?? 66);
      const toISO =
        Number.isFinite(period1) && Number.isFinite(period2)
          ? new Date(period2 * 1000).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];
      const usdclp = await fetchUsdclpResult(ticker, fromISO, toISO);
      if (usdclp) return { result: usdclp, source: 'mindicador' };
      const rate = await fetchDollarCurrentRate();
      if (rate != null) {
        const flat = buildDollarResultFromRate(ticker, rate, fromISO, toISO);
        if (flat) return { result: flat, source: 'tasa-cambio' };
      }
    }
    throw yahooError;
  }
}

export function mapCandles(result) {
  const timestamps = result.timestamp ?? [];
  const quotes = result.indicators?.quote?.[0] ?? {};
  return timestamps
    .map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      open: quotes.open?.[i] ?? null,
      high: quotes.high?.[i] ?? null,
      low: quotes.low?.[i] ?? null,
      close: quotes.close?.[i] ?? null,
      volume: quotes.volume?.[i] ?? 0,
    }))
    .filter((candle) => candle.close !== null);
}

export function mapQuote(result) {
  const meta = result.meta ?? {};
  const price = meta.regularMarketPrice;
  const previousClose = meta.chartPreviousClose ?? price;
  const changeDay = price - previousClose;
  return {
    ticker: meta.symbol,
    name: meta.longName || meta.shortName || meta.symbol,
    currency: meta.currency || 'USD',
    currentPrice: round2(price),
    changeDay: round2(changeDay),
    changePercent: round2((changeDay / previousClose) * 100),
  };
}
