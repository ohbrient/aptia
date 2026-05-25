# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Aptia is a multi-tenant psychometric evaluation platform for HR companies in Latin America. It manages recruitment processes, psychometric candidate evaluations, and AI-generated reports. The codebase is in Spanish (variable names, comments, UI copy, route names).

---

## Development Commands

### Backend (port 4000)
```bash
cd backend && npm install
npm run dev     # nodemon with auto-reload
npm start       # production
```

### Frontend (port 5173)
```bash
cd frontend && npm install
npm run dev     # Vite dev server (proxies /api → localhost:4000)
npm run build   # production build
npm run preview # preview production build
```

### Database setup
```bash
psql -U postgres -c "CREATE DATABASE aptia;"
psql -U postgres -d aptia -f backend/aptia_schema.sql
# Optional seeds:
node seed_banco_pruebas.js          # Populate psychometric test bank
node asignar_pruebas_rrhh.js        # Assign tests to RRHH companies
```

There are no automated tests or linters configured.

---

## Architecture

### 4-Tier Multi-Tenant Hierarchy

```
Superadmin
  └── Empresa RRHH (recruitment agency)
        ├── Empresa Cliente (client company)
        └── Candidato (accessed via unique token, no auth account)
```

Each tier has its own auth and its own route namespace:
- Superadmin → `/api/superadmin/*`
- RRHH → `/api/rrhh/*`
- Empresa cliente → `/api/empresa/*`
- Candidate portal → `/api/prueba/*`, `/api/clima/*`, `/api/eval360/*`

### Backend

`backend/server.js` mounts routers and enables CORS. Route files contain all business logic — there is no separate service layer except for `licensingService.js`.

`backend/middleware/auth.js` exports two middleware functions:
- `verificarToken` — validates JWT from `Authorization: Bearer <token>`, attaches `req.usuario`
- `checkRol(...roles)` — role gate applied per-router

Routes use direct `pool.query()` calls (`backend/db/index.js`) — there is no ORM.

### Frontend

`frontend/src/main.jsx` wraps the app in `AuthProvider`, `QueryClientProvider` (staleTime: 30s, retry: 1), and `BrowserRouter`.

`frontend/src/services/api.js` is the **single Axios instance** used everywhere — it injects JWT from `localStorage` and redirects to `/login` on 401. Never create a second Axios instance.

`frontend/src/context/AuthContext.jsx` manages `token` and `usuario` state, stores in `localStorage`, provides `login()` and `logout()`.

`frontend/src/App.jsx` defines all routes. Protected routes use a `PrivateRoute` component that checks `usuario.rol` against the expected role (`superadmin`, `rrhh`, `empresa`). Candidates access their portal via public routes at `/evaluacion/:token`, `/clima/:token`, and `/eval360/:token`.

`frontend/src/hooks/useLogActividad.js` automatically fires a POST to log navigation events on route change — import and invoke it in dashboard layouts.

### Candidate Evaluation Portal (Anti-Cheat)

`frontend/src/pages/prueba/PruebaPage.jsx` enforces:
- Fullscreen mandatory (Fullscreen API, forced on start)
- Tab/window focus loss detection — after 3 violations, evaluation is auto-submitted
- Per-question 90-second countdown timer
- State is held in React local state; each answer is saved immediately via API call

### Licensing System

Licenses are JWT-signed JSON files, not database tokens. Flow:
1. Superadmin creates a license record in `licencias` table (`activa = false`)
2. Superadmin downloads a `.json` file signed with `JWT_SECRET` via `licensingService.generateLicenseFile()`
3. RRHH uploads the file — backend calls `licensingService.validateLicenseFile()`, verifies signature, activates the record in DB

The license JWT has no expiration (`expiresIn` omitted) — validity is controlled by the `activa` flag in the database.

### AI Report Generation

Reports are generated via the Anthropic Claude SDK in RRHH routes. The `ANTHROPIC_API_KEY` env var must be set. Generated report text is stored in the `informes` table linked to a `candidato`.

---

## Database Conventions

All tables use UUIDs as primary keys. Timestamps use `TIMESTAMPTZ`. An `updated_at` trigger fires on every table that has the column. Foreign keys use `ON DELETE CASCADE` where child records are logically owned by the parent.

Key cross-cutting relationships:
- `procesos` belong to either an `empresa_rrhh` (internal process) or an `empresa_cliente` (client process)
- `candidatos` have a unique `token` UUID used for passwordless portal access
- `sesiones_prueba` tracks a candidate's progress through a specific `prueba` in a `proceso`
- `resultados` stores dimension-level scores; `informes` stores the AI-generated text

SQL migration files are embedded in frontend page directories (`activity_log.sql`, `onboarding.sql`, `usuarios_rrhh_permisos.sql` in `frontend/src/pages/rrhh/`) — these should be run against the database when the corresponding features are deployed.

---

## Key Conventions

- **Spanish throughout**: all DB column names, route parameters, API request/response keys, React state variables, and component props follow Spanish naming. Match this when adding new code.
- **Role string values**: `'superadmin'`, `'rrhh'`, `'empresa'` (lowercase, no accents). The `checkRol` middleware compares against `req.usuario.rol`.
- **TanStack Query**: data fetching in page components uses `useQuery` with query keys that include the relevant entity IDs. Mutations use `useMutation` followed by `queryClient.invalidateQueries`.
- **Recharts** for all charts (bar, radar, funnel). Custom brand colors are defined in `tailwind.config.js` under `theme.extend.colors.brand`.
- **XLSX** (`xlsx` package) is used for Excel export functionality in analytics pages.
- The Vite dev proxy rewrites `/api/*` to `http://localhost:4000/api/*` — frontend code always calls `/api/...` paths, never the full backend URL.
