/**
 * frontend/api/yahoo/quotes.js — Vercel Serverless Function.
 * Ruta pública: GET /api/yahoo/quotes?tickers=AAPL,NVDA
 * Se despliega automáticamente cuando el Root Directory de Vercel es `frontend`.
 */
import { fetchChart, mapQuote, resolveSymbol } from './_lib.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Método no permitido.' });

  const tickers = String(req.query.tickers || '')
    .split(',')
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 20);

  if (tickers.length === 0) {
    return res.status(400).json({ success: false, error: 'Parámetro "tickers" requerido.' });
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
      throw new Error('Yahoo Finance no devolvió cotizaciones.');
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.json({ success: true, source: realSource ?? 'yahoo', quotes });
  } catch (error) {
    // Sin simulador: sin fuente real se devuelve error; el cliente conserva la
    // última cotización conocida en vez de mostrar valores inventados.
    console.error('[api/yahoo] sin cotización real:', error.message);
    return res.status(502).json({ success: false, source: 'error', error: error.message, quotes: {} });
  }
}
