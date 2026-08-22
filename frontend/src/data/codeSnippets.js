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

export const SUPABASE_SNIPPET = `-- Tabla de Transacciones Diario
CREATE TABLE public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ticker VARCHAR(20) NOT NULL,
    type VARCHAR(10) CHECK (type IN ('COMPRA', 'VENTA')) NOT NULL,
    shares NUMERIC(12, 6) NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden gestionar sus propias transacciones"
ON public.transactions FOR ALL
USING (auth.uid() = user_id);`;
