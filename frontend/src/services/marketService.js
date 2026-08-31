/**
 * Cliente del proxy Yahoo Finance (/api/yahoo — Express serverless en Vercel).
 * Si el backend no está disponible (p. ej. desarrollo sin `npm run api`),
 * se degrada devolviendo estructuras vacías para no romper la UI.
 */

const API_BASE = '/api/yahoo';

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
    return { quotes: {}, source: 'simulado' };
  }
}
