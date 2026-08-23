export const EXPRESS_SNIPPET = `// api/yahoo.js - Endpoint Express 5 para evitar bloqueos CORS con Yahoo Finance
import express from 'express';

const app = express();
app.use(express.json());

app.get('/api/yahoo/candles/:ticker', async (req, res) => {
  const { ticker } = req.params;
  const { interval = '1d', range = '1mo' } = req.query;

  try {
    const url = \`https://query1.finance.yahoo.com/v8/finance/chart/\${ticker}?interval=\${interval}&range=\${range}\`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    const data = await response.json();
    const result = data.chart.result[0];

    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];

    const candles = timestamps.map((ts, idx) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      open: quotes.open[idx],
      high: quotes.high[idx],
      low: quotes.low[idx],
      close: quotes.close[idx],
      volume: quotes.volume[idx]
    }));

    res.json({ success: true, ticker, candles });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default app;`;

export const SUPABASE_SNIPPET = `-- Tabla de inversiones (diario de compras y ventas)
CREATE TABLE public.tgi_inversiones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    nemotecnico VARCHAR(20) NOT NULL,
    tipo VARCHAR(10) CHECK (tipo IN ('COMPRA', 'VENTA')) NOT NULL,
    cantidad NUMERIC(12, 6) NOT NULL,
    precio NUMERIC(12, 2) NOT NULL,
    fecha_ing DATE NOT NULL DEFAULT CURRENT_DATE,
    notas TEXT
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.tgi_inversiones ENABLE ROW LEVEL SECURITY;

-- El cliente nunca envía user_id: lo resuelve auth.uid() y RLS lo valida
CREATE POLICY "Usuarios pueden gestionar sus propias inversiones"
ON public.tgi_inversiones FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);`;
