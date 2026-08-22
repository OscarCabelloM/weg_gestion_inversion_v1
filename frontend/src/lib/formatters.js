/**
 * Utilidades de formato compartidas por toda la aplicación.
 */

/** Formatea un número como USD: 1234.5 -> "$1,234.50" */
export function formatUSD(value, decimals = 2) {
  return `$${Number(value ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/** Formatea con signo explícito: +$120.00 / -$85.30 */
export function formatSignedUSD(value) {
  const num = Number(value ?? 0);
  return `${num >= 0 ? '+' : '-'}${formatUSD(Math.abs(num))}`;
}

/** Formatea porcentaje con signo: 12.5 -> "+12.50%" */
export function formatSignedPercent(value, decimals = 2) {
  return `${Number(value ?? 0) >= 0 ? '+' : ''}${Number(value ?? 0).toFixed(decimals)}%`;
}

/** Fecha de hoy en formato ISO corto (YYYY-MM-DD). */
export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

/** Hora local legible para "última sincronización". */
export function currentTime() {
  return new Date().toLocaleTimeString();
}
