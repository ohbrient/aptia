# Aptia — Plataforma de Evaluación Psicométrica

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/License-Private-red)

Aptia es una plataforma multi-tenant de evaluación psicométrica para empresas de RRHH en Latinoamérica. Permite a empresas de recursos humanos gestionar procesos de reclutamiento, evaluar candidatos con pruebas psicométricas y generar informes con inteligencia artificial.

---

## Arquitectura

```
aptia/
├── backend/          # API REST — Node.js + Express (puerto 4000)
│   ├── routes/
│   │   ├── superadmin/   # Gestión global de la plataforma
│   │   ├── rrhh/         # Operaciones de empresas RRHH
│   │   └── evaluacion/   # Flujo de evaluación de candidatos
│   ├── middleware/
│   │   └── auth.js       # JWT + control de roles
│   ├── services/
│   │   └── licensingService.js  # Sistema de licencias JWT
│   └── db.js             # Pool de conexiones PostgreSQL
└── frontend/         # SPA — React + Vite + TailwindCSS (puerto 5173)
    ├── src/
    │   ├── pages/
    │   │   ├── superadmin/   # Dashboard superadmin
    │   │   ├── rrhh/         # Dashboard empresas RRHH
    │   │   └── evaluacion/   # Portal de candidatos
    │   ├── components/
    │   └── services/
    │       └── api.js        # Cliente Axios con interceptores JWT
```

---

## Roles y Perfiles

| Rol | Descripción |
|-----|-------------|
| **Superadmin** | Gestiona empresas RRHH, planes, licencias y banco de pruebas global |
| **Empresa RRHH** | Gestiona empresas cliente, procesos, candidatos y sublicencias |
| **Empresa Cliente** | Visualiza sus procesos y candidatos (próximamente) |
| **Candidato** | Accede vía token único para completar evaluaciones |

---

## Funcionalidades principales

### Superadmin
- Crear y gestionar empresas RRHH con usuario administrador
- Crear y asignar planes de licencia
- Generar archivos de licencia firmados con JWT
- Restablecer contraseña del administrador de cualquier empresa
- Asignar pruebas psicométricas por empresa
- Banco de pruebas global con dimensiones e ítems
- Crear accesos demo con datos precargados o sandbox
- Eliminar empresas con cascada completa

### Empresa RRHH
- Dashboard con analytics en tiempo real (embudo, actividad 30 días, dimensiones)
- Gestión de empresas cliente con sublicencias
- Crear procesos de reclutamiento con múltiples pruebas
- Invitar candidatos por email con link de acceso único
- Sistema anti-trampa en evaluaciones (fullscreen, detección de cambio de tab, timer)
- Comparación de candidatos con radar charts
- Informes psicométricos generados por IA (Claude de Anthropic)
- Mapa de talento por proceso y dimensión
- Banco de pruebas propio con editor de ítems
- Gestión de usuarios internos con permisos granulares
- Log de actividad completo
- Carga de licencia por archivo JSON firmado

### Candidato
- Portal de evaluación responsive
- Sistema anti-cheat (fullscreen obligatorio, max 3 violaciones)
- Timer por pregunta (90 segundos)
- Soporte para escalas Likert, opción múltiple y elección forzada (DISC)

---

## Sistema de Licencias

Las licencias funcionan por archivo JWT firmado:

1. **Superadmin crea** la licencia → se guarda como `activa = false`
2. **Superadmin descarga** el archivo `.json` firmado con JWT
3. **RRHH sube** el archivo → se valida la firma y se activa en BD

```json
{
  "version": "1.0",
  "type": "aptia_license_key",
  "license": {
    "licenseId": "uuid",
    "empresaId": "uuid",
    "maxCandidates": 100,
    "expiryDate": "2026-12-31"
  },
  "signature": "eyJhbGci..."
}
```

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js, Express, JWT, bcryptjs, nodemailer |
| Frontend | React 18, Vite, TailwindCSS, TanStack Query, Recharts |
| Base de datos | PostgreSQL 15 |
| IA | Anthropic Claude SDK (generación de informes) |
| Autenticación | JWT con refresh por rol |

---

## Requisitos

- Node.js 18+
- PostgreSQL 15+
- npm 9+

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/aptia.git
cd aptia
```

### 2. Instalar dependencias

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Configurar variables de entorno

Crea el archivo `backend/.env`:

```env
# Servidor
PORT=4000

# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aptia
DB_USER=postgres
DB_PASSWORD=tu_password

# JWT
JWT_SECRET=tu_secret_jwt_seguro
JWT_EXPIRES_IN=8h

# URLs
APP_URL=http://localhost:5173
API_URL=http://localhost:4000

# Email (SMTP)
SMTP_HOST=smtp.tuproveedor.com
SMTP_PORT=587
SMTP_USER=tu@email.com
SMTP_PASS=tu_password_smtp
SMTP_FROM=noreply@aptia.com

# Anthropic (para informes IA)
ANTHROPIC_API_KEY=sk-ant-tu_api_key
```

### 4. Crear la base de datos

```bash
psql -U postgres -c "CREATE DATABASE aptia;"
psql -U postgres -d aptia -f backend/schema.sql
```

### 5. Crear el superadmin inicial

```bash
cd backend
node scripts/crear-superadmin.js
```

---

## Ejecución

```bash
# Backend (puerto 4000)
cd backend
npm start

# Frontend (puerto 5173)
cd frontend
npm run dev
```

Accede en: `http://localhost:5173`

Credenciales superadmin por defecto:
- **Email:** `admin@aptia.com.do`
- **Contraseña:** configurada en el script de setup

---

## Variables de entorno de producción adicionales

```env
NODE_ENV=production
FRONTEND_URL=https://tudominio.com
```

---

## Pruebas psicométricas incluidas

- **DISC** — Evaluación de comportamiento (28 bloques de elección forzada)
- Banco extensible con 7 categorías: personalidad, comportamiento, inteligencia, competencias, laborales, técnica, 360°

---

## Contribución

Este es un proyecto privado. Para reportar bugs o sugerir mejoras, contacta al equipo de desarrollo.

---

## Licencia

Propietario — Todos los derechos reservados © 2026 Aptia
