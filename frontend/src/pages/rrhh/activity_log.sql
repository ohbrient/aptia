
-- ═══════════════════════════════════════════════════════
-- APTIA — Tabla de log de actividad
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS activity_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_rrhh_id UUID REFERENCES empresas_rrhh(id) ON DELETE CASCADE,
  usuario_id      UUID,
  usuario_nombre  VARCHAR(200),
  tipo            VARCHAR(50) NOT NULL,
  descripcion     TEXT NOT NULL,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_log_empresa ON activity_log(empresa_rrhh_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_log_tipo    ON activity_log(tipo);
SELECT 'Tabla activity_log creada' AS resultado;
