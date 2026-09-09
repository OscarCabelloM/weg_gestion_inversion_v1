/**
 * Re-export del handler canónico (frontend/api) para despliegues cuyo
 * Root Directory de Vercel es la raíz del repo (funciones en /api).
 * Cuando el Root Directory es `frontend`, este fichero se ignora y Vercel
 * usa directamente frontend/api/yahoo/candles/[ticker].js.
 */
export { default } from '../../../frontend/api/yahoo/candles/[ticker].js';
