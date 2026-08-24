# AGENTS.md — Gestión_Inversiones.v.1.2

Guía para agentes de código y desarrolladores. Toda modificación debe respetar este documento.

## Rol

Eres un desarrollador fullstack senior especializado en React, Tailwind CSS y Supabase. Priorizas: seguridad de las credenciales del cliente, consistencia con la forma española de la base de datos, y no romper la arquitectura de componentes existente.

---

## Descripción del Proyecto

Dashboard de gestión de portafolio de inversiones: gráfico lineal SVG puro, registro diario de operaciones (compras/ventas) persistido en Supabase con RLS por usuario, y rendimiento mensual/anual.

- **Nombre UI:** Gestión_Inversiones.v.1.2
- **Stack:** React 19 + Vite 8 + Tailwind CSS 3 + Supabase (Auth directo + PostgreSQL)
- **Despliegue:** Vercel — SPA estática (`frontend/`)

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
| Pérdidas / P&L negativo / peligro | `rose-400` / `rose-500` (`#ef4444`) |
| Advertencia / variación día | `amber-400` |
| Contadores / badges informativos | `purple-400` |

Reglas:
1. Ganancias = azul, pérdidas = rose. NUNCA usar verde como color de acento.
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

Sutiles y nombradas por propiedad. Preferir `transition-colors` / `transition-opacity` sobre `transition-all`.

### Responsive

Mobile-first con breakpoints `sm:` / `lg:`. Grids principales: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`. Debe verse correcto desde 384px.

---

## Arquitectura

```
React SPA (frontend/)
├── Datos de negocio ──► supabase-js DIRECTO (anon key) ──► PostgreSQL con RLS
├── Auth ──────────────► supabase.auth (signIn/signUp/signOut desde el cliente)
└── Mercado ───────────► marketService.js (datos simulados localmente)
```

**NO existe backend intermediario.** El cliente habla directo con Supabase usando la anon key; la seguridad la garantiza RLS (`auth.uid() = user_id`). Las cotizaciones y velas se generan localmente con datos simulados.

### Modos de operación

| Condición | Modo |
|-----------|------|
| `.env` con Supabase configurado | Login obligatorio + persistencia real en `tgi_inversiones` |
| Sin Supabase configurado | Modo local abierto con `MOCK_TRANSACTIONS` |

---

## Seguridad (reglas NO negociables)

1. **El cliente JAMÁS envía `user_id`**: la columna tiene `DEFAULT auth.uid()` y RLS valida con `WITH CHECK`. Al insertar desde `useTransactions.js` nunca incluir ese campo.
2. **Service role key solo en `backend/.env`** (si se restaura backend), jamás en `frontend/.env`. `vite.config.js` usa `envPrefix: ['SUPABASE_URL', 'SUPABASE_ANON_KEY']` (prefijos exactos).
3. `.env` está gitignored; solo existen `.env.example` documentativos.

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

### Convención de idioma de campos (CRÍTICO)

Los campos van SIEMPRE en español y esa misma forma se usa en todo el frontend: `nemotecnico`, `tipo`, `cantidad`, `precio`, `fecha_ing`, `notas`. Los mocks (`MOCK_TRANSACTIONS` en `mockData.js`) deben respetarla exactamente.

---

## Estructura del Proyecto

```
web_gestion_inversion_v1/
├── vercel.json                       # build: static-build frontend
├── package.json                      # workspaces raíz (dev/build/preview)
├── frontend/
│   ├── index.html                    # Título/meta: Gestión_Inversiones.v.1.2
│   ├── vite.config.js                # alias @→src, envPrefix exacto
│   ├── tailwind.config.js            # fuentes Inter/JetBrains Mono
│   ├── .env                          # SOLO SUPABASE_URL y SUPABASE_ANON_KEY
│   └── src/
│       ├── main.jsx                  # Entry + AuthProvider
│       ├── App.jsx                   # Gate de sesión, watchTickers (memo), tabs
│       ├── context/AuthContext.jsx   # Sesión Supabase global
│       ├── hooks/
│       │   ├── useMarketData.js      # precios+velas+sync (simulados)
│       │   ├── useTransactions.js    # CRUD tgi_inversiones (sin user_id en insert)
│       │   └── usePortfolio.js       # posiciones consolidadas (COMPRA/VENTA)
│       ├── services/marketService.js # datos simulados (cotizaciones + velas)
│       ├── data/mockData.js          # MOCK_MARKET_DATA, MOCK_TRANSACTIONS, MONTHLY_PERFORMANCE, ANNUAL_SUMMARY
│       ├── lib/supabaseClient.js     # cliente + isSupabaseConfigured + onAuthStateChange
│       ├── lib/formatters.js         # formatUSD, formatSignedUSD, todayISO, currentTime
│       ├── components/{layout,charts,portfolio,transactions,performance,ui}/
│       └── pages/                    # LoginPage + PortfolioPage + TransactionsPage + PerformancePage
└── dashboard_inversiones_yahoo_finance.tsx  # prototipo de referencia (NO forma parte del build)
```

---

## Flujo de datos clave

1. **Carga de transacciones**: `useTransactions` → SELECT ordenado por `fecha_ing DESC` → reemplaza los mocks (aunque venga vacío).
2. **Sync de mercado**: botón Header → `App.jsx` llama `market.syncQuotes(watchTickers)` donde `watchTickers` = nemotécnicos únicos de `tgi_inversiones` → `fetchQuotes(prices, extras)` genera cotizaciones simuladas.
3. **Click en activo**: en PositionsTable, clickear el nombre de un activo cambia el gráfico lineal.
4. **Portafolio**: `usePortfolio` consolida COMPRA (+) / VENTA (−) sobre holdings por `nemotecnico`; filtra `shares > 0`.
5. **Serie histórica**: `fetchCandles(ticker)` genera velas simuladas para el gráfico lineal.

---

## Variables de Entorno

### Frontend (`frontend/.env`)
| Variable | Descripción |
|----------|-------------|
| `SUPABASE_URL` | URL del proyecto Supabase (sin prefijo VITE_; expuesta vía `envPrefix`) |
| `SUPABASE_ANON_KEY` | Anon key (pública por diseño; la seguridad es RLS) |

---

## Comandos

```bash
npm install              # instala workspaces
npm run dev              # Vite en :5173
npm run build            # build de producción en frontend/dist/
npm run preview          # sirve el build localmente

# Verificación de salud del código
npm run build && npx react-doctor . -y --no-telemetry
```

No hay linter ni tests automatizados: validar cambios con `npm run build` + smoke test manual.

---

## Convenciones de Código

- Archivos: componentes en PascalCase (`HoldingsSidebar.jsx`); hooks/services/utils en camelCase.
- Constantes: UPPER_SNAKE_CASE. Variables/funciones: camelCase.
- Indentación 2 espacios. Imports absolutos con alias `@/` (configurado en vite + jsconfig).
- Tailwind utility classes inline (sin CSS modules). `index.css` solo utilities propias.
- Comentarios: solo cuando explican una decisión no obvia.
- Componentes nuevos: revisar primero `components/ui/Card.jsx` y patrones existentes; no duplicar estilos.
- Estado derivado: preferir `useMemo`; efectos con cleanup (`cancelled`) cuando lanzan async.

---

## React Doctor — Estado Actual (agosto 2026)

Última pasada completa: **0 errores**, 14 warnings documentados:

| Regla | Cantidad | Estado |
|-------|----------|--------|
| `no-transition-all` | 4 | Aceptado temporal (cambiar a transition-colors/opacity al tocar esos archivos) |
| `js-combine-iterations` | 1 | Aceptado (array pequeño, impacto nulo) |
| `control-has-associated-label` | 3 | Pendiente UX/a11y |
| `no-placeholder-only-field` | 5 | Pendiente UX/a11y |
| `artifact-baas-authority-surface` | 1 | Falso positivo: anon key en bundle es pública por diseño (seguridad = RLS) |

Al hacer cambios: correr diagnóstico y no introducir nuevos errores.

---

## Historial de Versiones

| Versión | Cambios |
|---------|---------|
| 1.0 | Release inicial. Limpieza basada en React Doctor (2 errores → 0). Seguridad: user_id con DEFAULT auth.uid() + RLS, envPrefix exacto. Fix de datos: mocks normalizados a forma española, fix crash TransactionsPage y usePortfolio en ventas. Selector de activo alimentado por tgi_inversiones. Rebranding a Gestión_Inversiones.v.1.0. Paleta migrada verde→azul. Gráfico de velas reemplazado por gráfico lineal. Columna "Valorización Inicial" agregada. Click en activo para cambiar gráfico. Eliminación de página Proyección y backend Express. React Doctor: 17→14 warnings. |
| 1.2 | Rebranding a Gestión_Inversiones.v.1.2. Posiciones cerradas visibles con P&L realizado vía regla "Venta Total, precio $XX" en notas (CENCOSUD.SN). Consolidación cronológica en usePortfolio (sort por fecha_ing asc; useTransactions entrega DESC). Backend Express Yahoo restaurado (`backend/api/yahoo.js`, proxy `/api/yahoo`) con autocuración `.SN` y fallback simulado. React Doctor instalado como devDependency (`npm run doctor`). Auditoría dead-code: middleware `express.json` removido, favicon verde→azul, copys obsoletos actualizados. |
