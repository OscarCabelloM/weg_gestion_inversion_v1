/**
 * Utilidades de formato compartidas por toda la aplicación.
 * Convención de la UI: separador de miles "." y decimales "," (es-CL).
 */

/** Formatea un número como moneda: 1234.5 -> "$1.235" (sin decimales salvo indicación). */
export function formatUSD(value, decimals = 0) {
  return `$${Number(value ?? 0).toLocaleString('es-CL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/** Formatea con signo explícito: +$120.00 / -$85.30 */
export function formatSignedUSD(value) {
  const num = Number(value ?? 0);
  return `${num >= 0 ? '+' : '-'}${formatUSD(Math.abs(num))}`;
}

/** Fecha de hoy en formato ISO corto (YYYY-MM-DD). */
export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

/** Hora local legible para "última sincronización". */
export function currentTime() {
  return new Date().toLocaleTimeString();
}

/**
 * Dólar (USD/CLP) aplicable a una fecha de ingreso.
 * Primero el histórico exacto; si no hay (día no hábil, desface de zona) usa el
 * último cierre histórico <= fecha; y solo entonces degrada al dólar actual.
 * Devuelve null si no hay ninguna fuente. `usdHistory` es un mapa { fecha: cierre }.
 */
export function usdRateForDate(date, usdHistory = {}, usdclpPrice = null) {
  if (!date) return usdclpPrice != null ? usdclpPrice : null;
  if (usdHistory[date] != null) return usdHistory[date];

  let best = null;
  for (const d in usdHistory) {
    if (d <= date && (best === null || d > best)) best = d;
  }
  if (best !== null) return usdHistory[best];

  return usdclpPrice != null ? usdclpPrice : null;
}

/**
 * Convierte un monto en USD a CLP con el dólar de la fecha indicada.
 * Si no hay fuente de dólar disponible, devuelve el monto sin convertir.
 */
export function toCLP(usd, date, usdHistory = {}, usdclpPrice = null) {
  const rate = usdRateForDate(date, usdHistory, usdclpPrice);
  return rate != null ? usd * rate : usd;
}
