# AGENTS.md — Gestión_Inversiones.v.1.0

Guía para agentes de código y desarrolladores. Toda modificación debe respetar este documento.

## Rol

Eres un desarrollador fullstack senior especializado en React, Tailwind CSS, Express y Supabase. Priorizas: seguridad de las credenciales del cliente, consistencia con la forma española de la base de datos, y no romper la arquitectura de componentes existente.

---

## Descripción del Proyecto

Dashboard de gestión de portafolio de inversiones: cotizaciones en vivo de Yahoo Finance vía proxy propio, gráfico lineal SVG puro, registro diario de operaciones (compras/ventas) persistido en Supabase con RLS por usuario, rendimiento mensual/anual y proyección de interés compuesto a 36 meses.

- **Nombre UI:** Gestión_Inversiones.v.1.0
- **Stack:** React 19 + Vite 8 + Tailwind CSS 3 + Express 5 (solo proxy serverless) + Supabase (Auth directo + PostgreSQL)
- **Despliegue:** Vercel — monorepo npm workspaces (`frontend/` SPA + `backend/api/*.js` funciones)

---

## Design System (tema oscuro)

Estilo: dashboard financiero oscuro tipo Vercel/Linear dark. Fondo casi negro, paneles slate, acento azul.

### Paleta base

| Uso | Clase | Hex |
|-----|-------|-----|
| Fondo principal app | `bg-slate-950` | `#020617` |
| Paneles / cards | `bg-slate-900`, bordes `border-slate-800` | |
| Texto principal | `text-slate-100` / `text-white` | |
| Texto secundario | `text-slate-400` / `text-slate-500` | |

### Colores semánticos

| Semántica | Color |
|-----------|-------|
| Acento principal (marca, botones, ganancias/P&L positivo, foco de inputs) | **Azul** `blue-400` / `blue-500` (`#3b82f6`) |
| Acento secundario (proyección/balance futuro) | `cyan-400` |
| Pérdidas / P&L negativo / peligro | `rose-400` / `rose-500` (`#ef4444`) |
| Advertencia / variación día | `amber-400` |
| Contadores / badges informativos | `purple-400` |

Reglas:
1. Ganancias = azul, pérdidas = rose. NUNCA usar verde como color de acento (migrado a azul por decisión de producto).
2. Botón primario: `bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold rounded-lg`.
3. Inputs: `bg-slate-950 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-lg`.
4. Selección de texto global: `selection:bg-blue-500 selection:text-slate-950`.

### Gráficos (línea SVG)

- Línea de precios de cierre: `#3b82f6` con relleno degradado azul→transparente (`lineChartFill`)
- Grid horizontal: `#1e293b` punteado · Crosshair + punto al hover · Barra superior con cierre, variación día y volumen
- Componente: `components/charts/LineChart.jsx` (SVG puro, `vectorEffect="non-scaling-stroke"` para trazos nítidos)

### Tipografía e iconos

- Fuente UI: **Inter** · Fuente numérica/fechas: **JetBrains Mono** (definidas en `tailwind.config.js`)
- Iconos: **únicamente lucide-react** (nada de emojis ni otros packs)

### Animaciones

Sutiles y nombradas por propiedad. Preferir `transition-colors` / `transition-opacity` sobre `transition-all` (React Doctor lo marca; hay 5 pendientes documentados).

### Responsive

Mobile-first con breakpoints `sm:` / `lg:`. Grids principales: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`. Debe verse correcto desde 384px.

---

## Arquitectura

```
React SPA (frontend/)
├── Datos de negocio ──► supabase-js DIRECTO (anon key) ──► PostgreSQL con RLS
├── Auth ──────────────► supabase.auth (signIn/signUp/signOut desde el cliente)
└── Mercado ───────────► fetch /api/yahoo ──► Express proxy (backend/api/yahoo.js) ──► query1.finance.yahoo.com
```

Diferencia clave con otros proyectos: **NO existe backend intermediario para la base de datos.** El cliente habla directo con Supabase usando la anon key; la seguridad la garantiza RLS (`auth.uid() = user_id`). El backend Express SOLEAMENTE hace de proxy contra Yahoo Finance para evitar CORS.

### Modos de operación (degradación graceful)

| Condición | Modo |
|-----------|------|
| `.env` con Supabase configurado | Login obligatorio + persistencia real en `tgi_inversiones` |
| Sin Supabase configurado | Modo local abierto con `MOCK_TRANSACTIONS` |
| Backend caído / ticker sin datos | Cotizaciones y velas simuladas (`marketService.js` fallback con reintento `.SN`, badge "Modo Simulado") |

---

## Seguridad (reglas NO negociables)

1. **El cliente JAMÁS envía `user_id`**: la columna tiene `DEFAULT auth.uid()` y RLS valida con `WITH CHECK`. Al insertar desde `useTransactions.js` nunca incluir ese campo.
2. **Service role key solo en `backend/.env`**, jamás en `frontend/.env`. `vite.config.js` usa `envPrefix: ['SUPABASE_URL', 'SUPABASE_ANON_KEY']` (prefijos exactos) para garantizar que ninguna otra variable llegue al bundle.
3. Proxy Yahoo: `interval` y `range` pasan por allowlist (`ALLOWED_INTERVALS`/`ALLOWED_RANGES` en `api/yahoo.js`) antes de interpolar en la URL upstream.
4. `.env` está gitignored; solo existen `.env.example` documentativos.

---

## Base de Datos (Supabase)

### Tabla `tgi_inversiones` (diario de operaciones)

```sql
id          -- PK (en producción actual: integer serial)
user_id     -- UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
nemotecnico VARCHAR(20) NOT NULL        -- ticker con sufijo de bolsa, ej: QUINENCO.SN, AAPL
tipo        VARCHAR(10) CHECK IN ('COMPRA','VENTA')
cantidad    NUMERIC(12,6)
precio      NUMERIC(12,2)
fecha_ing   DATE DEFAULT CURRENT_DATE
notas       TEXT
```

RLS habilitado: política única FOR ALL `USING (auth.uid() = user_id) WITH CHECK (...)`. Índices: `(user_id, fecha_ing DESC)` y `(nemotecnico)`.

### Tabla `watchlist`

Tickers seguidos por usuario (`user_id DEFAULT auth.uid()`, `ticker`, `UNIQUE(user_id, ticker)`), misma política RLS.

⚠️ Si una tabla fue creada manualmente sin políticas, aplicar `backend/supabase/fix-rls-tabla-existente.sql`. Instalaciones nuevas usan `schema.sql`.

### Convención de idioma de campos (CRÍTICO)

Los campos van SIEMPRE en español y esa misma forma se usa en todo el frontend: `nemotecnico`, `tipo`, `cantidad`, `precio`, `fecha_ing`, `notas`. Los mocks (`MOCK_TRANSACTIONS` en `mockData.js`) deben respetarla exactamente — históricamente hubo un bug por mocks en inglés (`ticker/shares/date`) que rompía tablas y cálculos.

---

## Estructura del Proyecto

```
web_gestion_inversion_v1/
├── vercel.json                       # builds: static-build frontend + @vercel/node backend/api
├── package.json                      # workspaces raíz (dev/build/api/start)
├── backend/
│   ├── api/yahoo.js                  # ÚNICO endpoint backend: proxy Yahoo (quotes + candles)
│   ├── supabase/schema.sql           # Esquema completo + RLS + índices
│   ├── supabase/seed.sql             # Datos de ejemplo (reemplazar <USER_UUID>)
│   ├── supabase/fix-rls-tabla-existente.sql  # Parche RLS para tablas creadas a mano
│   └── .env                          # SUPABASE_URL, SERVICE_ROLE_KEY, ANON_KEY, FRONTEND_URL, PORT
├── frontend/
│   ├── index.html                    # Título/meta: Gestión_Inversiones.v.1.0
│   ├── vite.config.js                # alias @→src, envPrefix exacto, proxy dev /api→:3001
│   ├── tailwind.config.js            # fuentes Inter/JetBrains Mono
│   ├── .env                          # SOLO SUPABASE_URL y SUPABASE_ANON_KEY
│   └── src/
│       ├── main.jsx                  # Entry + AuthProvider
│       ├── App.jsx                   # Gate de sesión, watchTickers (memo), tabs
│       ├── context/AuthContext.jsx   # Sesión Supabase global
│       ├── hooks/
│       │   ├── useMarketData.js      # precios+velas+sync (ref sincronizado en useEffect)
│       │   ├── useTransactions.js    # CRUD tgi_inversiones (sin user_id en insert)
│       │   ├── usePortfolio.js       # posiciones consolidadas (COMPRA/VENTA)
│       │   └── useProjection.js      # interés compuesto 36 meses
│       ├── services/marketService.js # fetch /api/yahoo con fallback simulado
│       ├── data/mockData.js          # MOCK_MARKET_DATA, MOCK_TRANSACTIONS (forma española), MONTHLY_PERFORMANCE, ANNUAL_SUMMARY
│       ├── data/codeSnippets.js      # snippets mostrados en SkillsPage (mantener sincronizados con schema.sql)
│       ├── lib/supabaseClient.js     # cliente + isSupabaseConfigured + onAuthStateChange
│       ├── lib/formatters.js         # formatUSD, formatSignedUSD, todayISO, currentTime
│       ├── components/{layout,charts,portfolio,transactions,performance,projection,ui}/
│       └── pages/                    # LoginPage + PortfolioPage + TransactionsPage + PerformancePage + ProjectionPage + SkillsPage
└── dashboard_inversiones_yahoo_finance.tsx  # prototipo de referencia (NO forma parte del build)
```

---

## Flujo de datos clave

1. **Carga de transacciones**: `useTransactions` → SELECT ordenado por `fecha_ing DESC` → reemplaza los mocks (aunque venga vacío).
2. **Sync de mercado**: botón Header → `App.jsx` llama `market.syncQuotes(watchTickers)` donde `watchTickers` = nemotécnicos únicos de `tgi_inversiones` → `fetchQuotes(prices, extras)` hace merge de cotizaciones (nunca reemplaza en bloque).
3. **Selector "Seleccionar Activo"** (`PortfolioPage`): lista primero los activos del portafolio real, luego los del mercado simulado.
4. **Portafolio**: `usePortfolio` consolida COMPRA (+) / VENTA (−) sobre holdings por `nemotecnico`; filtra `shares > 0`.
5. **Serie histórica**: cambiar ticker → `fetchCandles(ticker)` alimenta el gráfico lineal; si Yahoo falla → reintento con sufijo `.SN` → velas simuladas como último recurso. Tickers chilenos requieren sufijo `.SN` (ej: `QUINENCO.SN`, `CENCOSUD.SN`); los registrados sin él se autocorrigen en `marketService.js`.

---

## Variables de Entorno

### Frontend (`frontend/.env`)
| Variable | Descripción |
|----------|-------------|
| `SUPABASE_URL` | URL del proyecto Supabase (sin prefijo VITE_; expuesta vía `envPrefix`) |
| `SUPABASE_ANON_KEY` | Anon key (pública por diseño; la seguridad es RLS) |

### Backend (`backend/.env`)
| Variable | Descripción |
|----------|-------------|
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ Nunca exponer al frontend ni commitear |
| `SUPABASE_ANON_KEY` | Anon key |
| `FRONTEND_URL` | Origen permitido (default `http://localhost:5173`) |
| `PORT` | Puerto local del API (default 3001) |

En Vercel añadir además las del frontend como variables de proyecto.

---

## Comandos

```bash
npm install              # instala ambos workspaces
npm run api              # Terminal 1 — API proxy en :3001 (node --watch)
npm run dev              # Terminal 2 — Vite en :5173 (proxia /api → :3001)
npm run build            # build de producción en frontend/dist/
npm run preview          # sirve el build localmente

# Verificación de salud del código
npm run build && npx react-doctor . -y --no-telemetry
```

No hay linter ni tests automatizados: validar cambios con `npm run build` + smoke test manual del stack completo (dev + API levantados).

---

## Convenciones de Código

- Archivos: componentes en PascalCase (`HoldingsSidebar.jsx`); hooks/services/utils en camelCase.
- Constantes: UPPER_SNAKE_CASE. Variables/funciones: camelCase.
- Indentación 2 espacios. Imports absolutos con alias `@/` (configurado en vite + jsconfig).
- Tailwind utility classes inline (sin CSS modules). `index.css` solo utilities propias.
- Comentarios: solo cuando explican una decisión no obvia (seguridad, RLS, fallback).
- Componentes nuevos: revisar primero `components/ui/Card.jsx` y patrones existentes; no duplicar estilos.
- Estado derivado: preferir `useMemo`; efectos con cleanup (`cancelled`) cuando lanzan async.

---

## React Doctor — Estado Actual (agosto 2026)

Última pasada completa: **0 errores**, 17 warnings documentados:

| Regla | Cantidad | Estado |
|-------|----------|--------|
| `no-transition-all` | 5 | Aceptado temporal (cambiar a transition-colors/opacity al tocar esos archivos) |
| `js-combine-iterations` | 2 | Aceptado (arrays pequeños, impacto nulo) |
| `control-has-associated-label` | 4 | Pendiente UX/a11y |
| `no-placeholder-only-field` | 5 | Pendiente UX/a11y |
| `artifact-baas-authority-surface` | 1 | Falso positivo: anon key en bundle es pública por diseño (seguridad = RLS) |

Corregidos en esta versión (no regresar atrás): mutación de ref en render (`useMarketData`), envío de `user_id` desde cliente, export muertos (`formatSignedPercent`, `getSession`), lazy init de estado, inyección de params en proxy Yahoo.

Al hacer cambios: correr diagnóstico y no introducir nuevos errores.

---

## Historial de Versiones

| Versión | Cambios |
|---------|---------|
| 1.0 | Release inicial. Limpieza basada en React Doctor (2 errores → 0). Seguridad: user_id con DEFAULT auth.uid() + RLS, service role fuera del bundle (envPrefix exacto), allowlist interval/range en proxy. Fix de datos: mocks normalizados a forma española (nemotecnico/tipo/cantidad/...), fix crash TransactionsPage y usePortfolio en ventas. Selector de activo alimentado por tgi_inversiones + sync de cotizaciones de activos propios. Rebranding a Gestión_Inversiones.v.1.0. Paleta migrada verde→azul. |
