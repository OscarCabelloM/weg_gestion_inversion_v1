# AGENTS.md — Gestión_Inversiones.v.1.7

Guía para agentes de código y desarrolladores. Toda modificación debe respetar este documento.

## Rol

Eres un desarrollador fullstack senior especializado en React, Tailwind CSS y Supabase. Priorizas: seguridad de las credenciales del cliente, consistencia con la forma española de la base de datos, y no romper la arquitectura de componentes existente.

---

## Descripción del Proyecto

Dashboard de gestión de portafolio de inversiones: gráfico lineal SVG puro, registro diario de operaciones (compras/ventas) persistido en Supabase con RLS por usuario, y rendimiento mensual/anual.

- **Nombre UI:** Gestión_Inversiones.v.1.7
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

### Mensajes (Toasts/Notificaciones)

Fondo translúcido del color semántico + borde fino con la misma tinta + **texto en color blanco** + **icono (logo)** descriptivo.

- Éxito / informativo → azul + icono `CheckCircle2`: `bg-blue-500/10 border border-blue-500/30 text-white`
- Error → rose + icono `AlertCircle`: `bg-rose-500/10 border border-rose-500/30 text-white`

Estructura siempre con flex + icono a la izquierda (`shrink-0`) y texto en `<span>`. Aplicar SIEMPRE a toasts, banners y confirmaciones y nunca colores sólidos en estos mensajes. Combinar con la convención de texto (oraciones completas, punto final).

### Gráficos (línea SVG)

- Línea de valorización (cantidad × precio de cierre): `#3b82f6` con relleno degradado azul→transparente (`lineChartFill`)
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
└── Mercado ───────────► marketService.js (proxy Yahoo /api/yahoo)
```

**NO existe backend intermediario.** El cliente habla directo con Supabase usando la anon key; la seguridad la garantiza RLS (`auth.uid() = user_id`). Las cotizaciones y velas provienen del proxy Yahoo `/api/yahoo`; si falla se devuelven estructuras vacías.

### Modos de operación

| Condición | Modo |
|-----------|------|
| `.env` con Supabase configurado | Login obligatorio + persistencia real en `tgi_inversiones` |
| Sin Supabase configurado | Modo local abierto en memoria (sin datos persistentes) |

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
tipo        VARCHAR(10) CHECK IN ('COMPRA','VENTA','DIVIDENDO','COMISION')
mercado     TEXT                        -- NACIONAL / INTERNACIONAL / CRYPTO
cantidad    NUMERIC(12,6)
precio      NUMERIC(12,2)
fecha_ing   DATE DEFAULT CURRENT_DATE
notas       TEXT
```

RLS habilitado: política única FOR ALL `USING (auth.uid() = user_id) WITH CHECK (...)`. Índices: `(user_id, fecha_ing DESC)` y `(nemotecnico)`.

> **Migración pendiente en producción (Supabase SQL Editor):** ampliar el CHECK de `tipo` para aceptar los nuevos tipos:
>
> ```sql
> ALTER TABLE tgi_inversiones DROP CONSTRAINT IF EXISTS tgi_inversiones_tipo_check;
> ALTER TABLE tgi_inversiones ADD CONSTRAINT tgi_inversiones_tipo_check
>   CHECK (tipo IN ('COMPRA','VENTA','DIVIDENDO','COMISION'));
> ```
>
> Sin esta migración, el INSERT de DIVIDENDO/COMISION falla con violación de constraint.
>
> ```sql
> ALTER TABLE tgi_inversiones DROP CONSTRAINT IF EXISTS tgi_inversiones_tipo_check;
> ALTER TABLE tgi_inversiones ADD CONSTRAINT tgi_inversiones_tipo_check
>   CHECK (tipo IN ('COMPRA','VENTA','DIVIDENDO','COMISION'));
> ```

### Tabla `watchlist`

Tickers seguidos por usuario (`user_id DEFAULT auth.uid()`, `ticker`, `UNIQUE(user_id, ticker)`), misma política RLS.

### Tabla `tgi_nemotecnico` (catálogo de tickers)

Catálogo de nemotécnicos disponibles para el usuario, usado para alimentar el selector de ticker del registro diario y del modal de operaciones.

```sql
create table public.tgi_nemotecnico (
  id serial not null,
  user_id uuid null default auth.uid(),
  nemotecnico character varying(20) not null,
  mercado text null,
  constraint tgi_nemotecnico_pkey primary key (id),
  constraint tgi_nemotecnico_user_id_fkey foreign key (user_id)
    references auth.users (id) on delete cascade
);

create index if not exists idx_tgi_nemotecnico_nemotecnico
  on public.tgi_nemotecnico using btree (nemotecnico);
```

- Consumido por el hook `useNemotecnicos` (`hooks/useNemotecnicos.js`): carga `SELECT id, nemotecnico, mercado` ordenado y combina con los nemotécnicos de las operaciones. Las mutaciones (`addNemotecnico`/`updateNemotecnico`) envían `mercado` (null si viene vacío). El campo `mercado` se selecciona con un dropdown en el modal con las opciones `NACIONAL`, `INTERNACIONAL` y `CRYPTO`.
- El selector debe permitir escribir un ticker nuevo (combobox con `datalist`), sin insertar automáticamente en `tgi_nemotecnico`.
- El modal `ManageNemotecnicosModal` permite capturar el mercado al agregar/editar y lo muestra bajo el ticker en el listado; el listado "Nemotécnicos Existentes" se agrupa por mercado (orden NACIONAL → INTERNACIONAL → CRYPTO → Sin mercado).

### Convención de idioma de campos (CRÍTICO)

Los campos van SIEMPRE en español y esa misma forma se usa en todo el frontend: `nemotecnico`, `tipo`, `mercado`, `cantidad`, `precio`, `fecha_ing`, `notas`.

---

## Estructura del Proyecto

```
web_gestion_inversion_v1/
├── vercel.json                       # build: static-build frontend
├── package.json                      # workspaces raíz (dev/build/preview)
├── frontend/
│   ├── index.html                    # Título/meta: Gestión_Inversiones.v.1.7
│   ├── vite.config.js                # alias @→src, envPrefix exacto
│   ├── tailwind.config.js            # fuentes Inter/JetBrains Mono
│   ├── .env                          # SOLO SUPABASE_URL y SUPABASE_ANON_KEY
│   └── src/
│       ├── main.jsx                  # Entry + AuthProvider
│       ├── App.jsx                   # Gate de sesión, watchTickers (memo), tabs
│       ├── context/AuthContext.jsx   # Sesión Supabase global
│       ├── hooks/
│       │   ├── useMarketData.js      # precios+velas+sync (proxy Yahoo)
│       │   ├── useTransactions.js    # CRUD tgi_inversiones (sin user_id en insert)
│       │   ├── usePortfolio.js       # posiciones consolidadas (COMPRA/VENTA)
│       │   └── useNemotecnicos.js    # catálogo tgi_nemotecnico (selector de ticker)
│       ├── services/marketService.js # proxy Yahoo (cotizaciones + velas)
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
- Mensajes de UI (toasts, errores, confirmaciones): siempre oraciones completas en español, tono claro, **terminadas en punto**. Prefijo de acción + verbo conjugado: `El nemotécnico AAPL ha sido agregado correctamente.` / `No se pudo guardar el nemotécnico.` (ver `LoginPage.jsx` como referencia). Evitar frases sin verbo o sin punto.

---

## React Doctor — Estado Actual (agosto 2026)

Última pasada completa (react-doctor 0.9.12): **0 errores**, **1 warning** (falso positivo). Score global 59 (el único warning es de categoría Security P2).

| Regla | Cantidad | Estado |
|-------|----------|--------|
| `artifact-baas-authority-surface` | 1 | Falso positivo: anon key + nombres de tablas en el bundle son públicos por diseño (seguridad = RLS server-side). No modificable sin romper arquitectura. |

Optimizaciones/limpieza ya aplicadas en esta pasada (17 warnings → 1):
- `js-tosorted-immutable` (2): `[...arr].sort()` → `arr.toSorted()` (`usePortfolio.js`, `PositionsTable.jsx`).
- `js-flatmap-filter` (1): `.map().filter(Boolean)` → `.flatMap()` (`useNemotecnicos.js`).
- `exhaustive-deps` (4): `isSupabaseConfigured` (constante de módulo) removido de arrays de deps de `useMemo`/`useCallback` (`useNemotecnicos.js`).
- `no-adjust-state-on-prop-change` + `no-reset-all-state-on-prop-change` (5): reset de estado de modales vía `key` en App.jsx en vez de `useEffect` (`NewTransactionModal.jsx`, `ManageNemotecnicosModal.jsx`).

Al hacer cambios: correr diagnóstico y no introducir nuevos errores.

---

## Historial de Versiones

| Versión | Cambios |
|---------|---------|
| 1.0 | Release inicial. Limpieza basada en React Doctor (2 errores → 0). Seguridad: user_id con DEFAULT auth.uid() + RLS, envPrefix exacto. Fix de datos: mocks normalizados a forma española, fix crash TransactionsPage y usePortfolio en ventas. Selector de activo alimentado por tgi_inversiones. Rebranding a Gestión_Inversiones.v.1.0. Paleta migrada verde→azul. Gráfico de velas reemplazado por gráfico lineal. Columna "Valorización Inicial" agregada. Click en activo para cambiar gráfico. Eliminación de página Proyección y backend Express. React Doctor: 17→14 warnings. |
| 1.2 | Rebranding a Gestión_Inversiones.v.1.2. Posiciones cerradas visibles con P&L realizado vía regla "Venta Total, precio $XX" en notas (CENCOSUD.SN). Consolidación cronológica en usePortfolio (sort por fecha_ing asc; useTransactions entrega DESC). Backend Express Yahoo restaurado (`backend/api/yahoo.js`, proxy `/api/yahoo`) con autocuración `.SN` y fallback simulado. React Doctor instalado como devDependency (`npm run doctor`). Auditoría dead-code: middleware `express.json` removido, favicon verde→azul, copys obsoletos actualizados. |
| 1.2.2 | Tipos de orden `DIVIDENDO` y `COMISION`: modal, registro diario (badges morado/ámbar), filtro, columna "Dividendos" en posiciones y suma al P&L como ganancia. Gráfico lineal ahora grafica valorización (cantidad × cierre del día) en vez de precio por acción; simulación anclada al cierre actual. Formato numérico es-CL: miles `.`, decimales `,`; montos sin decimales salvo Precio Actual (`formatPercent` nuevo). Formateo en vivo de montos en el modal de operaciones. Resumen (tfoot) al final de la tabla de posiciones. Migración CHECK `tipo` documentada (pendiente ejecutar en Supabase). |
| 1.2.3 | Gráfico: 6 meses de datos semanales (último día hábil × cantidad de acciones). Precio Promedio ahora muestra costo promedio de compra también en posiciones cerradas. Cantidad con separación de miles (es-CL). Columnas numéricas alineadas a la derecha. |
| 1.2.4 | Tabla `tgi_nemotecnico`: nuevo campo `mercado` (select/id/insert/update en `useNemotecnicos`, campo de formulario + visualización en `ManageNemotecnicosModal`). Posiciones Activas: columna "Total Valorización Acción" (= sumatoria Valorización Actual), renombrados "Inversión Inicial" y "Ganancias Acciones", columnas reordenadas (Inversión Inicial → Ganancias Acciones → Dividendos → Comisiones → Valorización Actual), títulos de cabecera centrados. Posiciones Cerradas: glosas "Cantidad", "Inversión Inicial" y "Valorización Venta", nueva columna "Comisiones", P&L por fila y total = valorización venta − inversión inicial + dividendos − comisiones. Card "Total Valorización Actual + Dividendos" → "Total Portfolio" (valor = sumatoria de Valorización Actual) en Portfolio y Distribución de Cartera. Build ✅ y React Doctor 0 errores / 1 warning (falso positivo). |
