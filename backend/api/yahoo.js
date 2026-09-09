/**
 * api/yahoo.js — Proxy serverless (Vercel + Express 5) hacia Yahoo Finance.
 * Evita bloqueos CORS del navegador y normaliza las respuestas OHLCV.
 *
 * Endpoints:
 *   GET /api/yahoo/candles/:ticker?interval=1d&range=1mo
 *   GET /api/yahoo/quotes?tickers=AAPL,NVDA
 *
 * Servidor de desarrollo local (puerto 3001): el proxy de Vite
 * (frontend/vite.config.js) reenvía /api → http://localhost:3001.
 * En Vercel la lógica vive en frontend/api/yahoo/*.js; este fichero es solo
 * un envoltorio Express que reutiliza esa misma lib para el dev local.
 */
import express from 'express';
import { fetchChart, mapCandles, mapQuote, resolveSymbol } from '../../frontend/api/yahoo/_lib.js';

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

app.get(['/api/yahoo/candles/:ticker', '/candles/:ticker'], async (req, res) => {
  const { ticker } = req.params;
  const { interval = '1d', range = '1mo', period1, period2 } = req.query;
  const symbol = resolveSymbol(ticker);

  try {
    const period = [Number(period1), Number(period2)];
    const { result, source } = await fetchChart(symbol, {
      interval,
      range,
      period1: period1 != null ? period[0] : undefined,
      period2: period2 != null ? period[1] : undefined,
    });
    const candles = mapCandles(result);
    if (candles.length < 6) {
      throw new Error(`Serie insuficiente para "${symbol}"`);
    }
    res.json({ success: true, ticker: symbol, source, candles });
  } catch (error) {
    // Sin simulador: si no hay fuente real se devuelve error para que el
    // cliente intente Yahoo directo desde el navegador en vez de inventar valores.
    console.error('[api/yahoo] sin dato real:', error.message);
    res.status(502).json({ success: false, ticker: symbol, source: 'error', error: error.message });
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
    // Si alguna fuente real respondió (yahoo/binance/mindicador), se propaga como
    // real para que el cliente no dispare el fallback directo innecesariamente.
    let realSource = null;
    results.forEach((item, i) => {
      if (item.status === 'fulfilled') {
        quotes[tickers[i]] = mapQuote(item.value.result);
        if (!realSource) realSource = item.value.source;
      }
    });

    if (Object.keys(quotes).length === 0) {
      throw new Error('Yahoo Finance no devolvió cotizaciones');
    }

    res.json({ success: true, source: realSource ?? 'yahoo', quotes });
  } catch (error) {
    // Sin simulador: sin fuente real se devuelve error; el cliente conserva la
    // última cotización conocida en vez de mostrar valores inventados.
    console.error('[api/yahoo] sin cotización real:', error.message);
    res.status(502).json({ success: false, source: 'error', error: error.message, quotes: {} });
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
