/**
 * api/yahoo.js — Proxy serverless (Vercel + Express 5) hacia Yahoo Finance.
 * Evita bloqueos CORS del navegador y normaliza las respuestas OHLCV.
 *
 * Endpoints:
 *   GET /api/yahoo/candles/:ticker?interval=1d&range=1mo
 *   GET /api/yahoo/quotes?tickers=AAPL,NVDA
 */
import express from 'express';

const app = express();

// Normaliza el montaje serverless de Vercel: en el despliegue la función vive en
// /backend/api/yahoo y la ruta pública /api/(.*) se reescribe a /backend/api/$1.
// Aquí se quita ese prefijo para que las rutas de Express del proxy matcheen.
app.use((req, _res, next) => {
  if (req.path.startsWith('/backend/api/yahoo')) {
    req.url = req.path.replace('/backend/api/yahoo', '') + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
  }
  next();
});

const YAHOO_BASE = 'https://query1.finance.yahoo.com';
const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  Accept: 'application/json',
};

const ALLOWED_INTERVALS = new Set(['1h', '1d', '5d', '1wk', '1mo']);
const ALLOWED_RANGES = new Set(['5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', 'max']);

// Alias de símbolos: nombres comunes → formato Yahoo Finance
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

function safeParam(value, allowed, fallback) {
  const normalized = String(value ?? '').trim();
  return allowed.has(normalized) ? normalized : fallback;
}

const round2 = (n) => Math.round(n * 100) / 100;

// Fallback simulado: si Yahoo Finance no responde (p. ej. bloqueo de IP de datacenter en
// Vercel), se generan velas/cotizaciones sintéticas determinísticas por ticker para que la
// UI nunca quede colgada en "Cargando gráfico...". El dataSource 'simulado' lo distingue.
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

const RANGE_DAYS = { '5d': 5, '1mo': 22, '3mo': 66, '6mo': 132, '1y': 260, '2y': 520, '5y': 1300 };

function simulateCandles(ticker, count) {
  const rand = makeRandom(`candles-${ticker}`);
  let close = 60 + rand() * 350;
  const dates = [];
  const cursor = new Date();
  while (dates.length < count) {
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
      open: round2(open),
      high: round2(Math.max(open, close) * (1 + rand() * 0.02)),
      low: round2(Math.min(open, close) * (1 - rand() * 0.02)),
      close: round2(close),
      volume: Math.round(1e6 + rand() * 4e7),
    };
  });
}

function simulateQuote(ticker) {
  const last = simulateCandles(ticker, 3);
  const current = last[last.length - 1];
  const previous = last[last.length - 2];
  const change = current.close - previous.close;
  return {
    ticker,
    name: ticker,
    currency: 'USD',
    currentPrice: current.close,
    changeDay: round2(change),
    changePercent: round2((change / previous.close) * 100),
  };
}

function countFromPeriod(period1, period2) {
  if (Number.isFinite(period1) && Number.isFinite(period2)) {
    const days = Math.round((period2 - period1) / 86400);
    return Math.min(400, Math.max(1, days));
  }
  return 66;
}

async function fetchChart(ticker, { interval = '1d', range = '1mo', period1, period2 } = {}) {
  const safeInterval = safeParam(interval, ALLOWED_INTERVALS, '1d');
  const safeRange = safeParam(range, ALLOWED_RANGES, '1mo');

  // Si vienen fechas explícitas (timestamps Unix en segundos) se usan en lugar del rango,
  // permitiendo historial acotado (p. ej. el rango de fechas de las operaciones).
  let url = `${YAHOO_BASE}/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${safeInterval}&range=${safeRange}`;
  if (Number.isFinite(period1) && Number.isFinite(period2)) {
    url = `${YAHOO_BASE}/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${safeInterval}&period1=${Math.round(period1)}&period2=${Math.round(period2)}`;
  }

  const response = await fetch(url, { headers: BROWSER_HEADERS });
  if (!response.ok) {
    throw new Error(`Yahoo Finance respondió ${response.status}`);
  }
  const data = await response.json();
  const result = data?.chart?.result?.[0];
  if (!result) {
    throw new Error(`Sin datos disponibles para "${ticker}"`);
  }
  return result;
}

function mapCandles(result) {
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

function mapQuote(result) {
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

app.get(['/api/yahoo/candles/:ticker', '/candles/:ticker'], async (req, res) => {
  const { ticker } = req.params;
  const { interval = '1d', range = '1mo', period1, period2 } = req.query;
  const symbol = resolveSymbol(ticker);

  try {
    const period = [Number(period1), Number(period2)];
    const result = await fetchChart(symbol, {
      interval,
      range,
      period1: period1 != null ? period[0] : undefined,
      period2: period2 != null ? period[1] : undefined,
    });
    const candles = mapCandles(result);
    if (candles.length < 6) {
      throw new Error(`Serie insuficiente para "${symbol}"`);
    }
    res.json({ success: true, ticker: symbol, source: 'yahoo', candles });
  } catch (error) {
    console.error('[api/yahoo] fallback simulado:', error.message);
    const candles = simulateCandles(symbol, countFromPeriod(Number(period1), Number(period2)));
    res.json({ success: true, ticker: symbol, source: 'simulado', candles });
  }
});

app.get(['/api/yahoo/quotes', '/quotes'], async (req, res) => {
  const tickers = String(req.query.tickers || '')
    .split(',')
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 20);

  if (tickers.length === 0) {
    return res.status(400).json({ success: false, error: 'Parámetro "tickers" requerido' });
  }

  try {
    const resolved = tickers.map((t) => resolveSymbol(t));
    const results = await Promise.allSettled(resolved.map((s) => fetchChart(s)));
    const quotes = {};
    results.forEach((item, i) => {
      if (item.status === 'fulfilled') {
        quotes[tickers[i]] = mapQuote(item.value);
      }
    });

    if (Object.keys(quotes).length === 0) {
      throw new Error('Yahoo Finance no devolvió cotizaciones');
    }

    res.json({ success: true, source: 'yahoo', quotes });
  } catch (error) {
    console.error('[api/yahoo] fallback simulado:', error.message);
    const quotes = {};
    tickers.forEach((t) => {
      quotes[t] = simulateQuote(t);
    });
    res.json({ success: true, source: 'simulado', quotes });
  }
});

app.use((error, req, res, next) => {
  console.error('[api/yahoo]', error);
  res.status(500).json({ success: false, error: 'Error interno del proxy Yahoo Finance' });
});

if (!process.env.VERCEL) {
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`✓ API Yahoo Finance escuchando en http://localhost:${port}`);
  });
}

export default app;
