/**
 * Cliente del proxy Yahoo Finance (/api/yahoo — Express serverless en Vercel).
 * Solo precios reales, sin simulador: proxy → Yahoo directo desde el navegador
 * (IP residencial, no bloqueada como las de datacenter) → Binance/mindicador.cl
 * directos. Si no hay fuente real, se conserva la última cotización conocida y
 * se informa `source: 'error'` en vez de inventar valores.
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

// Tasa USD/CLP directa sin clave (respaldo cuando Yahoo directo falla para el
// dólar). er-api y currency-api por CDN: gratuitas, CORS abierto.
async function fetchDirectDollarCurrent() {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: AbortSignal.timeout(10000),
    });
    if (response.ok) {
      const data = await response.json();
      const rate = Number(data?.rates?.CLP);
      if (Number.isFinite(rate) && rate > 0) return rate;
    }
  } catch {
    // Continúa con el siguiente respaldo.
  }
  const response = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json', {
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Tasa directa respondió ${response.status}`);
  const data = await response.json();
  const rate = Number(data?.usd?.clp);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('Sin tasa USD/CLP directa');
  return rate;
}

function dollarQuoteFromRate(rate) {
  const round2 = (n) => Math.round(Number(n) * 100) / 100;
  return {
    ticker: USD_SYMBOL,
    name: 'Dólar observado',
    currency: 'CLP',
    currentPrice: round2(rate),
    changeDay: 0,
    changePercent: 0,
  };
}

async function fetchDirectMindicadorHistory(startISO, endISO) {
  const from = new Date(`${startISO}T00:00:00Z`);
  const to = new Date(`${endISO}T23:59:59Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return {};
  const history = {};
  // Los años son independientes: se piden en paralelo; cada año fallido se
  // omite sin abortar el resto (misma semántica que la versión secuencial).
  const years = [];
  for (let year = from.getUTCFullYear(); year <= to.getUTCFullYear(); year += 1) years.push(year);
  await Promise.all(
    years.map(async (year) => {
      try {
        const response = await fetch(`https://mindicador.cl/api/dolar/${year}`, {
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) return;
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
    })
  );
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
 * Actualiza cotizaciones reales de todos los tickers conocidos más los extras.
 * Sin simulador: proxy (+autocuración .SN) → Yahoo directo desde el navegador
 * → Binance directo (crypto). Los tickers sin fuente real quedan fuera del
 * resultado y la UI conserva su última cotización conocida.
 */
export async function fetchQuotes(prices, extraTickers = []) {
  const extras = Array.isArray(extraTickers)
    ? extraTickers.flatMap((t) => {
        const ticker = String(t).trim().toUpperCase();
        return ticker ? [ticker] : [];
      })
    : [];

  const tickers = [...new Set([...extras, ...Object.keys(prices)])];
  if (tickers.length === 0) return { quotes: {}, source: 'error' };

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

  let proxyQuotes = {};
  try {
    const response = await fetch(`${API_BASE}/quotes?tickers=${encodeURIComponent(resolvedList.join(','))}`);
    if (!response.ok) throw new Error(`API respondió ${response.status}`);
    const json = await response.json();
    if (!json.success || !json.quotes) throw new Error(json.error || 'Sin cotizaciones');
    if (json.source === 'simulado') throw new Error('Proxy sin cotización real');
    proxyQuotes = remapQuotes(json.quotes);

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
  } catch {
    proxyQuotes = {};
  }

  const faltantes = tickers.filter((t) => !proxyQuotes[t]);
  if (faltantes.length === 0) {
    return { quotes: proxyQuotes, source: 'yahoo' };
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

  // Último recurso real por activo: Binance directo (crypto) y tasa directa
  // (er-api/currency-api) para el dólar si Yahoo directo también falló.
  // Cada ticker es independiente (escribe su propia clave): se resuelven en
  // paralelo preservando la semántica de omisión ante fallo individual.
  const aunFaltantes = faltantes.filter((t) => !directRemapped[t]);
  await Promise.all(
    aunFaltantes.map(async (t) => {
      const resolved = resolvedMap.get(t);
      try {
        if (BINANCE_PAIRS[resolved]) {
          directRemapped[t] = await fetchDirectBinanceQuote(resolved);
        } else if (resolved === USD_SYMBOL) {
          directRemapped[t] = dollarQuoteFromRate(await fetchDirectDollarCurrent());
        }
      } catch {
        // Sin fuente real: queda fuera del resultado (se conserva la anterior).
      }
    })
  );

  const quotes = { ...proxyQuotes, ...directRemapped };
  if (Object.keys(quotes).length === 0) return { quotes, source: 'error' };
  if (Object.keys(quotes).length < tickers.length) return { quotes, source: 'parcial' };
  return { quotes, source: 'yahoo' };
}
