# InvestPro Hub — Gestión de Inversiones

Dashboard de gestión de portafolio con cotizaciones en vivo de Yahoo Finance, gráfico de velas japonesas (OHLCV), registro diario de operaciones, rendimiento mensual/anual y simulador de interés compuesto a 3 años.

**Stack:** React 19 · Vite 8 · Tailwind CSS 3 · Express 5 (serverless) · Supabase (Auth + PostgreSQL) · Despliegue en Vercel

**Organización:** monorepo con npm workspaces — `frontend/` (SPA React) y `backend/` (API proxy + base de datos).

---

## Estructura del proyecto

```
web_gestion_inversion_v1/
├── frontend/                          # ── FRONTEND (React + Vite + Tailwind) ──
│   ├── index.html                     # Plantilla SPA
│   ├── vite.config.js                 # Alias @ → src/ + proxy dev /api → :3001
│   ├── tailwind.config.js             # Tema (fuentes Inter / JetBrains Mono)
│   ├── postcss.config.js              # Tailwind + Autoprefixer
│   ├── jsconfig.json                  # IntelliSense del alias @
│   ├── .env.example                   # Variables VITE_SUPABASE_*
│   ├── package.json                   # Dependencias del frontend
│   └── src/
│       ├── main.jsx                   # Entry point + AuthProvider
│       ├── App.jsx                    # Orquestador: gate de sesión, estado global y tabs
│       ├── index.css                  # Directivas Tailwind + utilidades propias
│       ├── components/
│       │   ├── layout/Header.jsx          # Marca, sync, usuario/logout y tabs
│       │   ├── charts/CandlestickChart.jsx# Gráfico de velas SVG interactivo
│       │   ├── portfolio/                 # StatCard, HoldingsSidebar, PositionsTable
│       │   ├── transactions/              # NewTransactionModal, TransactionsTable
│       │   ├── performance/               # MonthlyPerformanceGrid
│       │   ├── projection/                # ProjectionControls, ProjectionBarChart
│       │   └── ui/Card.jsx                # Panel contenedor reutilizable
│       ├── pages/                     # LoginPage + una página por pestaña
│       ├── context/AuthContext.jsx    # Sesión global: signIn · signUp · signOut
│       ├── hooks/
│       │   ├── useMarketData.js       # Cotizaciones + velas + sync Yahoo (fallback simulado)
│       │   ├── usePortfolio.js        # Posiciones consolidadas y métricas agregadas
│       │   ├── useTransactions.js     # CRUD con Supabase ligado al usuario (fallback local)
│       │   └── useProjection.js       # Simulador de interés compuesto (36 meses)
│       ├── services/marketService.js  # Cliente HTTP del proxy /api/yahoo
│       ├── lib/
│       │   ├── supabaseClient.js      # Cliente Supabase + helpers de sesión
│       │   └── formatters.js          # Formateo USD / % / fechas
│       ├── data/mockData.js           # Datos simulados (modo local)
│       └── constants/navigation.js    # Definición de pestañas
├── backend/                           # ── BACKEND (Express serverless + BD) ──
│   ├── api/yahoo.js                   # Proxy a Yahoo Finance (Vercel Function):
│   │                                  #   GET /api/yahoo/candles/:ticker?interval&range
│   │                                  #   GET /api/yahoo/quotes?tickers=AAPL,NVDA
│   ├── supabase/schema.sql            # Tablas transactions + watchlist, RLS e índices
│   ├── supabase/seed.sql              # Datos de ejemplo
│   ├── .env.example                   # PORT local
│   └── package.json                   # Dependencias del backend (Express)
├── vercel.json                        # Despliegue monorepo: build frontend/ + funciones backend/api/
├── .gitignore
└── package.json                       # Orquestador raíz (npm workspaces)
```

## Puesta en marcha

```bash
npm install                 # instala frontend y backend (workspaces)
cp frontend/.env.example frontend/.env   # opcional: Supabase para persistencia real
cp backend/.env.example backend/.env     # opcional: puerto del API

# Terminal 1 — API proxy de Yahoo Finance (http://localhost:3001)
npm run api

# Terminal 2 — Frontend con HMR (http://localhost:5173, proxía /api → :3001)
npm run dev
```

> Sin el backend levantado la app sigue funcionando: los datos se simulan localmente (badge "Modo Simulado").

### Scripts raíz (workspaces)

| Comando            | Acción                                                    |
| ------------------ | --------------------------------------------------------- |
| `npm run dev`      | Servidor de desarrollo Vite (delega en `frontend/`)        |
| `npm run build`    | Build de producción del frontend en `frontend/dist/`       |
| `npm run preview`  | Sirve el build de producción localmente                    |
| `npm run api`      | API Express con auto-reload (`node --watch`, puerto 3001)  |

También puedes ejecutar cada capa de forma independiente:

```bash
cd frontend && npm install && npm run dev    # solo frontend
cd backend  && npm install && npm start      # solo backend
```

## Configuración de Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Ejecuta `backend/supabase/schema.sql` en el SQL Editor.
3. Copia `frontend/.env.example` a `frontend/.env` y completa:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. (Opcional) Inserta datos de prueba con `backend/supabase/seed.sql`, reemplazando `<USER_UUID>`.

**Nota:** las tablas usan RLS ligado a `auth.uid()`. El flujo de autenticación ya está integrado: `AuthProvider` + `LoginPage` (email/contraseña con registro, login, logout y errores traducidos). Cada transacción se inserta con su `user_id` y solo es visible para su dueño. Si Supabase no está configurado, la app corre en modo local sin login.

## Despliegue en Vercel

1. Sube el repositorio a GitHub y crea un proyecto en Vercel (**Root Directory = raíz del repo**, sin preset manual: `vercel.json` lo define todo).
2. Añade las variables de entorno del frontend: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. Deploy. La configuración monorepo compila el frontend (`frontend/dist/`) y publica `backend/api/*.js` como funciones serverless:
   - `GET /api/yahoo/candles/:ticker?interval=1d&range=1mo`
   - `GET /api/yahoo/quotes?tickers=AAPL,NVDA`
# weg_gestion_inversion_v1
