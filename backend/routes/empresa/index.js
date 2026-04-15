const router   = require('express').Router();
const db       = require('../../db');
const { auth, checkRol } = require('../../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

router.use(auth, checkRol('empresa'));

// ── GET /api/empresa/dashboard ───────────────────────────────
router.get('/dashboard', async (req, res) => {
  const { empresa_cliente_id } = req.user;
  try {
    const [procesos, invitados, completados, informes] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM procesos WHERE empresa_cliente_id=$1 AND estado='activo'`, [empresa_cliente_id]),
      db.query(`SELECT COUNT(*) FROM candidatos c JOIN procesos p ON p.id=c.proceso_id WHERE p.empresa_cliente_id=$1`, [empresa_cliente_id]),
      db.query(`SELECT COUNT(*) FROM candidatos c JOIN procesos p ON p.id=c.proceso_id WHERE p.empresa_cliente_id=$1 AND c.estado='completado'`, [empresa_cliente_id]),
      db.query(`SELECT COUNT(*) FROM informes i JOIN candidatos c ON c.id=i.candidato_id JOIN procesos p ON p.id=c.proceso_id WHERE p.empresa_cliente_id=$1`, [empresa_cliente_id]),
    ]);
    res.json({
      procesos_activos:    parseInt(procesos.rows[0].count),
      candidatos_invitados: parseInt(invitados.rows[0].count),
      evaluaciones_completas: parseInt(completados.rows[0].count),
      informes_generados:  parseInt(informes.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: 'Error en dashboard' });
  }
});

// ── GET /api/empresa/procesos ─────────────────────────────────
router.get('/procesos', async (req, res) => {
  const { empresa_cliente_id } = req.user;
  try {
    const { rows } = await db.query(`
      SELECT p.*,
        u.nombre AS creado_por_nombre,
        COUNT(DISTINCT c.id)                                        AS total_candidatos,
        COUNT(DISTINCT c.id) FILTER (WHERE c.estado='completado')  AS completados,
        COUNT(DISTINCT c.id) FILTER (WHERE c.estado='pendiente')   AS pendientes
      FROM procesos p
      LEFT JOIN candidatos c     ON c.proceso_id = p.id
      LEFT JOIN usuarios_empresa u ON u.id = p.creado_por
      WHERE p.empresa_cliente_id = $1
      GROUP BY p.id, u.nombre
      ORDER BY p.created_at DESC
    `, [empresa_cliente_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener procesos' });
  }
});

// ── POST /api/empresa/procesos ────────────────────────────────
router.post('/procesos', async (req, res) => {
  const { empresa_cliente_id, id: creado_por } = req.user;
  const { nombre, puesto, descripcion, fecha_inicio, fecha_limite, prueba_ids } = req.body;

  if (!nombre || !prueba_ids?.length) {
    return res.status(400).json({ error: 'Nombre y al menos una prueba son requeridos' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [proceso] } = await client.query(
      `INSERT INTO procesos (empresa_cliente_id, creado_por, nombre, puesto, descripcion, fecha_inicio, fecha_limite)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [empresa_cliente_id, creado_por, nombre, puesto, descripcion, fecha_inicio, fecha_limite]
    );
    for (let i = 0; i < prueba_ids.length; i++) {
      await client.query(
        `INSERT INTO proceso_pruebas (proceso_id, prueba_id, orden) VALUES ($1,$2,$3)`,
        [proceso.id, prueba_ids[i], i]
      );
    }
    await client.query('COMMIT');
    res.status(201).json(proceso);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Error al crear proceso' });
  } finally {
    client.release();
  }
});

// ── GET /api/empresa/procesos/:id/candidatos ─────────────────
router.get('/procesos/:id/candidatos', async (req, res) => {
  const { empresa_cliente_id } = req.user;
  try {
    const { rows: [proceso] } = await db.query(
      'SELECT id FROM procesos WHERE id=$1 AND empresa_cliente_id=$2',
      [req.params.id, empresa_cliente_id]
    );
    if (!proceso) return res.status(404).json({ error: 'Proceso no encontrado' });

    const { rows } = await db.query(`
      SELECT c.*,
        json_agg(json_build_object(
          'prueba_id', sp.prueba_id,
          'estado', sp.estado,
          'completada_at', sp.completada_at
        )) FILTER (WHERE sp.id IS NOT NULL) AS sesiones
      FROM candidatos c
      LEFT JOIN sesiones_prueba sp ON sp.candidato_id = c.id
      WHERE c.proceso_id = $1
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `, [req.params.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener candidatos' });
  }
});

// ── POST /api/empresa/procesos/:id/candidatos ─────────────────
// Invitar uno o varios candidatos (envía email con link)
router.post('/procesos/:id/candidatos', async (req, res) => {
  const { empresa_cliente_id, empresa_nombre } = req.user;
  const { candidatos } = req.body; // [{ nombre, apellido, email }]

  if (!candidatos?.length) return res.status(400).json({ error: 'Lista de candidatos requerida' });

  const { rows: [proceso] } = await db.query(
    'SELECT * FROM procesos WHERE id=$1 AND empresa_cliente_id=$2',
    [req.params.id, empresa_cliente_id]
  );
  if (!proceso) return res.status(404).json({ error: 'Proceso no encontrado' });

  const creados = [];
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

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
        from: process.env.SMTP_FROM,
        to: candidato.email,
        subject: `${empresa_nombre} te invita a una evaluación`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:auto">
            <h2 style="color:#2563EB">Hola ${candidato.nombre},</h2>
            <p><strong>${empresa_nombre}</strong> te ha invitado a completar una evaluación psicométrica como parte del proceso de selección para el puesto de <strong>${proceso.puesto || proceso.nombre}</strong>.</p>
            <p style="margin:28px 0">
              <a href="${link}" style="background:#2563EB;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600">
                Comenzar evaluación →
              </a>
            </p>
            <p style="color:#64748B;font-size:13px">Este enlace es personal e intransferible. Expira en 7 días.</p>
            <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0">
            <p style="color:#94A3B8;font-size:12px">Powered by Aptia · Plataforma psicométrica</p>
          </div>
        `,
      });
    } catch {}
  }

  res.status(201).json({ invitados: creados.length, candidatos: creados });
});

// ── GET /api/empresa/pruebas ──────────────────────────────────
// Pruebas disponibles para esta empresa (según licencia de su RRHH)
router.get('/pruebas', async (req, res) => {
  const { empresa_cliente_id } = req.user;
  try {
    const { rows } = await db.query(`
      SELECT p.id, p.nombre, p.tipo, p.descripcion, p.tiempo_limite, p.total_items, p.escala_tipo
      FROM pruebas p
      JOIN rrhh_pruebas rp ON rp.prueba_id = p.id
      JOIN empresas_cliente ec ON ec.empresa_rrhh_id = rp.empresa_rrhh_id
      WHERE ec.id = $1 AND rp.habilitada = true AND p.activa = true
      ORDER BY p.nombre
    `, [empresa_cliente_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener pruebas' });
  }
});

module.exports = router;

// ── GET /api/empresa/reportes ─────────────────────────────────
router.get('/reportes', async (req, res) => {
  const { empresa_cliente_id } = req.user;
  try {
    const { rows } = await db.query(`
      SELECT
        c.id, c.nombre, c.apellido, c.email, c.estado,
        c.fecha_completado, c.created_at,
        p.nombre AS proceso_nombre, p.puesto,
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
      LEFT JOIN sesiones_prueba sp ON sp.candidato_id = c.id AND sp.estado = 'completada'
      LEFT JOIN resultados r ON r.sesion_id = sp.id
      LEFT JOIN dimensiones d ON d.id = r.dimension_id
      LEFT JOIN informes inf ON inf.candidato_id = c.id
      WHERE p.empresa_cliente_id = $1 AND c.estado = 'completado'
      GROUP BY c.id, p.nombre, p.puesto, inf.contenido_texto
      ORDER BY c.fecha_completado DESC
    `, [empresa_cliente_id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener reportes' });
  }
});

// ── GET /api/empresa/candidatos-todos ────────────────────────
router.get('/candidatos-todos', async (req, res) => {
  const { empresa_cliente_id } = req.user;
  try {
    const { rows } = await db.query(`
      SELECT c.*, p.nombre AS proceso_nombre, p.puesto,
        json_agg(json_build_object('dimension',d.nombre,'codigo',d.codigo,'puntaje_pct',r.puntaje_pct,'nivel',r.nivel) ORDER BY d.orden)
          FILTER (WHERE r.id IS NOT NULL) AS resultados,
        inf.contenido_texto AS informe
      FROM candidatos c
      JOIN procesos p ON p.id = c.proceso_id
      LEFT JOIN sesiones_prueba sp ON sp.candidato_id=c.id AND sp.estado='completada'
      LEFT JOIN resultados r ON r.sesion_id=sp.id
      LEFT JOIN dimensiones d ON d.id=r.dimension_id
      LEFT JOIN informes inf ON inf.candidato_id=c.id
      WHERE p.empresa_cliente_id=$1
      GROUP BY c.id, p.nombre, p.puesto, inf.contenido_texto
      ORDER BY c.created_at DESC
    `, [empresa_cliente_id]);
    res.json(rows);
  } catch(err) { console.error(err); res.status(500).json({ error: 'Error al obtener candidatos' }); }
});

// ── DELETE /api/empresa/procesos/:id ─────────────────────────
router.delete('/procesos/:id', async (req, res) => {
  const { empresa_cliente_id } = req.user;
  try {
    const { rows: [proceso] } = await db.query(
      'SELECT id FROM procesos WHERE id=$1 AND empresa_cliente_id=$2',
      [req.params.id, empresa_cliente_id]
    );
    if (!proceso) return res.status(403).json({ error: 'No autorizado' });

    // Eliminar en cascada: respuestas → resultados → sesiones → candidatos → proceso
    await db.query(`DELETE FROM respuestas WHERE sesion_id IN (SELECT id FROM sesiones_prueba WHERE candidato_id IN (SELECT id FROM candidatos WHERE proceso_id=$1))`, [req.params.id]);
    await db.query(`DELETE FROM resultados  WHERE sesion_id IN (SELECT id FROM sesiones_prueba WHERE candidato_id IN (SELECT id FROM candidatos WHERE proceso_id=$1))`, [req.params.id]);
    await db.query(`DELETE FROM informes    WHERE candidato_id IN (SELECT id FROM candidatos WHERE proceso_id=$1)`, [req.params.id]);
    await db.query(`DELETE FROM sesiones_prueba WHERE candidato_id IN (SELECT id FROM candidatos WHERE proceso_id=$1)`, [req.params.id]);
    await db.query(`DELETE FROM candidatos  WHERE proceso_id=$1`, [req.params.id]);
    await db.query(`DELETE FROM proceso_pruebas WHERE proceso_id=$1`, [req.params.id]);
    await db.query(`DELETE FROM procesos    WHERE id=$1`, [req.params.id]);

    res.json({ ok: true });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar proceso' });
  }
});