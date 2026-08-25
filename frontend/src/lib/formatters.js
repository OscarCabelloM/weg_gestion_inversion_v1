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
