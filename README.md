# Aptia — Plataforma Psicométrica para RRHH

![Aptia](https://img.shields.io/badge/version-1.0.0-blue) ![Node](https://img.shields.io/badge/Node.js-20+-green) ![React](https://img.shields.io/badge/React-18-61DAFB) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)

Aptia es una plataforma SaaS multi-tenant de evaluación psicométrica diseñada para empresas de Recursos Humanos en Latinoamérica. Permite a empresas RRHH gestionar procesos de selección, aplicar pruebas psicométricas a candidatos y obtener informes con inteligencia artificial.

---

## Tabla de contenidos

- [Características](#características)
- [Arquitectura](#arquitectura)
- [Requisitos previos](#requisitos-previos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Ejecución](#ejecución)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Roles y permisos](#roles-y-permisos)
- [Pruebas psicométricas disponibles](#pruebas-psicométricas-disponibles)
- [Variables de entorno](#variables-de-entorno)
- [Base de datos](#base-de-datos)
- [API](#api)
- [Despliegue](#despliegue)

---

## Características

### Para empresas RRHH
- **Dashboard analítico** con embudo de selección, métricas en tiempo real y gráficas
- **Gestión de empresas cliente** con sublicencias por candidatos
- **Procesos de selección** multi-prueba con invitación de candidatos por email
- **Mapa de talento** — scatter plot interactivo para comparar candidatos por dimensiones
- **Reportes PDF profesionales** con branding y análisis IA
- **Banco de pruebas propio** — crea y edita pruebas personalizadas
- **Gestión de usuarios** con permisos granulares por rol
- **Log de actividad** — historial completo de acciones
- **Onboarding guiado** para nuevas empresas
- **Comparación de candidatos** con radar chart (hasta 5 candidatos)

### Para candidatos
- Experiencia de evaluación anti-trampa (fullscreen, timer, detección de cambio de pestaña)
- Soporte para múltiples tipos de escala: Likert, opción múltiple, selección forzada (DISC)
- Informe IA generado automáticamente al completar

### Para superadmin
- Gestión de empresas RRHH y licencias
- Banco de pruebas global con categorías
- Planes por cantidad de candidatos

---

## Arquitectura

```
aptia/
├── backend/          # Node.js + Express (puerto 4000)
└── frontend/         # React + Vite + TailwindCSS (puerto 5173)
```

**Stack tecnológico:**
- **Backend:** Node.js 20, Express, PostgreSQL, JWT, Nodemailer, Anthropic SDK
- **Frontend:** React 18, Vite, TailwindCSS, React Query, Recharts, React Router
- **Base de datos:** PostgreSQL 16
- **IA:** Anthropic Claude (informes psicométricos automáticos)

---

## Requisitos previos

- Node.js 20 o superior
- PostgreSQL 16 o superior
- npm 9 o superior
- Cuenta Anthropic (para informes IA) — opcional

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/aptia.git
cd aptia
```

### 2. Instalar dependencias del backend

```bash
cd backend
npm install
```

### 3. Instalar dependencias del frontend

```bash
cd ../frontend
npm install
```

---

## Configuración

### Backend — archivo `.env`

Crea el archivo `backend/.env` con el siguiente contenido:

```env
# Servidor
PORT=4000
NODE_ENV=development

# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aptia
DB_USER=postgres
DB_PASSWORD=tu_password

# JWT
JWT_SECRET=tu_clave_secreta_muy_larga_y_segura
JWT_EXPIRES_IN=7d

# Email (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu@gmail.com
EMAIL_PASS=tu_app_password

# Anthropic (opcional — para informes IA)
ANTHROPIC_API_KEY=sk-ant-...

# URL del frontend
FRONTEND_URL=http://localhost:5173
```

### Base de datos

Crea la base de datos en PostgreSQL:

```sql
CREATE DATABASE aptia;
```

Luego ejecuta el script de inicialización:

```bash
cd backend
psql -U postgres -d aptia -f database/schema.sql
```

O manualmente ejecuta las migraciones en el orden indicado en `database/migrations/`.

---

## Ejecución

### Desarrollo

Abre **dos terminales**:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```
El servidor arranca en `http://localhost:4000`

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```
La app arranca en `http://localhost:5173`

> **Importante:** Cambia las credenciales del superadmin antes de desplegar en producción.

---

## Estructura del proyecto

```
aptia/
├── backend/
│   ├── routes/
│   │   ├── auth.js              # Login, /me, cambiar contraseña
│   │   ├── rrhh/
│   │   │   └── index.js         # Todas las rutas RRHH (~1000 líneas)
│   │   └── superadmin/
│   │       └── index.js         # Rutas superadmin
│   ├── middleware/
│   │   └── auth.js              # Middleware JWT
│   ├── db.js                    # Pool de conexión PostgreSQL
│   └── server.js                # Entry point
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── rrhh/
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── EmpresasCliente.jsx
│   │   │   │   ├── Procesos.jsx
│   │   │   │   ├── Candidatos.jsx
│   │   │   │   ├── BancoPruebas.jsx
│   │   │   │   ├── MapaTalento.jsx
│   │   │   │   ├── ReportePDF.jsx
│   │   │   │   ├── LogActividad.jsx
│   │   │   │   ├── Onboarding.jsx
│   │   │   │   ├── UsuariosRRHH.jsx
│   │   │   │   └── Licencias.jsx
│   │   │   ├── superadmin/
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── EmpresasRRHH.jsx
│   │   │   │   ├── Pruebas.jsx
│   │   │   │   └── Licencias.jsx
│   │   │   ├── prueba/
│   │   │   │   └── PruebaPage.jsx   # Experiencia del candidato
│   │   │   └── empresa/
│   │   │       └── Candidatos.jsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   └── DashboardLayout.jsx
│   │   │   └── ui/
│   │   │       ├── PageHeader.jsx
│   │   │       ├── SelectorPaisCiudad.jsx
│   │   │       └── ModalCambiarPassword.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   └── data/
│   │       └── paisesCiudades.js
│   └── index.html
```

---

## Roles y permisos

### Superadmin
- Gestiona todas las empresas RRHH
- Administra el banco de pruebas global
- Crea y asigna licencias

### Empresa RRHH (Admin)
- Acceso completo a todas las funciones
- Gestiona usuarios de su empresa
- Crea empresas cliente y procesos

### Empresa RRHH (Usuario con permisos)
Los permisos son granulares y configurables por el admin:

| Permiso | Descripción |
|---------|-------------|
| `ver_candidatos` | Ver candidatos y resultados |
| `gestionar_procesos` | Crear y editar procesos |
| `invitar_candidatos` | Enviar invitaciones |
| `ver_reportes` | Acceso a reportes y mapa de talento |
| `administrador` | Acceso total (igual que admin) |

### Empresa Cliente
- Ve sus procesos y candidatos
- No puede crear procesos

### Candidato
- Accede por link único con token UUID
- Completa las pruebas asignadas

---

## Pruebas psicométricas disponibles

| Prueba | Ítems | Escala | Tiempo | Dimensiones |
|--------|-------|--------|--------|-------------|
| Big Five (OCEAN) | 20 | Likert 5 | 15 min | O, C, E, A, N |
| DISC | 28 bloques | Selección forzada | 20 min | D, I, S, C |
| Inteligencia General | 30 | Opción múltiple | 25 min | Verbal, Numérico, Espacial, Lógico |
| Competencias Laborales | 30 | Likert 5 | 20 min | Liderazgo, Trabajo en equipo, Comunicación, Resolución |
| Clima Laboral | 30 | Likert 5 | 15 min | Satisfacción, Bienestar, Compromiso |
| Evaluación 360° | 28 | Likert 5 | 15 min | Competencias clave |
| Aptitudes Técnicas | 25 | Opción múltiple | 30 min | Habilidades generales |

---

## Variables de entorno

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `PORT` | Puerto del servidor backend | Sí |
| `DB_HOST` | Host de PostgreSQL | Sí |
| `DB_PORT` | Puerto de PostgreSQL | Sí |
| `DB_NAME` | Nombre de la base de datos | Sí |
| `DB_USER` | Usuario de PostgreSQL | Sí |
| `DB_PASSWORD` | Contraseña de PostgreSQL | Sí |
| `JWT_SECRET` | Clave secreta para tokens JWT | Sí |
| `JWT_EXPIRES_IN` | Expiración del token (ej: `7d`) | Sí |
| `EMAIL_HOST` | SMTP host para envío de emails | Sí |
| `EMAIL_PORT` | Puerto SMTP | Sí |
| `EMAIL_USER` | Correo para envío | Sí |
| `EMAIL_PASS` | Contraseña de app SMTP | Sí |
| `ANTHROPIC_API_KEY` | API key de Anthropic para informes IA | No |
| `FRONTEND_URL` | URL del frontend (para links en emails) | Sí |

---

## Base de datos

### Tablas principales

| Tabla | Descripción |
|-------|-------------|
| `superadmins` | Administradores de la plataforma |
| `empresas_rrhh` | Empresas de RRHH clientes de Aptia |
| `usuarios_rrhh` | Usuarios de cada empresa RRHH |
| `planes` | Planes de licencia disponibles |
| `licencias` | Licencias asignadas a empresas RRHH |
| `empresas_cliente` | Empresas a las que RRHH presta servicios |
| `sublicencias` | Pool de candidatos por empresa cliente |
| `usuarios_empresa` | Usuarios de empresas cliente |
| `pruebas` | Banco de pruebas psicométricas |
| `dimensiones` | Dimensiones medidas por cada prueba |
| `items_prueba` | Preguntas/ítems de cada prueba |
| `procesos` | Procesos de selección |
| `proceso_pruebas` | Relación proceso-prueba |
| `candidatos` | Candidatos invitados a procesos |
| `sesiones_prueba` | Sesión de evaluación de un candidato |
| `respuestas` | Respuestas del candidato |
| `resultados` | Puntajes calculados por dimensión |
| `informes` | Informes IA generados |
| `activity_log` | Log de actividad por empresa RRHH |

---

## API

### Autenticación
```
POST /api/auth/login          # Login (detecta rol automáticamente)
GET  /api/auth/me             # Usuario actual
POST /api/auth/cambiar-password
```

### RRHH
```
GET  /api/rrhh/dashboard
GET  /api/rrhh/analytics
GET  /api/rrhh/empresas-cliente
POST /api/rrhh/empresas-cliente
GET  /api/rrhh/procesos
POST /api/rrhh/procesos
DELETE /api/rrhh/procesos/:id
POST /api/rrhh/procesos/:id/candidatos
GET  /api/rrhh/candidatos
GET  /api/rrhh/candidatos/:id/reporte-pdf
GET  /api/rrhh/mapa-talento
GET  /api/rrhh/licencias
GET  /api/rrhh/usuarios
POST /api/rrhh/usuarios
PUT  /api/rrhh/usuarios/:id
DELETE /api/rrhh/usuarios/:id
GET  /api/rrhh/actividad
GET  /api/rrhh/onboarding-status
PUT  /api/rrhh/onboarding-perfil
POST /api/rrhh/onboarding-completar
```

### Evaluación (candidatos)
```
GET  /api/evaluacion/:token   # Obtener prueba por token
POST /api/evaluacion/:token/responder
POST /api/evaluacion/:token/completar
```

---

## Despliegue

### Producción con PM2

```bash
# Backend
cd backend
npm install -g pm2
pm2 start server.js --name aptia-backend

# Frontend (build)
cd frontend
npm run build
# Servir con nginx o similar
```

### Variables de entorno en producción

Asegúrate de:
1. Cambiar `JWT_SECRET` por una cadena aleatoria de 64+ caracteres
2. Cambiar las credenciales del superadmin por defecto
3. Configurar HTTPS
4. Usar un servicio SMTP profesional (SendGrid, Resend, etc.)
5. Configurar `NODE_ENV=production`

---

## Licencia

Proyecto privado — todos los derechos reservados © 2025 Aptia.

---

*Desarrollado con ❤️ para el mercado latinoamericano de RRHH*
