# Aptia — Plataforma de Evaluación Psicométrica

![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/License-Private-red)
![Deploy](https://img.shields.io/badge/Deploy-VPS%20Ubuntu-orange?logo=ubuntu&logoColor=white)

Aptia es una plataforma multi-tenant de evaluación psicométrica para empresas de RRHH en Latinoamérica. Permite gestionar procesos de reclutamiento, evaluar candidatos con pruebas psicométricas y generar informes con inteligencia artificial.

**Producción:** `(http://74.208.35.11/)`

---

## Arquitectura

```
aptia/
├── backend/          # API REST — Node.js + Express (puerto 4000)
│   ├── routes/
│   │   ├── superadmin/   # Gestión global de la plataforma
│   │   ├── rrhh/         # Operaciones de empresas RRHH
│   │   ├── empresa/      # Portal empresa cliente
│   │   └── publico/      # Evaluaciones de candidatos
│   ├── middleware/
│   │   └── auth.js       # JWT + control de roles
│   ├── services/
│   │   └── licensingService.js  # Sistema de licencias JWT
│   └── db.js             # Pool de conexiones PostgreSQL
└── frontend/         # SPA — React + Vite + TailwindCSS
    └── src/
        ├── pages/
        │   ├── superadmin/   # Dashboard superadmin
        │   ├── rrhh/         # Dashboard empresas RRHH
        │   ├── empresa/      # Portal empresa cliente
        │   └── prueba/       # Portal evaluación candidatos
        ├── components/
        │   └── ui/
        │       └── EtapaSelector.jsx  # Selector etapa reclutamiento
        ├── hooks/
        │   └── useLogActividad.js     # Log automático de navegación
        └── services/
            └── api.js        # Cliente Axios con interceptores JWT
```

---

## Roles y Perfiles

| Rol | Descripción |
|-----|-------------|
| **Superadmin** | Gestiona empresas RRHH, planes, licencias, banco de pruebas global y demos |
| **Empresa RRHH** | Gestiona empresas cliente, procesos, candidatos, sublicencias y analytics |
| **Empresa Cliente** | Visualiza sus procesos y candidatos |
| **Candidato** | Accede vía token único para completar evaluaciones |

---

## Funcionalidades

### Superadmin
- Crear y gestionar empresas RRHH con usuario administrador
- Crear y asignar planes de licencia
- Generar archivos de licencia firmados con JWT
- Restablecer contraseña del administrador de cualquier empresa
- Asignar pruebas psicométricas por empresa
- Banco de pruebas global con dimensiones e ítems
- **Crear demos con datos precargados** (empresa cliente, proceso, candidatos completados)
- Eliminar empresas con cascada completa

### Empresa RRHH
- Dashboard con analytics en tiempo real (embudo, actividad 30 días, dimensiones)
- Gestión de empresas cliente con sublicencias
- Crear procesos propios (internos) o para empresas cliente
- Invitar candidatos por email con link de acceso único
- **Etapas de reclutamiento** por candidato: Entrevistado, Contratado, No contratado
- **Editar candidatos** con información personal completa (teléfono, cédula, fecha nacimiento, LinkedIn, notas)
- Sistema anti-trampa en evaluaciones (fullscreen, detección de cambio de tab, timer)
- Comparación de candidatos con radar charts
- Informes psicométricos generados por IA (Claude de Anthropic)
- Perfil de puesto con match score automático
- Mapa de talento por proceso y dimensión
- Banco de pruebas propio + **visualización y edición de pruebas del sistema**
- Gestión de usuarios internos con permisos granulares
- **Log de actividad automático** (inicio sesión, navegación, acciones)
- Carga de licencia por archivo JSON firmado
- Evaluación 360° y Clima Laboral

### Candidato
- Portal de evaluación responsive
- Sistema anti-cheat (fullscreen obligatorio, máx 3 violaciones)
- Timer por pregunta (90 segundos)
- Soporte para escalas Likert, opción múltiple y elección forzada (DISC)

---

## Sistema de Licencias

Las licencias funcionan por archivo JWT firmado:

1. **Superadmin crea** la licencia → se guarda como `activa = false`
2. **Superadmin descarga** el archivo `.json` firmado con JWT
3. **RRHH sube** el archivo → se valida la firma y se activa en BD

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js 20, Express, JWT, bcryptjs, nodemailer |
| Frontend | React 18, Vite, TailwindCSS, TanStack Query, Recharts |
| Base de datos | PostgreSQL 15 |
| IA | Anthropic Claude SDK (generación de informes) |
| Autenticación | JWT con control por rol |
| Deploy | Ubuntu 22.04, PM2, Nginx |

---

## Instalación local

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/aptia.git
cd aptia
```

### 2. Instalar dependencias

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. Configurar variables de entorno

Crea `backend/.env`:

```env
PORT=4000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aptia
DB_USER=postgres
DB_PASSWORD=tu_password
JWT_SECRET=tu_secret_jwt_seguro
JWT_EXPIRES_IN=8h
APP_URL=http://localhost:5173
FRONTEND_URL=http://localhost:5173
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu@email.com
SMTP_PASS=tu_app_password
SMTP_FROM=tu@email.com
ANTHROPIC_API_KEY=sk-ant-tu_api_key
```

### 4. Crear la base de datos

```bash
psql -U postgres -c "CREATE DATABASE aptia;"
psql -U postgres -d aptia -f backend/aptia_schema.sql
```

### 5. Ejecutar

```bash
# Backend (puerto 4000)
cd backend && npm start

# Frontend (puerto 5173)
cd frontend && npm run dev
```

Accede en: `http://localhost:5173`

---

## Deploy en VPS (Ubuntu)

### Requisitos
- Ubuntu 22.04
- Node.js 20
- PostgreSQL 15
- Nginx
- PM2

### Pasos resumidos

```bash
# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx postgresql

# Instalar PM2
npm install -g pm2

# Subir proyecto
scp -r aptia.tar.gz root@SERVER_IP:/var/www/
cd /var/www && tar -xzf aptia.tar.gz

# Instalar dependencias
cd /var/www/aptia/backend && npm install
cd /var/www/aptia/frontend && npm install && npm run build

# Iniciar backend
pm2 start server.js --name aptia-backend
pm2 save && pm2 startup

# Configurar Nginx
# Ver configuración en docs/nginx.conf
```

### Variables de entorno en producción

```env
APP_URL=http://TU_IP_O_DOMINIO
FRONTEND_URL=http://TU_IP_O_DOMINIO
DB_HOST=127.0.0.1
```

---

## Pruebas psicométricas incluidas

- **DISC** — Evaluación de comportamiento (28 bloques de elección forzada)
- **Big Five (OCEAN)** — Personalidad con 5 dimensiones
- **16PF** — 16 factores de personalidad
- Banco extensible con 7 categorías: personalidad, comportamiento, inteligencia, competencias, laborales, técnica, 360°

---

## Licencia

Propietario — Todos los derechos reservados © 2026 Aptia
