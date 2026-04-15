-- ═══════════════════════════════════════════════════════════════
-- APTIA — Sistema de usuarios RRHH con permisos
-- ═══════════════════════════════════════════════════════════════

-- Agregar columnas a usuarios_rrhh si no existen
ALTER TABLE usuarios_rrhh ADD COLUMN IF NOT EXISTS permisos JSONB DEFAULT '{}';
ALTER TABLE usuarios_rrhh ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
ALTER TABLE usuarios_rrhh ADD COLUMN IF NOT EXISTS ultimo_acceso TIMESTAMP;
ALTER TABLE usuarios_rrhh ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- El admin tiene todos los permisos por defecto
UPDATE usuarios_rrhh SET permisos = '{
  "ver_candidatos": true,
  "gestionar_procesos": true,
  "invitar_candidatos": true,
  "ver_reportes": true,
  "administrador": true
}' WHERE rol = 'admin' AND (permisos = '{}' OR permisos IS NULL);

-- Verificar
SELECT nombre, email, rol, permisos, activo FROM usuarios_rrhh;
