-- =============================================================
-- Parche para bases de datos donde tgi_inversiones ya existía
-- (creada manualmente) sin políticas RLS funcionales.
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Síntoma que resuelve: el navegador ve 0 filas y los inserts
-- desde la app fallan con 42501 (row-level security).
-- =============================================================

-- 1. Asegura que RLS esté activo
ALTER TABLE public.tgi_inversiones ENABLE ROW LEVEL SECURITY;

-- 2. Elimina políticas previas con posible definición rota (idempotente)
DROP POLICY IF EXISTS "Usuarios pueden gestionar sus propias inversiones" ON public.tgi_inversiones;

-- 3. Política única: cada usuario ve y gestiona SOLO sus filas
CREATE POLICY "Usuarios pueden gestionar sus propias inversiones"
ON public.tgi_inversiones FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. La app ya NO envía user_id desde el cliente (seguridad):
--    la columna lo resuelve sola al insertar
ALTER TABLE public.tgi_inversiones ALTER COLUMN user_id SET DEFAULT auth.uid();

-- 5. (Recomendado) Índices si tu tabla creada a mano no los tiene
CREATE INDEX IF NOT EXISTS idx_tgi_inversiones_user_fecha ON public.tgi_inversiones (user_id, fecha_ing DESC);
CREATE INDEX IF NOT EXISTS idx_tgi_inversiones_nemotecnico ON public.tgi_inversiones (nemotecnico);

-- Verificación rápida: debe devolver tus filas cuando ejecutes
-- consultas autenticadas desde la app.
-- SELECT * FROM public.tgi_inversiones;
