/**
 * Registrar errores internos (Supabase) solo en desarrollo.
 * En producción no se imprime el detalle del error en la consola del navegador
 * para no exponer nombres de tablas, columnas, constraints o políticas RLS.
 */
export function logDbError(context, message) {
  if (import.meta.env.DEV) console.warn(`[supabase] ${context}:`, message);
}
