/**
 * Datos simulados de mercado y transacciones.
 * Se usan como estado inicial y como fallback cuando la API
 * de Yahoo Finance no está disponible.
 */

export const MOCK_MARKET_DATA = {
  AAPL: { name: 'Apple Inc.', currentPrice: 228.4, changeDay: 2.15, changePercent: 0.95, currency: 'USD' },
  NVDA: { name: 'NVIDIA Corporation', currentPrice: 128.5, changeDay: -3.2, changePercent: -2.43, currency: 'USD' },
  MSFT: { name: 'Microsoft Corp.', currentPrice: 448.9, changeDay: 4.8, changePercent: 1.08, currency: 'USD' },
  TSLA: { name: 'Tesla, Inc.', currentPrice: 254.2, changeDay: 12.4, changePercent: 5.13, currency: 'USD' },
  'BTC-USD': { name: 'Bitcoin / USD', currentPrice: 64200.0, changeDay: -850.0, changePercent: -1.31, currency: 'USD' },
  SPY: { name: 'SPDR S&P 500 ETF', currentPrice: 552.1, changeDay: 1.8, changePercent: 0.33, currency: 'USD' },
  'QUINENCO.SN': { name: 'Química y Minera', currentPrice: 4500, changeDay: 50, changePercent: 1.12, currency: 'CLP' },
  'CENCOSUD.SN': { name: 'Cencosud', currentPrice: 2060, changeDay: -15, changePercent: -0.72, currency: 'CLP' },
  'CFMITNIPSA.SN': { name: 'Fondo Mitigador NIPSA', currentPrice: 5275, changeDay: 25, changePercent: 0.48, currency: 'CLP' },
  'CFIETFCD.SN': { name: 'Fondo ETF CD', currentPrice: 1271, changeDay: 8, changePercent: 0.63, currency: 'CLP' },
  'CFINRENTAS.SN': { name: 'Fondo Inversiones Renta', currentPrice: 2119, changeDay: -12, changePercent: -0.56, currency: 'CLP' },
  'CFIAMDVASC.SN': { name: 'Fondo AMD Vasc', currentPrice: 9357, changeDay: 42, changePercent: 0.45, currency: 'CLP' },
};

/**
 * Generador de velas semanales ficticias al estilo Yahoo Finance.
 * La caminata aleatoria termina exactamente en el precio de cierre del día
 * (MOCK_MARKET_DATA.currentPrice) para que el gráfico sea coherente con la cotización.
 */
export function generateCandles(ticker, count = 26) {
  const basePrice = MOCK_MARKET_DATA[ticker]?.currentPrice || 100;
  const candles = [];
  let currentOpen = basePrice * 0.92;
  const now = new Date();

  for (let i = count; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const variation = (Math.random() - 0.48) * (basePrice * 0.035);
    const close = Math.max(1, currentOpen + variation);
    const high = Math.max(currentOpen, close) + Math.random() * (basePrice * 0.015);
    const low = Math.min(currentOpen, close) - Math.random() * (basePrice * 0.015);
    const volume = Math.floor(Math.random() * 5000000) + 1000000;

    candles.push({
      date: dateStr,
      open: parseFloat(currentOpen.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume,
    });

    currentOpen = close;
  }

  // Reescala la serie para que la última vela cierre exactamente en el precio del día
  const factor = basePrice / (candles[candles.length - 1]?.close || basePrice);
  return candles.map((candle) => ({
    ...candle,
    open: parseFloat((candle.open * factor).toFixed(2)),
    high: parseFloat((candle.high * factor).toFixed(2)),
    low: parseFloat((candle.low * factor).toFixed(2)),
    close: parseFloat((candle.close * factor).toFixed(2)),
  }));
}

export const MOCK_TRANSACTIONS = [
  { id: 'tx-1', nemotecnico: 'AAPL', tipo: 'COMPRA', cantidad: 15, precio: 185.2, fecha_ing: '2024-01-15', notas: 'Compra estrategia DCA' },
  { id: 'tx-2', nemotecnico: 'NVDA', tipo: 'COMPRA', cantidad: 20, precio: 92.4, fecha_ing: '2024-02-10', notas: 'Incentivo IA GPU' },
  { id: 'tx-3', nemotecnico: 'MSFT', tipo: 'COMPRA', cantidad: 8, precio: 405.0, fecha_ing: '2024-03-01', notas: 'Suscripción Cloud' },
  { id: 'tx-4', nemotecnico: 'TSLA', tipo: 'COMPRA', cantidad: 10, precio: 210.0, fecha_ing: '2024-04-12', notas: 'Rebote de soporte' },
  { id: 'tx-5', nemotecnico: 'BTC-USD', tipo: 'COMPRA', cantidad: 0.15, precio: 58000.0, fecha_ing: '2024-05-20', notas: 'Reserva de valor' },
  { id: 'tx-6', nemotecnico: 'AAPL', tipo: 'VENTA', cantidad: 5, precio: 220.0, fecha_ing: '2024-06-18', notas: 'Toma parcial de beneficios' },
];

export const MONTHLY_PERFORMANCE = [
  { month: 'Enero', returnPct: 3.2, trades: 4 },
  { month: 'Febrero', returnPct: 5.1, trades: 2 },
  { month: 'Marzo', returnPct: -1.4, trades: 3 },
  { month: 'Abril', returnPct: 2.8, trades: 1 },
  { month: 'Mayo', returnPct: 4.5, trades: 5 },
  { month: 'Junio', returnPct: -0.8, trades: 2 },
  { month: 'Julio', returnPct: 6.2, trades: 4 },
  { month: 'Agosto', returnPct: 1.9, trades: 3 },
  { month: 'Septiembre', returnPct: -2.1, trades: 2 },
  { month: 'Octubre', returnPct: 3.8, trades: 4 },
  { month: 'Noviembre', returnPct: 4.1, trades: 1 },
  { month: 'Diciembre', returnPct: 2.5, trades: 3 },
];

export const ANNUAL_SUMMARY = [
  { label: 'Rentabilidad Acumulada 2024', value: '+28.4%', tone: 'text-blue-400', note: 'Superando al S&P 500 (+21.2%)' },
  { label: 'Rentabilidad Acumulada 2025', value: '+19.8%', tone: 'text-blue-400', note: 'Impulsado por Tecnología e IA' },
  { label: 'Proyección Cierre 2026', value: '+22.5%', tone: 'text-cyan-400', note: 'Basado en la tasa de retorno actual' },
];
