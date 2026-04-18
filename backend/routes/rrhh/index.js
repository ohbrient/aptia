const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db     = require('../../db');
const { auth, checkRol } = require('../../middleware/auth');

router.use(auth, checkRol('rrhh'));


// ── Helper: registrar actividad ──────────────────────────────
async function logActividad(db, empresa_rrhh_id, usuario, tipo, descripcion, metadata = {}) {
  try {
    await db.query(
      `INSERT INTO activity_log (empresa_rrhh_id, usuario_id, usuario_nombre, tipo, descripcion, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [empresa_rrhh_id, usuario?.id || null, usuario?.nombre || 'Sistema', tipo, descripcion, JSON.stringify(metadata)]
    );
  } catch(err) {
    console.error('[log]', err.message);
  }
}

// ── GET /api/rrhh/dashboard ──────────────────────────────────
router.get('/dashboard', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    const [clientes, candidatos, licencia, procesos] = await Promise.all([
      db.query('SELECT COUNT(*) FROM empresas_cliente WHERE empresa_rrhh_id=$1 AND activo=true', [empresa_rrhh_id]),
      db.query(`SELECT COUNT(*) FROM candidatos c
                JOIN procesos p ON p.id = c.proceso_id
                JOIN empresas_cliente e ON e.id = p.empresa_cliente_id
                WHERE e.empresa_rrhh_id = $1`, [empresa_rrhh_id]),
      db.query(`SELECT COALESCE(SUM(candidatos_total - candidatos_usados),0) AS disponibles
                FROM licencias WHERE empresa_rrhh_id=$1 AND activa=true`, [empresa_rrhh_id]),
      db.query(`SELECT COUNT(*) FROM procesos p
                JOIN empresas_cliente e ON e.id = p.empresa_cliente_id
                WHERE e.empresa_rrhh_id=$1 AND p.estado='activo'`, [empresa_rrhh_id]),
    ]);
    res.json({
      empresas_cliente:   parseInt(clientes.rows[0].count),
      candidatos_evaluados: parseInt(candidatos.rows[0].count),
      licencias_disponibles: parseInt(licencia.rows[0].disponibles),
      procesos_activos:   parseInt(procesos.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: 'Error en dashboard RRHH' });
  }
});

// ── GET /api/rrhh/empresas-cliente ───────────────────────────
router.get('/empresas-cliente', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    const { rows } = await db.query(`
      SELECT e.*,
        COUNT(DISTINCT u.id)  AS total_usuarios,
        COUNT(DISTINCT p.id)  AS total_procesos,
        COUNT(DISTINCT c.id)  AS total_candidatos
      FROM empresas_cliente e
      LEFT JOIN usuarios_empresa u ON u.empresa_cliente_id = e.id
      LEFT JOIN procesos p         ON p.empresa_cliente_id = e.id
      LEFT JOIN candidatos c       ON c.proceso_id = p.id
      WHERE e.empresa_rrhh_id = $1
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `, [empresa_rrhh_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener empresas cliente' });
  }
});

// ── POST /api/rrhh/empresas-cliente ──────────────────────────
router.post('/empresas-cliente', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  const { nombre, email_contacto, pais, ciudad, telefono, sector,
          admin_nombre, admin_email, admin_password } = req.body;

  if (!nombre || !admin_email || !admin_password) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  // Verificar licencias disponibles
  const { rows: lic } = await db.query(
    `SELECT COALESCE(SUM(candidatos_total - candidatos_usados),0) AS disponibles
     FROM licencias WHERE empresa_rrhh_id=$1 AND activa=true AND fecha_vencimiento >= CURRENT_DATE`,
    [empresa_rrhh_id]
  );
  if (parseInt(lic[0].disponibles) <= 0) {
    return res.status(402).json({ error: 'No tienes licencias disponibles' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [empresa] } = await client.query(
      `INSERT INTO empresas_cliente (empresa_rrhh_id, nombre, email_contacto, pais, ciudad, telefono, sector)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [empresa_rrhh_id, nombre, email_contacto, pais, ciudad, telefono, sector]
    );
    const hash = await bcrypt.hash(admin_password, 12);
    await client.query(
      `INSERT INTO usuarios_empresa (empresa_cliente_id, nombre, email, password_hash, rol)
       VALUES ($1,$2,$3,$4,'admin')`,
      [empresa.id, admin_nombre || nombre, admin_email.toLowerCase(), hash]
    );
    await client.query('COMMIT');
    await logActividad(db, empresa_rrhh_id, req.user, 'empresa_creada',
      `Empresa cliente "${nombre}" registrada`,
      { empresa_id: empresa.id });
    res.status(201).json(empresa);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'Email ya registrado' });
    res.status(500).json({ error: 'Error al crear empresa cliente' });
  } finally {
    client.release();
  }
});

// ── GET /api/rrhh/licencias ──────────────────────────────────
router.get('/licencias', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  const { rows } = await db.query(
    `SELECT l.*, p.nombre AS plan_nombre
     FROM licencias l JOIN planes p ON p.id = l.plan_id
     WHERE l.empresa_rrhh_id = $1 ORDER BY l.created_at DESC`,
    [empresa_rrhh_id]
  );
  res.json(rows);
});


// ── GET /api/rrhh/procesos ────────────────────────────────────
router.get('/procesos', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    const { rows } = await db.query(`
      SELECT p.*,
        ec.nombre AS empresa_cliente_nombre,
        u.nombre  AS creado_por_nombre,
        COUNT(DISTINCT c.id)                                       AS total_candidatos,
        COUNT(DISTINCT c.id) FILTER (WHERE c.estado='completado') AS completados,
        COUNT(DISTINCT c.id) FILTER (WHERE c.estado='pendiente')  AS pendientes
      FROM procesos p
      JOIN empresas_cliente ec ON ec.id = p.empresa_cliente_id
      LEFT JOIN usuarios_empresa u ON u.id = p.creado_por
      LEFT JOIN candidatos c ON c.proceso_id = p.id
      WHERE ec.empresa_rrhh_id = $1
      GROUP BY p.id, ec.nombre, u.nombre
      ORDER BY p.created_at DESC
    `, [empresa_rrhh_id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Error al obtener procesos' }); }
});

// ── POST /api/rrhh/procesos ───────────────────────────────────
router.post('/procesos', async (req, res) => {
  const { empresa_rrhh_id, id: creado_por, empresa_nombre } = req.user;
  let { empresa_cliente_id, nombre, puesto, descripcion, fecha_inicio, fecha_limite, prueba_ids } = req.body;
  if (!nombre || !empresa_cliente_id || !prueba_ids?.length)
    return res.status(400).json({ error: 'Nombre, empresa cliente y pruebas son requeridos' });

  // Proceso propio: usar o crear empresa interna
  if (empresa_cliente_id === 'propio') {
    let { rows: [interna] } = await db.query(
      `SELECT id FROM empresas_cliente WHERE empresa_rrhh_id=$1 AND es_interna=true LIMIT 1`,
      [empresa_rrhh_id]
    );
    if (!interna) {
      // Crear empresa interna si no existe
      try {
        const { rows: [nueva] } = await db.query(
          `INSERT INTO empresas_cliente (empresa_rrhh_id, nombre, sector, activo, es_interna)
           VALUES ($1, $2, 'Recursos Humanos', true, true) RETURNING id`,
          [empresa_rrhh_id, empresa_nombre || 'Empresa interna']
        );
        interna = nueva;
      } catch {
        // Si es_interna no existe aún, crear sin ese campo
        const { rows: [nueva] } = await db.query(
          `INSERT INTO empresas_cliente (empresa_rrhh_id, nombre, sector, activo)
           VALUES ($1, $2, 'Recursos Humanos', true) RETURNING id`,
          [empresa_rrhh_id, empresa_nombre || 'Proceso interno']
        );
        interna = nueva;
      }
    }
    empresa_cliente_id = interna.id;
  }

  // Verificar que la empresa cliente pertenece a esta RRHH
  const { rows: [ec] } = await db.query(
    'SELECT id FROM empresas_cliente WHERE id=$1 AND empresa_rrhh_id=$2',
    [empresa_cliente_id, empresa_rrhh_id]
  );
  if (!ec) return res.status(403).json({ error: 'Empresa cliente no autorizada' });

  // Usar un usuario de la empresa cliente como creado_por (el primero disponible)
  const { rows: [usuario] } = await db.query(
    'SELECT id FROM usuarios_empresa WHERE empresa_cliente_id=$1 LIMIT 1',
    [empresa_cliente_id]
  );

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [proceso] } = await client.query(
      `INSERT INTO procesos (empresa_cliente_id, creado_por, nombre, puesto, descripcion, fecha_inicio, fecha_limite)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [empresa_cliente_id, usuario?.id || creado_por, nombre, puesto, descripcion, fecha_inicio || null, fecha_limite || null]
    );
    for (let i = 0; i < prueba_ids.length; i++) {
      await client.query(
        'INSERT INTO proceso_pruebas (proceso_id, prueba_id, orden) VALUES ($1,$2,$3)',
        [proceso.id, prueba_ids[i], i]
      );
    }
    // Descontar de licencia (sin LIMIT - usar subquery)
    await client.query(
      `UPDATE licencias SET candidatos_usados = candidatos_usados
       WHERE id = (SELECT id FROM licencias WHERE empresa_rrhh_id=$1 AND activa=true LIMIT 1)`,
      [empresa_rrhh_id]
    );
    await client.query('COMMIT');
    await logActividad(db, empresa_rrhh_id, req.user, 'proceso_creado',
      `Proceso "${nombre}" creado${puesto ? ` para el puesto de ${puesto}` : ''}`,
      { proceso_id: proceso.id });
    res.status(201).json(proceso);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[POST /rrhh/procesos]', err.message);
    res.status(500).json({ error: 'Error al crear proceso', detalle: err.message });
  } finally { client.release(); }
});

// ── GET /api/rrhh/procesos/:id/candidatos ────────────────────
router.get('/procesos/:id/candidatos', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    const { rows: [proceso] } = await db.query(
      `SELECT p.id FROM procesos p
       JOIN empresas_cliente ec ON ec.id=p.empresa_cliente_id
       WHERE p.id=$1 AND ec.empresa_rrhh_id=$2`,
      [req.params.id, empresa_rrhh_id]
    );
    if (!proceso) return res.status(403).json({ error: 'No autorizado' });
    const { rows } = await db.query(
      'SELECT * FROM candidatos WHERE proceso_id=$1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Error al obtener candidatos' }); }
});

// ── POST /api/rrhh/procesos/:id/candidatos ───────────────────
router.post('/procesos/:id/candidatos', async (req, res) => {
  const { empresa_rrhh_id, empresa_nombre } = req.user;
  const { candidatos } = req.body;
  if (!candidatos?.length) return res.status(400).json({ error: 'Lista de candidatos requerida' });

  const { rows: [proceso] } = await db.query(
    `SELECT p.* FROM procesos p
     JOIN empresas_cliente ec ON ec.id=p.empresa_cliente_id
     WHERE p.id=$1 AND ec.empresa_rrhh_id=$2`,
    [req.params.id, empresa_rrhh_id]
  );
  if (!proceso) return res.status(403).json({ error: 'No autorizado' });

  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const creados = [];
  for (const c of candidatos) {
    try {
      const { rows: [candidato] } = await db.query(
        `INSERT INTO candidatos (proceso_id, nombre, apellido, email, fecha_vencimiento)
         VALUES ($1,$2,$3,$4, NOW() + INTERVAL '7 days')
         ON CONFLICT DO NOTHING RETURNING *`,
        [proceso.id, c.nombre, c.apellido, c.email.toLowerCase()]
      );
      if (!candidato) continue;
      creados.push(candidato);
      const link = `${process.env.APP_URL}/evaluacion/${candidato.token_acceso}`;
      await transporter.sendMail({
        from: process.env.SMTP_FROM, to: candidato.email,
        subject: `${empresa_nombre} te invita a una evaluación`,
        html: `<div style="font-family:sans-serif;max-width:520px;margin:auto">
          <h2 style="color:#2563EB">Hola ${candidato.nombre},</h2>
          <p><strong>${empresa_nombre}</strong> te ha invitado a completar una evaluación psicométrica para el puesto de <strong>${proceso.puesto||proceso.nombre}</strong>.</p>
          <p style="margin:28px 0"><a href="${link}" style="background:#2563EB;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600">Comenzar evaluación →</a></p>
          <p style="color:#64748B;font-size:13px">Este enlace expira en 7 días.</p>
          <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0">
          <p style="color:#94A3B8;font-size:12px">Powered by Aptia</p>
        </div>`,
      });
    } catch {}
  }
  if (creados.length > 0) {
    await logActividad(db, empresa_rrhh_id, req.user, 'candidatos_invitados',
      `Se invitaron ${creados.length} candidato(s) al proceso "${proceso.nombre}"`,
      { proceso_id: req.params.id, cantidad: creados.length });
  }
  res.status(201).json({ invitados: creados.length, candidatos: creados });
});

// ── GET /api/rrhh/pruebas-disponibles ────────────────────────
router.get('/pruebas-disponibles', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    const { rows } = await db.query(
      `SELECT p.* FROM pruebas p
       JOIN rrhh_pruebas rp ON rp.prueba_id=p.id
       WHERE rp.empresa_rrhh_id=$1 AND rp.habilitada=true AND p.activa=true
       ORDER BY p.nombre`,
      [empresa_rrhh_id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Error al obtener pruebas' }); }
});

// ── GET /api/rrhh/reportes ────────────────────────────────────
router.get('/reportes', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    const { rows } = await db.query(`
      SELECT
        c.id, c.nombre, c.apellido, c.email, c.estado,
        c.fecha_completado, c.created_at,
        p.nombre AS proceso_nombre, p.puesto,
        ec.nombre AS empresa_cliente_nombre,
        json_agg(
          json_build_object(
            'dimension', d.nombre,
            'codigo', d.codigo,
            'puntaje_pct', r.puntaje_pct,
            'nivel', r.nivel
          ) ORDER BY d.orden
        ) FILTER (WHERE r.id IS NOT NULL) AS resultados,
        inf.contenido_texto AS informe
      FROM candidatos c
      JOIN procesos p ON p.id = c.proceso_id
      JOIN empresas_cliente ec ON ec.id = p.empresa_cliente_id
      LEFT JOIN sesiones_prueba sp ON sp.candidato_id = c.id AND sp.estado = 'completada'
      LEFT JOIN resultados r ON r.sesion_id = sp.id
      LEFT JOIN dimensiones d ON d.id = r.dimension_id
      LEFT JOIN informes inf ON inf.candidato_id = c.id
      WHERE ec.empresa_rrhh_id = $1 AND c.estado = 'completado'
      GROUP BY c.id, p.nombre, p.puesto, ec.nombre, inf.contenido_texto
      ORDER BY c.fecha_completado DESC
    `, [empresa_rrhh_id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener reportes' });
  }
});

// ── GET /api/rrhh/candidatos-todos ───────────────────────────
router.get('/candidatos-todos', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    const { rows } = await db.query(`
      SELECT c.*, p.nombre AS proceso_nombre, p.puesto, ec.nombre AS empresa_cliente_nombre,
        json_agg(json_build_object('dimension',d.nombre,'codigo',d.codigo,'puntaje_pct',r.puntaje_pct,'nivel',r.nivel) ORDER BY d.orden)
          FILTER (WHERE r.id IS NOT NULL) AS resultados,
        inf.contenido_texto AS informe
      FROM candidatos c
      JOIN procesos p ON p.id = c.proceso_id
      JOIN empresas_cliente ec ON ec.id=p.empresa_cliente_id
      LEFT JOIN sesiones_prueba sp ON sp.candidato_id=c.id AND sp.estado='completada'
      LEFT JOIN resultados r ON r.sesion_id=sp.id
      LEFT JOIN dimensiones d ON d.id=r.dimension_id
      LEFT JOIN informes inf ON inf.candidato_id=c.id
      WHERE ec.empresa_rrhh_id=$1
      GROUP BY c.id, p.nombre, p.puesto, ec.nombre, inf.contenido_texto
      ORDER BY c.created_at DESC
    `, [empresa_rrhh_id]);
    res.json(rows);
  } catch(err) { console.error(err); res.status(500).json({ error: 'Error al obtener candidatos' }); }
});

// ── GET /api/rrhh/procesos/:id/comparar ──────────────────────
router.get('/procesos/:id/comparar', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    const { rows: [proceso] } = await db.query(
      `SELECT p.* FROM procesos p
       JOIN empresas_cliente ec ON ec.id=p.empresa_cliente_id
       WHERE p.id=$1 AND ec.empresa_rrhh_id=$2`,
      [req.params.id, empresa_rrhh_id]
    );
    if (!proceso) return res.status(403).json({ error: 'No autorizado' });

    const { rows } = await db.query(`
      SELECT
        c.id, c.nombre, c.apellido, c.email, c.estado,
        c.fecha_completado,
        json_agg(
          json_build_object(
            'dimension', d.nombre,
            'codigo', d.codigo,
            'puntaje_pct', ROUND(r.puntaje_pct::numeric, 1),
            'nivel', r.nivel,
            'orden', d.orden
          ) ORDER BY d.orden
        ) FILTER (WHERE r.id IS NOT NULL) AS resultados
      FROM candidatos c
      LEFT JOIN sesiones_prueba sp ON sp.candidato_id=c.id AND sp.estado='completada'
      LEFT JOIN resultados r ON r.sesion_id=sp.id
      LEFT JOIN dimensiones d ON d.id=r.dimension_id
      WHERE c.proceso_id=$1 AND c.estado='completado'
      GROUP BY c.id
      ORDER BY c.fecha_completado DESC
    `, [req.params.id]);

    res.json({ proceso, candidatos: rows });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener comparación' });
  }
});

// ── GET /api/rrhh/analytics ───────────────────────────────────
router.get('/analytics', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    const [
      embudo,
      porProceso,
      distribucion,
      tiempoPromedio,
      actividadDiaria,
      topDimensiones,
    ] = await Promise.all([

      // Embudo de selección
      db.query(`
        SELECT
          COUNT(*) FILTER (WHERE c.estado != 'cancelado')              AS invitados,
          COUNT(*) FILTER (WHERE c.estado IN ('en_progreso','completado')) AS iniciados,
          COUNT(*) FILTER (WHERE c.estado = 'completado')              AS completados,
          COUNT(*) FILTER (WHERE c.estado = 'expirado')                AS expirados,
          COUNT(*) FILTER (WHERE c.estado = 'pendiente')               AS pendientes
        FROM candidatos c
        JOIN procesos p ON p.id = c.proceso_id
        JOIN empresas_cliente ec ON ec.id = p.empresa_cliente_id
        WHERE ec.empresa_rrhh_id = $1
      `, [empresa_rrhh_id]),

      // Tasa de completitud por proceso (últimos 10)
      db.query(`
        SELECT
          p.nombre AS proceso,
          p.puesto,
          COUNT(c.id)                                                    AS total,
          COUNT(c.id) FILTER (WHERE c.estado = 'completado')            AS completados,
          ROUND(
            COUNT(c.id) FILTER (WHERE c.estado = 'completado') * 100.0
            / NULLIF(COUNT(c.id), 0), 1
          ) AS tasa
        FROM procesos p
        JOIN empresas_cliente ec ON ec.id = p.empresa_cliente_id
        LEFT JOIN candidatos c ON c.proceso_id = p.id
        WHERE ec.empresa_rrhh_id = $1
        GROUP BY p.id, p.nombre, p.puesto
        ORDER BY p.created_at DESC
        LIMIT 10
      `, [empresa_rrhh_id]),

      // Distribución de puntajes por dimensión
      db.query(`
        SELECT
          d.nombre AS dimension,
          d.codigo,
          ROUND(AVG(r.puntaje_pct), 1) AS promedio,
          ROUND(MIN(r.puntaje_pct), 1) AS minimo,
          ROUND(MAX(r.puntaje_pct), 1) AS maximo,
          COUNT(r.id) AS total_evaluaciones
        FROM resultados r
        JOIN dimensiones d ON d.id = r.dimension_id
        JOIN sesiones_prueba sp ON sp.id = r.sesion_id
        JOIN candidatos c ON c.id = sp.candidato_id
        JOIN procesos p ON p.id = c.proceso_id
        JOIN empresas_cliente ec ON ec.id = p.empresa_cliente_id
        WHERE ec.empresa_rrhh_id = $1
        GROUP BY d.id, d.nombre, d.codigo
        ORDER BY d.orden
      `, [empresa_rrhh_id]),

      // Tiempo promedio de evaluación en minutos
      db.query(`
        SELECT
          ROUND(AVG(
            EXTRACT(EPOCH FROM (sp.completada_at - sp.iniciada_at)) / 60
          ), 1) AS promedio_minutos,
          ROUND(MIN(
            EXTRACT(EPOCH FROM (sp.completada_at - sp.iniciada_at)) / 60
          ), 1) AS minimo_minutos,
          ROUND(MAX(
            EXTRACT(EPOCH FROM (sp.completada_at - sp.iniciada_at)) / 60
          ), 1) AS maximo_minutos
        FROM sesiones_prueba sp
        JOIN candidatos c ON c.id = sp.candidato_id
        JOIN procesos p ON p.id = c.proceso_id
        JOIN empresas_cliente ec ON ec.id = p.empresa_cliente_id
        WHERE ec.empresa_rrhh_id = $1
          AND sp.estado = 'completada'
          AND sp.completada_at IS NOT NULL
      `, [empresa_rrhh_id]),

      // Actividad diaria últimos 30 días
      db.query(`
        SELECT
          DATE(c.fecha_completado) AS fecha,
          COUNT(*) AS completados
        FROM candidatos c
        JOIN procesos p ON p.id = c.proceso_id
        JOIN empresas_cliente ec ON ec.id = p.empresa_cliente_id
        WHERE ec.empresa_rrhh_id = $1
          AND c.estado = 'completado'
          AND c.fecha_completado >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(c.fecha_completado)
        ORDER BY fecha ASC
      `, [empresa_rrhh_id]),

      // Top dimensiones más altas y más bajas
      db.query(`
        SELECT
          d.nombre AS dimension,
          d.codigo,
          ROUND(AVG(r.puntaje_pct), 1) AS promedio
        FROM resultados r
        JOIN dimensiones d ON d.id = r.dimension_id
        JOIN sesiones_prueba sp ON sp.id = r.sesion_id
        JOIN candidatos c ON c.id = sp.candidato_id
        JOIN procesos p ON p.id = c.proceso_id
        JOIN empresas_cliente ec ON ec.id = p.empresa_cliente_id
        WHERE ec.empresa_rrhh_id = $1
        GROUP BY d.id, d.nombre, d.codigo
        ORDER BY promedio DESC
      `, [empresa_rrhh_id]),
    ]);

    res.json({
      embudo:         embudo.rows[0],
      porProceso:     porProceso.rows,
      distribucion:   distribucion.rows,
      tiempoPromedio: tiempoPromedio.rows[0],
      actividadDiaria: actividadDiaria.rows,
      topDimensiones: topDimensiones.rows,
    });
  } catch(err) {
    console.error('[analytics]', err);
    res.status(500).json({ error: 'Error al obtener analytics' });
  }
});

// ══════════════════════════════════════════════════════════════
// BANCO DE PRUEBAS RRHH
// ══════════════════════════════════════════════════════════════

// ── GET /api/rrhh/banco/pruebas ──────────────────────────────
router.get('/banco/pruebas', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    const { rows } = await db.query(`
      SELECT p.*,
        COUNT(DISTINCT d.id) AS total_dimensiones,
        COUNT(DISTINCT i.id) AS total_items_real
      FROM pruebas p
      LEFT JOIN dimensiones d ON d.prueba_id = p.id
      LEFT JOIN items i ON i.prueba_id = p.id
      WHERE p.empresa_rrhh_id = $1
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `, [empresa_rrhh_id]);
    res.json(rows);
  } catch(err) { res.status(500).json({ error: 'Error al obtener pruebas' }); }
});

// ── POST /api/rrhh/banco/pruebas ─────────────────────────────
router.post('/banco/pruebas', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  const { nombre, descripcion, tipo, categoria, escala_tipo, tiempo_limite, instrucciones } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
  try {
    const { rows } = await db.query(`
      INSERT INTO pruebas (nombre, descripcion, tipo, categoria, escala_tipo, tiempo_limite, instrucciones, empresa_rrhh_id, activa, total_items)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,0) RETURNING *
    `, [nombre, descripcion, tipo||'personalidad', categoria||tipo||'personalidad', escala_tipo||'likert5', tiempo_limite||null, instrucciones, empresa_rrhh_id]);
    res.status(201).json(rows[0]);
  } catch(err) { console.error(err); res.status(500).json({ error: 'Error al crear prueba' }); }
});

// ── PUT /api/rrhh/banco/pruebas/:id ──────────────────────────
router.put('/banco/pruebas/:id', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  const { nombre, descripcion, tipo, escala_tipo, tiempo_limite, instrucciones, activa } = req.body;
  try {
    const { rows } = await db.query(`
      UPDATE pruebas SET nombre=$1,descripcion=$2,tipo=$3,escala_tipo=$4,tiempo_limite=$5,instrucciones=$6,activa=$7
      WHERE id=$8 AND empresa_rrhh_id=$9 RETURNING *
    `, [nombre, descripcion, tipo, escala_tipo, tiempo_limite||null, instrucciones, activa, req.params.id, empresa_rrhh_id]);
    if (!rows.length) return res.status(403).json({ error: 'No autorizado' });
    res.json(rows[0]);
  } catch(err) { res.status(500).json({ error: 'Error al actualizar' }); }
});

// ── DELETE /api/rrhh/banco/pruebas/:id ───────────────────────
router.delete('/banco/pruebas/:id', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    // Verificar que pertenece a esta empresa
    const { rows: [p] } = await db.query(
      'SELECT id FROM pruebas WHERE id=$1 AND empresa_rrhh_id=$2',
      [req.params.id, empresa_rrhh_id]
    );
    if (!p) return res.status(403).json({ error: 'No autorizado' });

    // Eliminar en cascada
    await db.query('DELETE FROM opciones_item WHERE item_id IN (SELECT id FROM items WHERE prueba_id=$1)', [req.params.id]);
    await db.query('DELETE FROM items WHERE prueba_id=$1', [req.params.id]);
    await db.query('DELETE FROM dimensiones WHERE prueba_id=$1', [req.params.id]);
    await db.query('DELETE FROM rrhh_pruebas WHERE prueba_id=$1', [req.params.id]);
    await db.query('DELETE FROM pruebas WHERE id=$1', [req.params.id]);

    res.json({ ok: true });
  } catch(err) { console.error(err); res.status(500).json({ error: 'Error al eliminar' }); }
});

// ── GET /api/rrhh/banco/pruebas/:id/dimensiones ──────────────
router.get('/banco/pruebas/:id/dimensiones', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    const { rows } = await db.query(`
      SELECT d.* FROM dimensiones d
      JOIN pruebas p ON p.id = d.prueba_id
      WHERE d.prueba_id=$1 AND p.empresa_rrhh_id=$2
      ORDER BY d.orden
    `, [req.params.id, empresa_rrhh_id]);
    res.json(rows);
  } catch(err) { res.status(500).json({ error: 'Error' }); }
});

// ── POST /api/rrhh/banco/pruebas/:id/dimensiones ─────────────
router.post('/banco/pruebas/:id/dimensiones', async (req, res) => {
  const { nombre, codigo, descripcion, orden } = req.body;
  try {
    const { rows } = await db.query(
      'INSERT INTO dimensiones (prueba_id,nombre,codigo,descripcion,orden) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.params.id, nombre, codigo, descripcion, orden||0]
    );
    res.status(201).json(rows[0]);
  } catch(err) { res.status(500).json({ error: 'Error al crear dimensión' }); }
});

// ── GET /api/rrhh/banco/pruebas/:id/items ────────────────────
router.get('/banco/pruebas/:id/items', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    const { rows } = await db.query(`
      SELECT i.*, d.nombre AS dimension_nombre, d.codigo AS dimension_codigo,
        json_agg(json_build_object('id',op.id,'texto',op.texto,'valor',op.valor,'orden',op.orden)
          ORDER BY op.orden) FILTER (WHERE op.id IS NOT NULL) AS opciones
      FROM items i
      JOIN pruebas p ON p.id = i.prueba_id
      LEFT JOIN dimensiones d ON d.id = i.dimension_id
      LEFT JOIN opciones_item op ON op.item_id = i.id
      WHERE i.prueba_id=$1 AND p.empresa_rrhh_id=$2
      GROUP BY i.id, d.nombre, d.codigo
      ORDER BY i.orden
    `, [req.params.id, empresa_rrhh_id]);
    res.json(rows);
  } catch(err) { res.status(500).json({ error: 'Error' }); }
});

// ── POST /api/rrhh/banco/pruebas/:id/items ───────────────────
router.post('/banco/pruebas/:id/items', async (req, res) => {
  const { texto, dimension_id, orden, opciones } = req.body;
  try {
    const { rows: [item] } = await db.query(
      'INSERT INTO items (prueba_id,dimension_id,texto,orden,activo) VALUES ($1,$2,$3,$4,true) RETURNING *',
      [req.params.id, dimension_id||null, texto, orden||0]
    );
    if (opciones?.length) {
      for (const op of opciones) {
        await db.query('INSERT INTO opciones_item (item_id,texto,valor,orden) VALUES ($1,$2,$3,$4)',
          [item.id, op.texto, op.valor, op.orden]);
      }
    }
    await db.query('UPDATE pruebas SET total_items=(SELECT COUNT(*) FROM items WHERE prueba_id=$1) WHERE id=$1', [req.params.id]);
    res.status(201).json(item);
  } catch(err) { res.status(500).json({ error: 'Error al crear ítem' }); }
});

// ── PUT /api/rrhh/banco/items/:id ────────────────────────────
router.put('/banco/items/:id', async (req, res) => {
  const { texto, dimension_id, orden, opciones } = req.body;
  try {
    const { rows } = await db.query(
      'UPDATE items SET texto=$1,dimension_id=$2,orden=$3 WHERE id=$4 RETURNING *',
      [texto, dimension_id||null, orden, req.params.id]
    );
    if (opciones?.length) {
      for (const op of opciones) {
        if (op.id) await db.query('UPDATE opciones_item SET texto=$1 WHERE id=$2', [op.texto, op.id]);
      }
    }
    res.json(rows[0]);
  } catch(err) { res.status(500).json({ error: 'Error al actualizar ítem' }); }
});

// ── DELETE /api/rrhh/banco/items/:id ─────────────────────────
router.delete('/banco/items/:id', async (req, res) => {
  try {
    const { rows: [item] } = await db.query('DELETE FROM items WHERE id=$1 RETURNING prueba_id', [req.params.id]);
    if (item) await db.query('UPDATE pruebas SET total_items=(SELECT COUNT(*) FROM items WHERE prueba_id=$1) WHERE id=$1', [item.prueba_id]);
    res.json({ ok: true });
  } catch(err) { res.status(500).json({ error: 'Error al eliminar ítem' }); }
});

// ── DELETE /api/rrhh/banco/dimensiones/:id ───────────────────
router.delete('/banco/dimensiones/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM dimensiones WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch(err) { res.status(500).json({ error: 'Error al eliminar dimensión' }); }
});

// ── POST /api/rrhh/candidatos/:id/reenviar ───────────────────
router.post('/candidatos/:id/reenviar', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    const { rows: [c] } = await db.query(`
      SELECT c.*, p.nombre AS proceso_nombre, p.puesto,
             e.nombre AS empresa_nombre
      FROM candidatos c
      JOIN procesos p ON p.id = c.proceso_id
      JOIN empresas_cliente ec ON ec.id = p.empresa_cliente_id
      JOIN empresas_rrhh e ON e.id = ec.empresa_rrhh_id
      WHERE c.id = $1 AND ec.empresa_rrhh_id = $2
    `, [req.params.id, empresa_rrhh_id]);

    if (!c) return res.status(404).json({ error: 'Candidato no encontrado' });
    if (c.estado === 'completado') return res.status(400).json({ error: 'El candidato ya completó la evaluación' });

    const link = `${process.env.APP_URL || 'http://localhost:5173'}/evaluacion/${c.token_acceso}`;
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT || '587'),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: c.email,
      subject: `Recordatorio: ${c.empresa_nombre} te invita a completar tu evaluación`,
      html: `<div style="font-family:sans-serif;max-width:520px;margin:auto">
        <h2 style="color:#2563EB">Hola ${c.nombre},</h2>
        <p>Te recordamos que <strong>${c.empresa_nombre}</strong> te ha invitado a completar una evaluación psicométrica para el puesto de <strong>${c.puesto || c.proceso_nombre}</strong>.</p>
        <p style="margin:28px 0">
          <a href="${link}" style="background:#2563EB;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600">Completar evaluación →</a>
        </p>
        <p style="color:#64748B;font-size:13px">Si ya completaste la evaluación, ignora este mensaje.</p>
        <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0">
        <p style="color:#94A3B8;font-size:12px">Powered by Aptia</p>
      </div>`,
    });

    res.json({ ok: true, email: c.email, link });
  } catch(err) {
    console.error('[reenviar]', err.message);
    res.status(500).json({ error: 'Error al reenviar el link' });
  }
});

// ══════════════════════════════════════════════════════════════
// GESTIÓN DE USUARIOS RRHH
// ══════════════════════════════════════════════════════════════

// ── GET /api/rrhh/usuarios ───────────────────────────────────
router.get('/usuarios', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    const { rows } = await db.query(`
      SELECT id, nombre, email, rol, permisos, activo, ultimo_acceso, created_at
      FROM usuarios_rrhh
      WHERE empresa_rrhh_id = $1
      ORDER BY created_at ASC
    `, [empresa_rrhh_id]);
    res.json(rows);
  } catch(err) { res.status(500).json({ error: 'Error al obtener usuarios' }); }
});

// ── POST /api/rrhh/usuarios ──────────────────────────────────
router.post('/usuarios', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  const { nombre, email, password, permisos } = req.body;
  if (!nombre || !email || !password) return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
  try {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(password, 12);
    const { rows: [usuario] } = await db.query(`
      INSERT INTO usuarios_rrhh (empresa_rrhh_id, nombre, email, password_hash, rol, permisos, activo)
      VALUES ($1, $2, $3, $4, 'usuario', $5, true)
      RETURNING id, nombre, email, rol, permisos, activo, created_at
    `, [empresa_rrhh_id, nombre, email.toLowerCase(), hash, JSON.stringify(permisos || {})]);
    res.status(201).json(usuario);
  } catch(err) {
    if (err.code === '23505') return res.status(409).json({ error: 'El email ya está registrado' });
    console.error('[POST /rrhh/usuarios]', err.message);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// ── PUT /api/rrhh/usuarios/:id ───────────────────────────────
router.put('/usuarios/:id', async (req, res) => {
  const { empresa_rrhh_id, id: userId, sub_rol } = req.user;
  // Solo admins pueden editar usuarios
  if (sub_rol !== 'admin') return res.status(403).json({ error: 'Solo administradores pueden editar usuarios' });
  // No puede editarse a sí mismo los permisos
  if (req.params.id === userId) return res.status(400).json({ error: 'No puedes editar tu propio usuario desde aquí' });
  const { nombre, email, password, permisos, activo } = req.body;
  try {
    // Verificar que pertenece a esta empresa
    const { rows: [u] } = await db.query(
      'SELECT * FROM usuarios_rrhh WHERE id=$1 AND empresa_rrhh_id=$2',
      [req.params.id, empresa_rrhh_id]
    );
    if (!u) return res.status(403).json({ error: 'No autorizado' });
    if (u.rol === 'admin' && activo === false) return res.status(400).json({ error: 'No puedes desactivar al administrador' });

    let password_hash = u.password_hash;
    if (password) {
      const bcrypt = require('bcryptjs');
      password_hash = await bcrypt.hash(password, 12);
    }

    const { rows: [updated] } = await db.query(`
      UPDATE usuarios_rrhh
      SET nombre=$1, email=$2, password_hash=$3, permisos=$4, activo=$5, updated_at=NOW()
      WHERE id=$6 AND empresa_rrhh_id=$7
      RETURNING id, nombre, email, rol, permisos, activo
    `, [nombre || u.nombre, email?.toLowerCase() || u.email, password_hash,
        JSON.stringify(permisos ?? u.permisos), activo ?? u.activo,
        req.params.id, empresa_rrhh_id]);
    res.json(updated);
  } catch(err) {
    console.error('[PUT /rrhh/usuarios]', err.message);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// ── DELETE /api/rrhh/usuarios/:id ────────────────────────────
router.delete('/usuarios/:id', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    const { rows: [u] } = await db.query(
      'SELECT rol FROM usuarios_rrhh WHERE id=$1 AND empresa_rrhh_id=$2',
      [req.params.id, empresa_rrhh_id]
    );
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (u.rol === 'admin') return res.status(400).json({ error: 'No puedes eliminar al administrador' });
    await db.query('DELETE FROM usuarios_rrhh WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch(err) { res.status(500).json({ error: 'Error al eliminar usuario' }); }
});

// ── DELETE /api/rrhh/empresas-cliente/:id ────────────────────
router.delete('/empresas-cliente/:id', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    const { rows: [ec] } = await db.query(
      'SELECT id, nombre FROM empresas_cliente WHERE id=$1 AND empresa_rrhh_id=$2',
      [req.params.id, empresa_rrhh_id]
    );
    if (!ec) return res.status(404).json({ error: 'Empresa no encontrada' });

    // Eliminar en cascada
    const { rows: procesos } = await db.query(
      'SELECT id FROM procesos WHERE empresa_cliente_id=$1', [req.params.id]
    );
    for (const p of procesos) {
      await db.query('DELETE FROM proceso_pruebas WHERE proceso_id=$1', [p.id]);
      const { rows: cands } = await db.query('SELECT id FROM candidatos WHERE proceso_id=$1', [p.id]);
      for (const c of cands) {
        await db.query('DELETE FROM respuestas WHERE sesion_id IN (SELECT id FROM sesiones_prueba WHERE candidato_id=$1)', [c.id]);
        await db.query('DELETE FROM resultados WHERE sesion_id IN (SELECT id FROM sesiones_prueba WHERE candidato_id=$1)', [c.id]);
        await db.query('DELETE FROM sesiones_prueba WHERE candidato_id=$1', [c.id]);
        await db.query('DELETE FROM informes WHERE candidato_id=$1', [c.id]);
      }
      await db.query('DELETE FROM candidatos WHERE proceso_id=$1', [p.id]);
    }
    await db.query('DELETE FROM procesos WHERE empresa_cliente_id=$1', [req.params.id]);
    await db.query('DELETE FROM usuarios_empresa WHERE empresa_cliente_id=$1', [req.params.id]);
    await db.query('DELETE FROM empresas_cliente WHERE id=$1', [req.params.id]);

    res.json({ ok: true });
  } catch(err) {
    console.error('[DELETE empresa-cliente]', err.message);
    res.status(500).json({ error: 'Error al eliminar empresa' });
  }
});

// ══════════════════════════════════════════════════════════════
// SUB-LICENCIAS POR EMPRESA CLIENTE
// ══════════════════════════════════════════════════════════════

// ── GET /api/rrhh/empresas-cliente/:id/sublicencia ───────────
router.get('/empresas-cliente/:id/sublicencia', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    const { rows: [sub] } = await db.query(`
      SELECT s.*,
        ec.nombre AS empresa_nombre,
        s.candidatos_asignados - s.candidatos_usados AS disponibles
      FROM sublicencias s
      JOIN empresas_cliente ec ON ec.id = s.empresa_cliente_id
      WHERE s.empresa_cliente_id = $1 AND s.empresa_rrhh_id = $2
      ORDER BY s.created_at DESC LIMIT 1
    `, [req.params.id, empresa_rrhh_id]);
    res.json(sub || null);
  } catch(err) { res.status(500).json({ error: 'Error al obtener sublicencia' }); }
});

// ── POST /api/rrhh/empresas-cliente/:id/sublicencia ──────────
router.post('/empresas-cliente/:id/sublicencia', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  const { candidatos_asignados, fecha_vencimiento } = req.body;

  if (!candidatos_asignados || candidatos_asignados < 1)
    return res.status(400).json({ error: 'Debes asignar al menos 1 candidato' });

  try {
    // Verificar que la empresa cliente pertenece al RRHH
    const { rows: [ec] } = await db.query(
      'SELECT id FROM empresas_cliente WHERE id=$1 AND empresa_rrhh_id=$2',
      [req.params.id, empresa_rrhh_id]
    );
    if (!ec) return res.status(403).json({ error: 'No autorizado' });

    // Verificar disponibilidad en licencia RRHH
    const { rows: [lic] } = await db.query(`
      SELECT COALESCE(SUM(candidatos_total - candidatos_usados), 0) AS disponibles
      FROM licencias
      WHERE empresa_rrhh_id=$1 AND activa=true AND fecha_vencimiento >= CURRENT_DATE
    `, [empresa_rrhh_id]);

    // Calcular cuánto ya está asignado a otras sub-licencias activas
    const { rows: [asignado] } = await db.query(`
      SELECT COALESCE(SUM(candidatos_asignados - candidatos_usados), 0) AS total_asignado
      FROM sublicencias
      WHERE empresa_rrhh_id=$1 AND activa=true AND empresa_cliente_id != $2
    `, [empresa_rrhh_id, req.params.id]);

    const pool_disponible = parseInt(lic.disponibles) - parseInt(asignado.total_asignado);

    if (candidatos_asignados > pool_disponible)
      return res.status(400).json({
        error: `Solo tienes ${pool_disponible} candidatos disponibles para asignar`
      });

    // Crear o actualizar sublicencia
    const { rows: [sub] } = await db.query(`
      INSERT INTO sublicencias (empresa_cliente_id, empresa_rrhh_id, candidatos_asignados, fecha_vencimiento, activa)
      VALUES ($1, $2, $3, $4, true)
      ON CONFLICT (empresa_cliente_id, empresa_rrhh_id) DO UPDATE
        SET candidatos_asignados = $3,
            fecha_vencimiento = $4,
            activa = true,
            updated_at = NOW()
      RETURNING *
    `, [req.params.id, empresa_rrhh_id, candidatos_asignados, fecha_vencimiento || null]);

    res.status(201).json(sub);
  } catch(err) {
    console.error('[POST sublicencia]', err.message);
    res.status(500).json({ error: 'Error al crear sublicencia' });
  }
});

// ── DELETE /api/rrhh/empresas-cliente/:id/sublicencia ────────
router.delete('/empresas-cliente/:id/sublicencia', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    await db.query(
      'UPDATE sublicencias SET activa=false WHERE empresa_cliente_id=$1 AND empresa_rrhh_id=$2',
      [req.params.id, empresa_rrhh_id]
    );
    res.json({ ok: true });
  } catch(err) { res.status(500).json({ error: 'Error al revocar sublicencia' }); }
});

// ══════════════════════════════════════════════════════════════
// MAPA DE TALENTO
// ══════════════════════════════════════════════════════════════

// ── GET /api/rrhh/mapa-talento ───────────────────────────────
router.get('/mapa-talento', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  const { proceso_id, empresa_cliente_id, prueba_tipo } = req.query;
  try {
    let where = `ec.empresa_rrhh_id = $1 AND c.estado = 'completado'`;
    const params = [empresa_rrhh_id];
    let idx = 2;

    if (proceso_id) {
      where += ` AND p.id = $${idx++}`;
      params.push(proceso_id);
    }
    if (empresa_cliente_id) {
      where += ` AND ec.id = $${idx++}`;
      params.push(empresa_cliente_id);
    }

    const { rows } = await db.query(`
      SELECT
        c.id, c.nombre, c.apellido, c.email,
        p.nombre AS proceso_nombre, p.puesto,
        ec.nombre AS empresa_nombre,
        pr.nombre AS prueba_nombre, pr.tipo AS prueba_tipo,
        json_agg(
          json_build_object(
            'dimension', d.nombre,
            'codigo', d.codigo,
            'puntaje', res.puntaje_pct
          ) ORDER BY d.orden
        ) FILTER (WHERE d.id IS NOT NULL) AS resultados
      FROM candidatos c
      JOIN procesos p ON p.id = c.proceso_id
      JOIN empresas_cliente ec ON ec.id = p.empresa_cliente_id
      JOIN sesiones_prueba sp ON sp.candidato_id = c.id
      JOIN pruebas pr ON pr.id = sp.prueba_id
      JOIN resultados res ON res.sesion_id = sp.id
      JOIN dimensiones d ON d.id = res.dimension_id
      WHERE ${where}
      ${prueba_tipo ? `AND pr.tipo = '${prueba_tipo}'` : ''}
      GROUP BY c.id, p.nombre, p.puesto, ec.nombre, pr.nombre, pr.tipo
      ORDER BY c.created_at DESC
    `, params);
    res.json(rows);
  } catch(err) {
    console.error('[mapa-talento]', err.message);
    res.status(500).json({ error: 'Error al obtener mapa de talento' });
  }
});

// ── GET /api/rrhh/candidatos/:id/reporte-pdf ─────────────────
router.get('/candidatos/:id/reporte-pdf', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    const { rows: [data] } = await db.query(`
      SELECT
        c.*,
        p.nombre AS proceso_nombre, p.puesto,
        ec.nombre AS empresa_cliente_nombre,
        e.nombre AS empresa_rrhh_nombre,
        json_agg(DISTINCT jsonb_build_object(
          'prueba_nombre', pr.nombre,
          'prueba_tipo', pr.tipo,
          'dimension', d.nombre,
          'codigo', d.codigo,
          'puntaje', res.puntaje_pct,
          'nivel', res.nivel
        )) FILTER (WHERE d.id IS NOT NULL) AS resultados,
        inf.contenido_texto AS informe
      FROM candidatos c
      JOIN procesos p ON p.id = c.proceso_id
      JOIN empresas_cliente ec ON ec.id = p.empresa_cliente_id
      JOIN empresas_rrhh e ON e.id = ec.empresa_rrhh_id
      LEFT JOIN sesiones_prueba sp ON sp.candidato_id = c.id
      LEFT JOIN pruebas pr ON pr.id = sp.prueba_id
      LEFT JOIN resultados res ON res.sesion_id = sp.id
      LEFT JOIN dimensiones d ON d.id = res.dimension_id
      LEFT JOIN informes inf ON inf.candidato_id = c.id
      WHERE c.id = $1 AND e.id = $2
      GROUP BY c.id, p.nombre, p.puesto, ec.nombre, e.nombre, inf.contenido_texto
    `, [req.params.id, empresa_rrhh_id]);

    if (!data) return res.status(404).json({ error: 'Candidato no encontrado' });
    res.json(data);
  } catch(err) {
    console.error('[reporte-pdf]', err.message);
    res.status(500).json({ error: 'Error al obtener datos del reporte' });
  }
});

// ══════════════════════════════════════════════════════════════
// LOG DE ACTIVIDAD
// ══════════════════════════════════════════════════════════════

// ── GET /api/rrhh/actividad ──────────────────────────────────
router.get('/actividad', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  const { page = 1, tipo, limite = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limite);
  try {
    let where = 'WHERE empresa_rrhh_id = $1';
    const params = [empresa_rrhh_id];
    if (tipo) { where += ` AND tipo = $${params.length + 1}`; params.push(tipo); }

    const { rows } = await db.query(`
      SELECT * FROM activity_log
      ${where}
      ORDER BY created_at DESC
      LIMIT ${parseInt(limite)} OFFSET ${offset}
    `, params);

    const { rows: [{ total }] } = await db.query(
      `SELECT COUNT(*) AS total FROM activity_log ${where}`, params
    );

    res.json({ logs: rows, total: parseInt(total), page: parseInt(page) });
  } catch(err) {
    console.error('[actividad]', err.message);
    res.status(500).json({ error: 'Error al obtener actividad' });
  }
});

// ══════════════════════════════════════════════════════════════
// ONBOARDING
// ══════════════════════════════════════════════════════════════

// ── GET /api/rrhh/onboarding-status ─────────────────────────
router.get('/onboarding-status', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    const { rows: [empresa] } = await db.query(
      'SELECT onboarding_completado, nombre, sector, pais FROM empresas_rrhh WHERE id=$1',
      [empresa_rrhh_id]
    );
    res.json({ completado: empresa?.onboarding_completado || false, empresa });
  } catch(err) { res.status(500).json({ error: 'Error' }); }
});

// ── PUT /api/rrhh/onboarding-perfil ──────────────────────────
router.put('/onboarding-perfil', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  const { nombre, sector, pais, ciudad, telefono, sitio_web } = req.body;
  try {
    const { rows: [empresa] } = await db.query(
      `UPDATE empresas_rrhh SET nombre=$1, sector=$2, pais=$3, ciudad=$4, telefono=$5, sitio_web=$6
       WHERE id=$7 RETURNING *`,
      [nombre, sector, pais, ciudad, telefono, sitio_web, empresa_rrhh_id]
    );
    res.json(empresa);
  } catch(err) { res.status(500).json({ error: 'Error al actualizar perfil' }); }
});

// ── POST /api/rrhh/onboarding-completar ──────────────────────
router.post('/onboarding-completar', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    await db.query(
      'UPDATE empresas_rrhh SET onboarding_completado=true WHERE id=$1',
      [empresa_rrhh_id]
    );
    await logActividad(db, empresa_rrhh_id, req.user, 'onboarding_completado',
      'Onboarding completado exitosamente', {});
    res.json({ ok: true });
  } catch(err) { res.status(500).json({ error: 'Error' }); }
});

// ── DELETE /api/rrhh/procesos/:id ────────────────────────────
router.delete('/procesos/:id', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    const { rows: [proceso] } = await db.query(`
      SELECT p.id, p.nombre FROM procesos p
      JOIN empresas_cliente ec ON ec.id = p.empresa_cliente_id
      WHERE p.id = $1 AND ec.empresa_rrhh_id = $2
    `, [req.params.id, empresa_rrhh_id]);
    if (!proceso) return res.status(404).json({ error: 'Proceso no encontrado' });

    await db.query('DELETE FROM proceso_pruebas WHERE proceso_id=$1', [req.params.id]);
    const { rows: cands } = await db.query('SELECT id FROM candidatos WHERE proceso_id=$1', [req.params.id]);
    for (const c of cands) {
      await db.query('DELETE FROM respuestas WHERE sesion_id IN (SELECT id FROM sesiones_prueba WHERE candidato_id=$1)', [c.id]);
      await db.query('DELETE FROM resultados WHERE sesion_id IN (SELECT id FROM sesiones_prueba WHERE candidato_id=$1)', [c.id]);
      await db.query('DELETE FROM sesiones_prueba WHERE candidato_id=$1', [c.id]);
      await db.query('DELETE FROM informes WHERE candidato_id=$1', [c.id]);
    }
    await db.query('DELETE FROM candidatos WHERE proceso_id=$1', [req.params.id]);
    await db.query('DELETE FROM procesos WHERE id=$1', [req.params.id]);

    await logActividad(db, empresa_rrhh_id, req.user, 'proceso_eliminado',
      `Proceso "${proceso.nombre}" eliminado`, { proceso_id: req.params.id });

    res.json({ ok: true });
  } catch(err) {
    console.error('[DELETE proceso]', err.message);
    res.status(500).json({ error: 'Error al eliminar proceso' });
  }
});

module.exports = router;