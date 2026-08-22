-- =============================================================
-- InvestPro Hub — Esquema Supabase (PostgreSQL)
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- =============================================================

-- Tabla de inversiones (diario de compras y ventas)
CREATE TABLE IF NOT EXISTS public.tgi_inversiones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nemotecnico VARCHAR(20) NOT NULL,
    tipo VARCHAR(10) CHECK (tipo IN ('COMPRA', 'VENTA')) NOT NULL,
    cantidad NUMERIC(12, 6) NOT NULL,
    precio NUMERIC(12, 2) NOT NULL,
    fecha_ing DATE NOT NULL DEFAULT CURRENT_DATE,
    notas TEXT
);

-- Índices de consulta habitual
CREATE INDEX IF NOT EXISTS idx_tgi_inversiones_user_fecha ON public.tgi_inversiones (user_id, fecha_ing DESC);
CREATE INDEX IF NOT EXISTS idx_tgi_inversiones_nemotecnico ON public.tgi_inversiones (nemotecnico);

-- Tabla de activos seguidos (watchlist para el gráfico de velas)
CREATE TABLE IF NOT EXISTS public.watchlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ticker VARCHAR(20) NOT NULL,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_id, ticker)
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.tgi_inversiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

-- Políticas: cada usuario gestiona únicamente sus propias filas
CREATE POLICY "Usuarios pueden gestionar sus propias inversiones"
ON public.tgi_inversiones FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden gestionar su propia watchlist"
ON public.watchlist FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
