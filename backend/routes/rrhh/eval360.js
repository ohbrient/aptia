// ══════════════════════════════════════════════════════════
// EVALUACIÓN 360° — Backend Routes
// Archivo: backend/routes/rrhh/eval360.js
// ══════════════════════════════════════════════════════════
const router   = require('express').Router();
const db       = require('../../db');
const { auth, checkRol } = require('../../middleware/auth');
const nodemailer = require('nodemailer');

router.use(auth, checkRol('rrhh'));

const ROL_LABELS = { auto:'Autoevaluación', jefe:'Jefe directo', par:'Par / Compañero', subordinado:'Subordinado' };

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT||'587'),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

// ── GET /api/rrhh/eval360 ─────────────────────────────────
router.get('/', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    const { rows } = await db.query(`
      SELECT e.*,
        ec.nombre AS empresa_cliente_nombre,
        COUNT(DISTINCT ev.id)                                            AS total_evaluadores,
        COUNT(DISTINCT ev.id) FILTER (WHERE ev.estado='completado')     AS completados,
        COUNT(DISTINCT eq.id)                                            AS total_preguntas
      FROM evaluaciones_360 e
      LEFT JOIN empresas_cliente ec ON ec.id = e.empresa_cliente_id
      LEFT JOIN eval360_evaluadores ev ON ev.evaluacion_id = e.id
      LEFT JOIN eval360_preguntas eq ON eq.evaluacion_id = e.id
      WHERE e.empresa_rrhh_id = $1
      GROUP BY e.id, ec.nombre
      ORDER BY e.created_at DESC
    `, [empresa_rrhh_id]);
    res.json(rows);
  } catch(err) {
    console.error('[eval360 GET]', err.message);
    res.status(500).json({ error: 'Error al obtener evaluaciones' });
  }
});

// ── POST /api/rrhh/eval360 ────────────────────────────────
router.post('/', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  const { nombre_evaluado, email_evaluado, puesto, proceso_nombre, empresa_cliente_id, prueba_id, fecha_inicio, fecha_cierre, preguntas } = req.body;

  if (!nombre_evaluado) return res.status(400).json({ error: 'Nombre del evaluado requerido' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [ev] } = await client.query(`
      INSERT INTO evaluaciones_360
        (empresa_rrhh_id, empresa_cliente_id, nombre_evaluado, email_evaluado, puesto, proceso_nombre, prueba_id, fecha_inicio, fecha_cierre)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `, [empresa_rrhh_id, empresa_cliente_id||null, nombre_evaluado, email_evaluado||null,
        puesto||null, proceso_nombre||null, prueba_id||null,
        fecha_inicio||null, fecha_cierre||null]);

    // Insertar preguntas propias si las hay
    if (preguntas?.length) {
      for (let i = 0; i < preguntas.length; i++) {
        const p = preguntas[i];
        await client.query(`
          INSERT INTO eval360_preguntas (evaluacion_id, texto_auto, texto_otros, categoria, aplica_roles, tipo_respuesta, orden)
          VALUES ($1,$2,$3,$4,$5,$6,$7)
        `, [ev.id, p.texto_auto, p.texto_otros||p.texto_auto, p.categoria||null,
            p.aplica_roles||'auto,jefe,par,subordinado', p.tipo_respuesta||'likert5', i]);
      }
    }

    await client.query('COMMIT');
    res.status(201).json(ev);
  } catch(err) {
    await client.query('ROLLBACK');
    console.error('[eval360 POST]', err.message);
    res.status(500).json({ error: 'Error al crear evaluación' });
  } finally {
    client.release();
  }
});

// ── GET /api/rrhh/eval360/:id ─────────────────────────────
router.get('/:id', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    const { rows: [evaluacion] } = await db.query(`
      SELECT e.*, ec.nombre AS empresa_cliente_nombre
      FROM evaluaciones_360 e
      LEFT JOIN empresas_cliente ec ON ec.id = e.empresa_cliente_id
      WHERE e.id=$1 AND e.empresa_rrhh_id=$2
    `, [req.params.id, empresa_rrhh_id]);
    if (!evaluacion) return res.status(404).json({ error: 'No encontrada' });

    const { rows: evaluadores } = await db.query(`
      SELECT * FROM eval360_evaluadores WHERE evaluacion_id=$1 ORDER BY rol, created_at
    `, [req.params.id]);

    const { rows: preguntas } = await db.query(`
      SELECT * FROM eval360_preguntas WHERE evaluacion_id=$1 AND activa=true ORDER BY orden
    `, [req.params.id]);

    res.json({ evaluacion, evaluadores, preguntas });
  } catch(err) {
    console.error('[eval360 GET/:id]', err.message);
    res.status(500).json({ error: 'Error al obtener evaluación' });
  }
});

// ── POST /api/rrhh/eval360/:id/activar ───────────────────
router.post('/:id/activar', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    const { rows: [e] } = await db.query(`
      UPDATE evaluaciones_360 SET estado='activa', updated_at=NOW()
      WHERE id=$1 AND empresa_rrhh_id=$2 RETURNING *
    `, [req.params.id, empresa_rrhh_id]);
    if (!e) return res.status(404).json({ error: 'No encontrada' });
    res.json(e);
  } catch(err) { res.status(500).json({ error: 'Error al activar' }); }
});

// ── POST /api/rrhh/eval360/:id/cerrar ────────────────────
router.post('/:id/cerrar', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    const { rows: [e] } = await db.query(`
      UPDATE evaluaciones_360 SET estado='cerrada', updated_at=NOW()
      WHERE id=$1 AND empresa_rrhh_id=$2 RETURNING *
    `, [req.params.id, empresa_rrhh_id]);
    res.json(e);
  } catch(err) { res.status(500).json({ error: 'Error al cerrar' }); }
});

// ── DELETE /api/rrhh/eval360/:id ─────────────────────────
router.delete('/:id', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    await db.query(`DELETE FROM evaluaciones_360 WHERE id=$1 AND empresa_rrhh_id=$2`, [req.params.id, empresa_rrhh_id]);
    res.json({ ok: true });
  } catch(err) { res.status(500).json({ error: 'Error al eliminar' }); }
});

// ── POST /api/rrhh/eval360/:id/evaluadores ───────────────
// Agregar evaluadores e invitarlos por email
router.post('/:id/evaluadores', async (req, res) => {
  const { empresa_rrhh_id, empresa_nombre } = req.user;
  const { evaluadores } = req.body; // [{rol, nombre, email}]
  if (!evaluadores?.length) return res.status(400).json({ error: 'Lista requerida' });

  const { rows: [ev] } = await db.query(`
    SELECT e.*, er.nombre AS empresa_rrhh_nombre
    FROM evaluaciones_360 e
    JOIN empresas_rrhh er ON er.id = e.empresa_rrhh_id
    WHERE e.id=$1 AND e.empresa_rrhh_id=$2
  `, [req.params.id, empresa_rrhh_id]);
  if (!ev) return res.status(404).json({ error: 'No encontrada' });

  const transporter = getTransporter();
  const creados = [];

  for (const e of evaluadores) {
    if (!['auto','jefe','par','subordinado'].includes(e.rol)) continue;
    try {
      const { rows: [evaluador] } = await db.query(`
        INSERT INTO eval360_evaluadores (evaluacion_id, rol, nombre, email)
        VALUES ($1,$2,$3,$4) RETURNING *
      `, [req.params.id, e.rol, e.nombre||null, e.email?.toLowerCase()||null]);

      creados.push(evaluador);

      if (e.email) {
        const link = `${process.env.APP_URL}/eval360/${evaluador.token_acceso}`;
        const esAuto = e.rol === 'auto';
        await transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: e.email,
          subject: esAuto
            ? `Completa tu autoevaluación — ${ev.nombre_evaluado}`
            : `Te invitan a evaluar a ${ev.nombre_evaluado}`,
          html: `<div style="font-family:sans-serif;max-width:520px;margin:auto">
            <h2 style="color:#2563EB">Hola${e.nombre?` ${e.nombre}`:''},</h2>
            ${esAuto
              ? `<p>Por favor completa tu <strong>autoevaluación</strong> para el proceso <strong>${ev.proceso_nombre||ev.nombre_evaluado}</strong>.</p>`
              : `<p><strong>${ev.empresa_rrhh_nombre}</strong> te invita a evaluar a <strong>${ev.nombre_evaluado}</strong> como <strong>${ROL_LABELS[e.rol]}</strong>.</p>`
            }
            <p style="margin:28px 0">
              <a href="${link}" style="background:#2563EB;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600">
                ${esAuto ? 'Completar autoevaluación →' : 'Responder evaluación →'}
              </a>
            </p>
            ${ev.fecha_cierre ? `<p style="color:#64748B;font-size:12px">Fecha límite: ${new Date(ev.fecha_cierre).toLocaleDateString('es-DO',{year:'numeric',month:'long',day:'numeric'})}</p>` : ''}
            <p style="color:#94A3B8;font-size:12px">Powered by Aptia</p>
          </div>`,
        });
      }
    } catch(e2) { console.error('[eval360 evaluador]', e2.message); }
  }

  res.status(201).json({ creados: creados.length, evaluadores: creados });
});

// ── DELETE /api/rrhh/eval360/:id/evaluadores/:evId ───────
router.delete('/:id/evaluadores/:evId', async (req, res) => {
  try {
    await db.query('DELETE FROM eval360_evaluadores WHERE id=$1', [req.params.evId]);
    res.json({ ok: true });
  } catch(err) { res.status(500).json({ error: 'Error al eliminar evaluador' }); }
});

// ── GET /api/rrhh/eval360/:id/resultados ─────────────────
router.get('/:id/resultados', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    const { rows: [evaluacion] } = await db.query(`
      SELECT * FROM evaluaciones_360 WHERE id=$1 AND empresa_rrhh_id=$2
    `, [req.params.id, empresa_rrhh_id]);
    if (!evaluacion) return res.status(404).json({ error: 'No encontrada' });

    // Stats por rol
    const { rows: statsPorRol } = await db.query(`
      SELECT rol,
        COUNT(*)                                      AS total,
        COUNT(*) FILTER (WHERE estado='completado')   AS completados
      FROM eval360_evaluadores WHERE evaluacion_id=$1
      GROUP BY rol ORDER BY rol
    `, [req.params.id]);

    // Promedio por pregunta y por rol
    const { rows: porPregunta } = await db.query(`
      SELECT
        eq.id, eq.texto_auto, eq.texto_otros, eq.categoria, eq.orden,
        json_object_agg(
          ev.rol,
          ROUND(AVG(er.valor_numerico)::numeric, 2)
        ) FILTER (WHERE er.valor_numerico IS NOT NULL) AS promedios_por_rol,
        ROUND(AVG(er.valor_numerico)::numeric, 2) AS promedio_general
      FROM eval360_preguntas eq
      LEFT JOIN eval360_respuestas er ON er.pregunta_id = eq.id
      LEFT JOIN eval360_evaluadores ev ON ev.id = er.evaluador_id AND ev.estado='completado'
      WHERE eq.evaluacion_id=$1 AND eq.activa=true
      GROUP BY eq.id
      ORDER BY eq.orden
    `, [req.params.id]);

    // Promedio general por rol
    const { rows: promedioRol } = await db.query(`
      SELECT ev.rol, ROUND(AVG(er.valor_numerico)::numeric, 2) AS promedio
      FROM eval360_respuestas er
      JOIN eval360_evaluadores ev ON ev.id = er.evaluador_id AND ev.estado='completado'
      WHERE ev.evaluacion_id=$1
      GROUP BY ev.rol ORDER BY ev.rol
    `, [req.params.id]);

    // Promedio por categoría y rol
    const { rows: porCategoria } = await db.query(`
      SELECT eq.categoria,
        ev.rol,
        ROUND(AVG(er.valor_numerico)::numeric, 2) AS promedio
      FROM eval360_preguntas eq
      JOIN eval360_respuestas er ON er.pregunta_id = eq.id
      JOIN eval360_evaluadores ev ON ev.id = er.evaluador_id AND ev.estado='completado'
      WHERE eq.evaluacion_id=$1 AND er.valor_numerico IS NOT NULL
      GROUP BY eq.categoria, ev.rol
      ORDER BY eq.categoria, ev.rol
    `, [req.params.id]);

    res.json({ evaluacion, statsPorRol, porPregunta, promedioRol, porCategoria });
  } catch(err) {
    console.error('[eval360 resultados]', err.message);
    res.status(500).json({ error: 'Error al obtener resultados' });
  }
});

module.exports = router;
