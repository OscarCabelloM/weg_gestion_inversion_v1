-- =============================================================
-- Gestión_Inversiones.v.1.0 — Datos de ejemplo
-- Reemplaza <USER_UUID> por el id real del usuario autenticado
-- (visible en Supabase → Authentication → Users)
-- =============================================================

INSERT INTO public.tgi_inversiones (user_id, nemotecnico, tipo, cantidad, precio, fecha_ing, notas) VALUES
('<USER_UUID>', 'AAPL',    'COMPRA', 15,   185.20, '2024-01-15', 'Compra estrategia DCA'),
('<USER_UUID>', 'NVDA',    'COMPRA', 20,   92.40,  '2024-02-10', 'Incentivo IA GPU'),
('<USER_UUID>', 'MSFT',    'COMPRA', 8,    405.00, '2024-03-01', 'Suscripción Cloud'),
('<USER_UUID>', 'TSLA',    'COMPRA', 10,   210.00, '2024-04-12', 'Rebote de soporte'),
('<USER_UUID>', 'BTC-USD', 'COMPRA', 0.15, 58000,  '2024-05-20', 'Reserva de valor'),
('<USER_UUID>', 'AAPL',    'VENTA',  5,    220.00, '2024-06-18', 'Toma parcial de beneficios');
