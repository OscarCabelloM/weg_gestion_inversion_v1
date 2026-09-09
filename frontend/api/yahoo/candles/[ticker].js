/**
 * frontend/api/yahoo/candles/[ticker].js — Vercel Serverless Function.
 * Ruta pública: GET /api/yahoo/candles/:ticker?interval=1d&range=1mo
 * Se despliega automáticamente cuando el Root Directory de Vercel es `frontend`.
 */
import { fetchChart, mapCandles, resolveSymbol } from '../_lib.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Método no permitido.' });

  const { ticker } = req.query;
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
      throw new Error(`Serie insuficiente para "${symbol}".`);
    }
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.json({ success: true, ticker: symbol, source, candles });
  } catch (error) {
    // Sin simulador: si no hay fuente real se devuelve error para que el
    // cliente intente Yahoo directo desde el navegador en vez de inventar valores.
    console.error('[api/yahoo] sin dato real:', error.message);
    return res.status(502).json({ success: false, ticker: symbol, source: 'error', error: error.message });
  }
}
