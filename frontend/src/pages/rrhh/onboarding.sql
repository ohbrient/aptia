
-- ═══════════════════════════════════════════════════════
-- APTIA — Onboarding completado por empresa RRHH
-- ═══════════════════════════════════════════════════════
ALTER TABLE empresas_rrhh ADD COLUMN IF NOT EXISTS onboarding_completado BOOLEAN DEFAULT false;
ALTER TABLE empresas_rrhh ADD COLUMN IF NOT EXISTS sector VARCHAR(100);
ALTER TABLE empresas_rrhh ADD COLUMN IF NOT EXISTS pais VARCHAR(100);
ALTER TABLE empresas_rrhh ADD COLUMN IF NOT EXISTS ciudad VARCHAR(100);
ALTER TABLE empresas_rrhh ADD COLUMN IF NOT EXISTS telefono VARCHAR(50);
ALTER TABLE empresas_rrhh ADD COLUMN IF NOT EXISTS sitio_web VARCHAR(200);
SELECT column_name FROM information_schema.columns WHERE table_name = 'empresas_rrhh' ORDER BY ordinal_position;
