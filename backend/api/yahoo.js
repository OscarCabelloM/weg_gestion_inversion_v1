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
app.use(express.json());

const YAHOO_BASE = 'https://query1.finance.yahoo.com';
const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  Accept: 'application/json',
};

// Allowlists: solo se envían a Yahoo los valores conocidos (evita inyectar
// parámetros arbitrarios en la URL upstream)
const ALLOWED_INTERVALS = new Set(['1h', '1d', '5d', '1wk', '1mo']);
const ALLOWED_RANGES = new Set(['5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', 'max']);

function safeParam(value, allowed, fallback) {
  const normalized = String(value ?? '').trim();
  return allowed.has(normalized) ? normalized : fallback;
}

const round2 = (n) => Math.round(n * 100) / 100;

async function fetchChart(ticker, { interval = '1d', range = '1mo' } = {}) {
  const safeInterval = safeParam(interval, ALLOWED_INTERVALS, '1d');
  const safeRange = safeParam(range, ALLOWED_RANGES, '1mo');
  const url = `${YAHOO_BASE}/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${safeInterval}&range=${safeRange}`;
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
  const { interval = '1d', range = '1mo' } = req.query;

  try {
    const result = await fetchChart(ticker.toUpperCase(), { interval, range });
    res.json({ success: true, ticker: ticker.toUpperCase(), source: 'yahoo', candles: mapCandles(result) });
  } catch (error) {
    res.status(502).json({ success: false, error: error.message });
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
    const results = await Promise.allSettled(tickers.map((t) => fetchChart(t)));
    const quotes = {};
    results.forEach((item, i) => {
      if (item.status === 'fulfilled') {
        quotes[tickers[i]] = mapQuote(item.value);
      }
    });

    if (Object.keys(quotes).length === 0) {
      return res.status(502).json({ success: false, error: 'Yahoo Finance no devolvió cotizaciones' });
    }

    res.json({ success: true, source: 'yahoo', quotes });
  } catch (error) {
    res.status(502).json({ success: false, error: error.message });
  }
});

// Manejo centralizado de errores (Express 5 propaga promesas rechazadas aquí)
app.use((error, req, res, next) => {
  console.error('[api/yahoo]', error);
  res.status(500).json({ success: false, error: 'Error interno del proxy Yahoo Finance' });
});

// Servidor local (en Vercel se exporta como handler serverless)
if (!process.env.VERCEL) {
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`✓ API Yahoo Finance escuchando en http://localhost:${port}`);
  });
}

export default app;
