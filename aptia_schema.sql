-- ============================================================
--  APTIA — Schema PostgreSQL completo
--  Plataforma psicométrica multi-tenant
--  Niveles: Superadmin → Empresa RRHH → Empresa Cliente → Candidato
-- ============================================================

-- Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. SUPERADMIN
-- ============================================================
CREATE TABLE superadmins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        VARCHAR(120) NOT NULL,
  email         VARCHAR(180) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  activo        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. EMPRESAS DE RRHH
--    Son los clientes directos del Superadmin.
--    Compran licencias y las revenden a empresas cliente.
-- ============================================================
CREATE TABLE empresas_rrhh (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          VARCHAR(200) NOT NULL,
  ruc_nit         VARCHAR(60),
  pais            VARCHAR(80),
  ciudad          VARCHAR(80),
  telefono        VARCHAR(40),
  email_contacto  VARCHAR(180),
  logo_url        TEXT,
  color_primario  VARCHAR(7) DEFAULT '#2563EB',
  color_secundario VARCHAR(7) DEFAULT '#0F172A',
  activo          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Usuarios de cada empresa RRHH (admins internos)
CREATE TABLE usuarios_rrhh (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_rrhh_id UUID NOT NULL REFERENCES empresas_rrhh(id) ON DELETE CASCADE,
  nombre          VARCHAR(120) NOT NULL,
  email           VARCHAR(180) NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  rol             VARCHAR(30) NOT NULL DEFAULT 'admin' CHECK (rol IN ('admin','staff')),
  activo          BOOLEAN NOT NULL DEFAULT true,
  ultimo_login    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. LICENCIAS
--    El superadmin vende paquetes de licencias a empresas RRHH.
--    Cada licencia = derecho a evaluar N candidatos.
-- ============================================================
CREATE TABLE planes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          VARCHAR(100) NOT NULL,
  descripcion     TEXT,
  max_candidatos  INTEGER NOT NULL,
  max_pruebas     INTEGER NOT NULL DEFAULT 10,
  precio          NUMERIC(12,2) NOT NULL DEFAULT 0,
  moneda          VARCHAR(5) NOT NULL DEFAULT 'USD',
  activo          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE licencias (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_rrhh_id UUID NOT NULL REFERENCES empresas_rrhh(id) ON DELETE RESTRICT,
  plan_id         UUID NOT NULL REFERENCES planes(id),
  candidatos_total INTEGER NOT NULL,
  candidatos_usados INTEGER NOT NULL DEFAULT 0,
  fecha_inicio    DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE NOT NULL,
  activa          BOOLEAN NOT NULL DEFAULT true,
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. EMPRESAS CLIENTE
--    Son contratadas por las empresas RRHH.
--    Tienen acceso para crear procesos y evaluar candidatos.
-- ============================================================
CREATE TABLE empresas_cliente (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_rrhh_id UUID NOT NULL REFERENCES empresas_rrhh(id) ON DELETE RESTRICT,
  nombre          VARCHAR(200) NOT NULL,
  ruc_nit         VARCHAR(60),
  pais            VARCHAR(80),
  ciudad          VARCHAR(80),
  telefono        VARCHAR(40),
  email_contacto  VARCHAR(180),
  logo_url        TEXT,
  sector          VARCHAR(100),
  activo          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Usuarios de cada empresa cliente
CREATE TABLE usuarios_empresa (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_cliente_id  UUID NOT NULL REFERENCES empresas_cliente(id) ON DELETE CASCADE,
  nombre              VARCHAR(120) NOT NULL,
  email               VARCHAR(180) NOT NULL UNIQUE,
  password_hash       TEXT NOT NULL,
  rol                 VARCHAR(30) NOT NULL DEFAULT 'reclutador' CHECK (rol IN ('admin','reclutador','viewer')),
  activo              BOOLEAN NOT NULL DEFAULT true,
  ultimo_login        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. BANCO DE PRUEBAS
--    Gestionado por el Superadmin.
--    Cada empresa RRHH puede ver las pruebas habilitadas en su plan.
-- ============================================================
CREATE TABLE pruebas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          VARCHAR(200) NOT NULL,
  descripcion     TEXT,
  tipo            VARCHAR(50) NOT NULL CHECK (tipo IN ('personalidad','inteligencia','competencias','tecnica','clima','360')),
  instrucciones   TEXT,
  tiempo_limite   INTEGER,            -- minutos, NULL = sin límite
  total_items     INTEGER NOT NULL DEFAULT 0,
  escala_tipo     VARCHAR(30) NOT NULL DEFAULT 'likert5' CHECK (escala_tipo IN ('likert5','likert7','dicotomica','multiple','abierta')),
  activa          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dimensiones / factores de cada prueba (ej. OCEAN, DISC)
CREATE TABLE dimensiones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prueba_id       UUID NOT NULL REFERENCES pruebas(id) ON DELETE CASCADE,
  nombre          VARCHAR(120) NOT NULL,
  codigo          VARCHAR(20) NOT NULL,    -- ej. 'O','C','E','A','N'
  descripcion     TEXT,
  orden           INTEGER NOT NULL DEFAULT 0,
  interpretacion_alta   TEXT,
  interpretacion_baja   TEXT
);

-- Ítems / preguntas
CREATE TABLE items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prueba_id       UUID NOT NULL REFERENCES pruebas(id) ON DELETE CASCADE,
  dimension_id    UUID REFERENCES dimensiones(id) ON DELETE SET NULL,
  texto           TEXT NOT NULL,
  orden           INTEGER NOT NULL DEFAULT 0,
  invertido       BOOLEAN NOT NULL DEFAULT false,   -- puntuación invertida
  activo          BOOLEAN NOT NULL DEFAULT true
);

-- Opciones de respuesta (para escala Likert, dicotómica, opción múltiple)
CREATE TABLE opciones_item (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  texto           VARCHAR(300) NOT NULL,
  valor           NUMERIC(5,2) NOT NULL,
  orden           INTEGER NOT NULL DEFAULT 0
);

-- Qué pruebas puede usar cada empresa RRHH (habilitadas por superadmin)
CREATE TABLE rrhh_pruebas (
  empresa_rrhh_id UUID NOT NULL REFERENCES empresas_rrhh(id) ON DELETE CASCADE,
  prueba_id       UUID NOT NULL REFERENCES pruebas(id) ON DELETE CASCADE,
  habilitada      BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (empresa_rrhh_id, prueba_id)
);

-- ============================================================
-- 6. PROCESOS DE SELECCIÓN
--    Creados por las empresas cliente para cada convocatoria.
-- ============================================================
CREATE TABLE procesos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_cliente_id  UUID NOT NULL REFERENCES empresas_cliente(id) ON DELETE RESTRICT,
  creado_por          UUID NOT NULL REFERENCES usuarios_empresa(id),
  nombre              VARCHAR(200) NOT NULL,
  puesto              VARCHAR(150),
  descripcion         TEXT,
  fecha_inicio        DATE,
  fecha_limite        DATE,
  estado              VARCHAR(30) NOT NULL DEFAULT 'activo' CHECK (estado IN ('borrador','activo','cerrado','archivado')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pruebas asignadas a un proceso
CREATE TABLE proceso_pruebas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id  UUID NOT NULL REFERENCES procesos(id) ON DELETE CASCADE,
  prueba_id   UUID NOT NULL REFERENCES pruebas(id) ON DELETE RESTRICT,
  orden       INTEGER NOT NULL DEFAULT 0,
  obligatoria BOOLEAN NOT NULL DEFAULT true
);

-- ============================================================
-- 7. CANDIDATOS
--    Invitados por las empresas cliente a un proceso.
--    Acceden sin login, solo con token UUID en la URL.
-- ============================================================
CREATE TABLE candidatos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id          UUID NOT NULL REFERENCES procesos(id) ON DELETE RESTRICT,
  nombre              VARCHAR(150) NOT NULL,
  apellido            VARCHAR(150),
  email               VARCHAR(180) NOT NULL,
  telefono            VARCHAR(40),
  token_acceso        UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  estado              VARCHAR(30) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','en_progreso','completado','expirado','cancelado')),
  fecha_invitacion    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_vencimiento   TIMESTAMPTZ,
  fecha_inicio        TIMESTAMPTZ,
  fecha_completado    TIMESTAMPTZ,
  ip_acceso           VARCHAR(45),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. SESIONES Y RESPUESTAS
-- ============================================================
-- Una sesión por candidato por prueba
CREATE TABLE sesiones_prueba (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id    UUID NOT NULL REFERENCES candidatos(id) ON DELETE RESTRICT,
  prueba_id       UUID NOT NULL REFERENCES pruebas(id) ON DELETE RESTRICT,
  iniciada_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completada_at   TIMESTAMPTZ,
  tiempo_segundos INTEGER,
  estado          VARCHAR(20) NOT NULL DEFAULT 'en_progreso' CHECK (estado IN ('en_progreso','completada','abandonada')),
  UNIQUE (candidato_id, prueba_id)
);

-- Respuestas individuales por ítem
CREATE TABLE respuestas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sesion_id       UUID NOT NULL REFERENCES sesiones_prueba(id) ON DELETE CASCADE,
  item_id         UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  opcion_id       UUID REFERENCES opciones_item(id),
  valor_numerico  NUMERIC(5,2),
  texto_libre     TEXT,
  respondido_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sesion_id, item_id)
);

-- ============================================================
-- 9. RESULTADOS
--    Puntaje por dimensión, calculado al completar la prueba.
-- ============================================================
CREATE TABLE resultados (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sesion_id       UUID NOT NULL REFERENCES sesiones_prueba(id) ON DELETE CASCADE,
  dimension_id    UUID NOT NULL REFERENCES dimensiones(id) ON DELETE RESTRICT,
  puntaje_raw     NUMERIC(8,4) NOT NULL,
  puntaje_pct     NUMERIC(5,2) NOT NULL,   -- 0 a 100
  nivel           VARCHAR(20) CHECK (nivel IN ('muy_bajo','bajo','moderado','alto','muy_alto')),
  UNIQUE (sesion_id, dimension_id)
);

-- Informe IA generado (guardado para no regenerar)
CREATE TABLE informes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id    UUID NOT NULL REFERENCES candidatos(id) ON DELETE CASCADE,
  prueba_id       UUID NOT NULL REFERENCES pruebas(id),
  contenido_html  TEXT NOT NULL,
  contenido_texto TEXT,
  generado_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modelo_ia       VARCHAR(80) DEFAULT 'claude-sonnet-4-20250514',
  UNIQUE (candidato_id, prueba_id)
);

-- ============================================================
-- 10. AUDITORÍA Y LOGS
-- ============================================================
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_tipo  VARCHAR(30) NOT NULL CHECK (actor_tipo IN ('superadmin','usuario_rrhh','usuario_empresa','candidato')),
  actor_id    UUID NOT NULL,
  accion      VARCHAR(100) NOT NULL,
  tabla       VARCHAR(80),
  registro_id UUID,
  detalle     JSONB,
  ip          VARCHAR(45),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES DE RENDIMIENTO
-- ============================================================
CREATE INDEX idx_candidatos_token         ON candidatos(token_acceso);
CREATE INDEX idx_candidatos_proceso       ON candidatos(proceso_id);
CREATE INDEX idx_candidatos_email         ON candidatos(email);
CREATE INDEX idx_candidatos_estado        ON candidatos(estado);
CREATE INDEX idx_respuestas_sesion        ON respuestas(sesion_id);
CREATE INDEX idx_sesiones_candidato       ON sesiones_prueba(candidato_id);
CREATE INDEX idx_sesiones_prueba          ON sesiones_prueba(prueba_id);
CREATE INDEX idx_resultados_sesion        ON resultados(sesion_id);
CREATE INDEX idx_procesos_empresa         ON procesos(empresa_cliente_id);
CREATE INDEX idx_empresa_cliente_rrhh     ON empresas_cliente(empresa_rrhh_id);
CREATE INDEX idx_licencias_rrhh           ON licencias(empresa_rrhh_id);
CREATE INDEX idx_items_prueba             ON items(prueba_id);
CREATE INDEX idx_items_dimension          ON items(dimension_id);
CREATE INDEX idx_audit_actor              ON audit_log(actor_tipo, actor_id);
CREATE INDEX idx_audit_created            ON audit_log(created_at DESC);

-- ============================================================
-- DATOS INICIALES — Superadmin
-- ============================================================
-- Contraseña: aptia2024 (cambiar en producción)
-- Hash bcrypt generado externamente — reemplazar con hash real
INSERT INTO superadmins (nombre, email, password_hash)
VALUES (
  'Administrador Aptia',
  'admin@aptia.io',
  '$2b$12$PLACEHOLDER_HASH_CHANGE_ME'
);

-- ============================================================
-- DATOS INICIALES — Prueba Big Five (OCEAN)
-- ============================================================
WITH prueba AS (
  INSERT INTO pruebas (nombre, descripcion, tipo, instrucciones, tiempo_limite, total_items, escala_tipo)
  VALUES (
    'Big Five (OCEAN)',
    'Evalúa cinco grandes dimensiones de la personalidad: Apertura, Responsabilidad, Extraversión, Amabilidad y Neuroticismo.',
    'personalidad',
    'Lee cada afirmación y selecciona qué tan de acuerdo o en desacuerdo estás. No hay respuestas correctas o incorrectas. Responde con sinceridad.',
    15,
    20,
    'likert5'
  ) RETURNING id
),
dims AS (
  INSERT INTO dimensiones (prueba_id, nombre, codigo, descripcion, orden, interpretacion_alta, interpretacion_baja)
  SELECT
    p.id,
    d.nombre, d.codigo, d.descripcion, d.orden, d.alta, d.baja
  FROM prueba p,
  (VALUES
    ('Apertura',        'O', 'Curiosidad intelectual, creatividad e imaginación.',        1, 'Alta creatividad y apertura al cambio.', 'Preferencia por rutinas y lo concreto.'),
    ('Responsabilidad', 'C', 'Organización, disciplina y orientación al logro.',          2, 'Alta organización y cumplimiento.',     'Flexibilidad pero menor estructura.'),
    ('Extraversión',    'E', 'Sociabilidad, energía y asertividad social.',               3, 'Alta energía social y liderazgo.',      'Preferencia por entornos tranquilos.'),
    ('Amabilidad',      'A', 'Cooperación, empatía y orientación hacia los demás.',       4, 'Alta colaboración y empatía.',          'Mayor independencia y asertividad.'),
    ('Neuroticismo',    'N', 'Reactividad emocional ante el estrés y la adversidad.',     5, 'Alta sensibilidad emocional.',          'Alta estabilidad bajo presión.')
  ) AS d(nombre, codigo, descripcion, orden, alta, baja)
  RETURNING id, codigo
)
INSERT INTO items (prueba_id, dimension_id, texto, orden)
SELECT p.id, d.id, i.texto, i.orden
FROM prueba p
JOIN dims d ON d.codigo = i.codigo
JOIN (VALUES
  -- Apertura (O)
  ('O', 'Disfruto explorar nuevas ideas y conceptos.',               1),
  ('O', 'Me atrae el arte, la música o la literatura.',              2),
  ('O', 'Tengo mucha imaginación y creatividad.',                    3),
  ('O', 'Me siento cómodo/a con situaciones nuevas e inciertas.',   4),
  -- Responsabilidad (C)
  ('C', 'Soy una persona organizada y planificada.',                 5),
  ('C', 'Cumplo con mis compromisos incluso cuando es difícil.',     6),
  ('C', 'Presto mucha atención a los detalles en mi trabajo.',       7),
  ('C', 'Termino lo que empiezo sin dejar las cosas a medias.',      8),
  -- Extraversión (E)
  ('E', 'Me siento con energía cuando estoy rodeado/a de personas.', 9),
  ('E', 'Tomo la iniciativa en situaciones sociales.',               10),
  ('E', 'Me resulta fácil hablar con personas que no conozco.',      11),
  ('E', 'Me considero una persona animada y expresiva.',             12),
  -- Amabilidad (A)
  ('A', 'Me preocupo genuinamente por el bienestar de los demás.',   13),
  ('A', 'Prefiero cooperar antes que competir.',                     14),
  ('A', 'Trato de ver el lado positivo en cada persona.',            15),
  ('A', 'Me resulta fácil perdonar cuando alguien me ofende.',       16),
  -- Neuroticismo (N)
  ('N', 'Me estreso con facilidad ante situaciones de presión.',     17),
  ('N', 'Con frecuencia me preocupo por cosas que podrían salir mal.', 18),
  ('N', 'Mis emociones cambian con frecuencia a lo largo del día.',  19),
  ('N', 'Me cuesta trabajo mantener la calma cuando algo me molesta.', 20)
) AS i(codigo, texto, orden) ON TRUE;

-- Opciones Likert 1-5 para todos los ítems Big Five
INSERT INTO opciones_item (item_id, texto, valor, orden)
SELECT i.id, o.texto, o.valor, o.orden
FROM items i
JOIN (VALUES
  (1, 'Muy en desacuerdo', 1),
  (2, 'En desacuerdo',     2),
  (3, 'Neutral',           3),
  (4, 'De acuerdo',        4),
  (5, 'Muy de acuerdo',    5)
) AS o(orden, texto, valor) ON TRUE;

-- ============================================================
-- FUNCIÓN: actualizar updated_at automáticamente
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_superadmins_upd        BEFORE UPDATE ON superadmins        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_empresas_rrhh_upd      BEFORE UPDATE ON empresas_rrhh      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_usuarios_rrhh_upd      BEFORE UPDATE ON usuarios_rrhh      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_licencias_upd          BEFORE UPDATE ON licencias           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_empresas_cliente_upd   BEFORE UPDATE ON empresas_cliente    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_usuarios_empresa_upd   BEFORE UPDATE ON usuarios_empresa    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_pruebas_upd            BEFORE UPDATE ON pruebas             FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_procesos_upd           BEFORE UPDATE ON procesos            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_candidatos_upd         BEFORE UPDATE ON candidatos          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
