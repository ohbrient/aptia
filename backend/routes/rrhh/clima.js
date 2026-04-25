// ══════════════════════════════════════════════════════════
// CLIMA LABORAL — Backend Routes
// Archivo: backend/routes/rrhh/clima.js
// ══════════════════════════════════════════════════════════
const router = require('express').Router();
const db     = require('../../db');
const { auth, checkRol } = require('../../middleware/auth');
const nodemailer = require('nodemailer');

router.use(auth, checkRol('rrhh'));

// ── GET /api/rrhh/clima ──────────────────────────────────
// Listar encuestas de clima
router.get('/', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    const { rows } = await db.query(`
      SELECT
        e.*,
        ec.nombre AS empresa_cliente_nombre,
        p.nombre  AS prueba_nombre,
        COUNT(DISTINCT cp.id)                                          AS total_participantes,
        COUNT(DISTINCT cp.id) FILTER (WHERE cp.estado='completado')   AS completados,
        COUNT(DISTINCT cpr.id)                                         AS total_preguntas
      FROM clima_encuestas e
      LEFT JOIN empresas_cliente ec ON ec.id = e.empresa_cliente_id
      LEFT JOIN pruebas p ON p.id = e.prueba_id
      LEFT JOIN clima_participantes cp ON cp.encuesta_id = e.id
      LEFT JOIN clima_preguntas cpr ON cpr.encuesta_id = e.id
      WHERE e.empresa_rrhh_id = $1
      GROUP BY e.id, ec.nombre, p.nombre
      ORDER BY e.created_at DESC
    `, [empresa_rrhh_id]);
    res.json(rows);
  } catch(err) {
    console.error('[clima GET]', err.message);
    res.status(500).json({ error: 'Error al obtener encuestas' });
  }
});

// ── POST /api/rrhh/clima ──────────────────────────────────
// Crear encuesta de clima
router.post('/', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  const { nombre, descripcion, empresa_cliente_id, prueba_id, anonima, fecha_inicio, fecha_cierre, visible_empresa, preguntas } = req.body;

  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [encuesta] } = await client.query(`
      INSERT INTO clima_encuestas
        (empresa_rrhh_id, empresa_cliente_id, prueba_id, nombre, descripcion, anonima, fecha_inicio, fecha_cierre, visible_empresa, estado)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'borrador')
      RETURNING *
    `, [empresa_rrhh_id, empresa_cliente_id||null, prueba_id||null, nombre, descripcion||null,
        anonima!==false, fecha_inicio||null, fecha_cierre||null, visible_empresa!==false]);

    // Si tiene preguntas propias, insertarlas
    if (preguntas?.length) {
      for (let i = 0; i < preguntas.length; i++) {
        const p = preguntas[i];
        const { rows: [preg] } = await client.query(`
          INSERT INTO clima_preguntas (encuesta_id, texto, tipo_respuesta, categoria, orden)
          VALUES ($1,$2,$3,$4,$5) RETURNING id
        `, [encuesta.id, p.texto, p.tipo_respuesta||'likert5', p.categoria||null, i]);

        // Opciones por defecto para likert5
        if (!p.opciones?.length && p.tipo_respuesta !== 'texto') {
          const opcionesDefault = {
            likert5:  [['Muy en desacuerdo',1],['En desacuerdo',2],['Neutral',3],['De acuerdo',4],['Muy de acuerdo',5]],
            likert10: Array.from({length:10},(_,i)=>[`${i+1}`,i+1]),
            si_no:    [['No',0],['Sí',1]],
          };
          const opts = opcionesDefault[p.tipo_respuesta||'likert5'] || opcionesDefault.likert5;
          for (let j = 0; j < opts.length; j++) {
            await client.query(`
              INSERT INTO clima_opciones (pregunta_id, texto, valor, orden) VALUES ($1,$2,$3,$4)
            `, [preg.id, opts[j][0], opts[j][1], j]);
          }
        }
      }
    }

    await client.query('COMMIT');
    res.status(201).json(encuesta);
  } catch(err) {
    await client.query('ROLLBACK');
    console.error('[clima POST]', err.message);
    res.status(500).json({ error: 'Error al crear encuesta' });
  } finally {
    client.release();
  }
});

// ── GET /api/rrhh/clima/:id ───────────────────────────────
// Detalle completo de una encuesta
router.get('/:id', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    const { rows: [encuesta] } = await db.query(`
      SELECT e.*, ec.nombre AS empresa_cliente_nombre, p.nombre AS prueba_nombre
      FROM clima_encuestas e
      LEFT JOIN empresas_cliente ec ON ec.id = e.empresa_cliente_id
      LEFT JOIN pruebas p ON p.id = e.prueba_id
      WHERE e.id = $1 AND e.empresa_rrhh_id = $2
    `, [req.params.id, empresa_rrhh_id]);

    if (!encuesta) return res.status(404).json({ error: 'Encuesta no encontrada' });

    // Preguntas con opciones
    const { rows: preguntas } = await db.query(`
      SELECT p.*,
        json_agg(json_build_object('id',o.id,'texto',o.texto,'valor',o.valor,'orden',o.orden) ORDER BY o.orden)
          FILTER (WHERE o.id IS NOT NULL) AS opciones
      FROM clima_preguntas p
      LEFT JOIN clima_opciones o ON o.pregunta_id = p.id
      WHERE p.encuesta_id = $1 AND p.activa = true
      GROUP BY p.id ORDER BY p.orden
    `, [req.params.id]);

    // Participantes
    const { rows: participantes } = await db.query(`
      SELECT cp.*, cd.nombre AS departamento_nombre
      FROM clima_participantes cp
      LEFT JOIN clima_departamentos cd ON cd.id = cp.departamento_id
      WHERE cp.encuesta_id = $1
      ORDER BY cp.created_at DESC
    `, [req.params.id]);

    // Departamentos de la empresa cliente
    const { rows: departamentos } = encuesta.empresa_cliente_id ? await db.query(`
      SELECT * FROM clima_departamentos WHERE empresa_cliente_id = $1 AND activo = true ORDER BY nombre
    `, [encuesta.empresa_cliente_id]) : { rows: [] };

    res.json({ encuesta, preguntas, participantes, departamentos });
  } catch(err) {
    console.error('[clima GET/:id]', err.message);
    res.status(500).json({ error: 'Error al obtener encuesta' });
  }
});

// ── PUT /api/rrhh/clima/:id ───────────────────────────────
router.put('/:id', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  const { nombre, descripcion, estado, fecha_inicio, fecha_cierre, visible_empresa, anonima } = req.body;
  try {
    const { rows: [e] } = await db.query(`
      UPDATE clima_encuestas SET nombre=$1,descripcion=$2,estado=$3,fecha_inicio=$4,fecha_cierre=$5,visible_empresa=$6,anonima=$7,updated_at=NOW()
      WHERE id=$8 AND empresa_rrhh_id=$9 RETURNING *
    `, [nombre, descripcion, estado, fecha_inicio||null, fecha_cierre||null, visible_empresa, anonima, req.params.id, empresa_rrhh_id]);
    if (!e) return res.status(404).json({ error: 'No encontrada' });
    res.json(e);
  } catch(err) {
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

// ── DELETE /api/rrhh/clima/:id ────────────────────────────
router.delete('/:id', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    await db.query(`
      DELETE FROM clima_encuestas WHERE id=$1 AND empresa_rrhh_id=$2
    `, [req.params.id, empresa_rrhh_id]);
    res.json({ ok: true });
  } catch(err) {
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

// ── POST /api/rrhh/clima/:id/activar ─────────────────────
router.post('/:id/activar', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    const { rows: [e] } = await db.query(`
      UPDATE clima_encuestas SET estado='activa', updated_at=NOW()
      WHERE id=$1 AND empresa_rrhh_id=$2 RETURNING *
    `, [req.params.id, empresa_rrhh_id]);
    if (!e) return res.status(404).json({ error: 'No encontrada' });
    res.json(e);
  } catch(err) {
    res.status(500).json({ error: 'Error al activar' });
  }
});

// ── POST /api/rrhh/clima/:id/cerrar ──────────────────────
router.post('/:id/cerrar', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    const { rows: [e] } = await db.query(`
      UPDATE clima_encuestas SET estado='cerrada', updated_at=NOW()
      WHERE id=$1 AND empresa_rrhh_id=$2 RETURNING *
    `, [req.params.id, empresa_rrhh_id]);
    res.json(e);
  } catch(err) {
    res.status(500).json({ error: 'Error al cerrar' });
  }
});

// ── POST /api/rrhh/clima/:id/invitar ─────────────────────
// Invitar participantes por email
router.post('/:id/invitar', async (req, res) => {
  const { empresa_rrhh_id, empresa_nombre } = req.user;
  const { participantes } = req.body; // [{nombre, email, departamento_id}]

  if (!participantes?.length) return res.status(400).json({ error: 'Lista requerida' });

  const { rows: [encuesta] } = await db.query(`
    SELECT e.*, er.nombre AS empresa_rrhh_nombre
    FROM clima_encuestas e
    JOIN empresas_rrhh er ON er.id = e.empresa_rrhh_id
    WHERE e.id=$1 AND e.empresa_rrhh_id=$2
  `, [req.params.id, empresa_rrhh_id]);

  if (!encuesta) return res.status(404).json({ error: 'Encuesta no encontrada' });

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT||'587'),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const creados = [];
  for (const p of participantes) {
    try {
      const { rows: [part] } = await db.query(`
        INSERT INTO clima_participantes (encuesta_id, nombre, email, departamento_id, anonimo)
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT DO NOTHING RETURNING *
      `, [req.params.id, p.nombre||null, p.email?.toLowerCase()||null, p.departamento_id||null, encuesta.anonima]);

      if (!part) continue;
      creados.push(part);

      if (p.email) {
        const link = `${process.env.APP_URL}/clima/${part.token_acceso}`;
        await transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: p.email,
          subject: `${encuesta.empresa_rrhh_nombre} te invita a responder una encuesta`,
          html: `<div style="font-family:sans-serif;max-width:520px;margin:auto">
            <h2 style="color:#2563EB">Hola${p.nombre?` ${p.nombre}`:''},</h2>
            <p><strong>${encuesta.empresa_rrhh_nombre}</strong> te invita a responder la encuesta: <strong>${encuesta.nombre}</strong>.</p>
            <p>Tu participación es ${encuesta.anonima?'completamente anónima':'confidencial'}.</p>
            <p style="margin:28px 0"><a href="${link}" style="background:#2563EB;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600">Responder encuesta →</a></p>
            <p style="color:#64748B;font-size:12px">Powered by Aptia</p>
          </div>`,
        });
      }
    } catch(e) { console.error(e.message); }
  }

  res.status(201).json({ invitados: creados.length, participantes: creados });
});

// ── GET /api/rrhh/clima/:id/resultados ───────────────────
// Resultados agregados de la encuesta
router.get('/:id/resultados', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    const { rows: [encuesta] } = await db.query(`
      SELECT e.*, ec.nombre AS empresa_cliente_nombre
      FROM clima_encuestas e
      LEFT JOIN empresas_cliente ec ON ec.id = e.empresa_cliente_id
      WHERE e.id=$1 AND e.empresa_rrhh_id=$2
    `, [req.params.id, empresa_rrhh_id]);
    if (!encuesta) return res.status(404).json({ error: 'No encontrada' });

    // Stats generales
    const { rows: [stats] } = await db.query(`
      SELECT
        COUNT(*)                                        AS total,
        COUNT(*) FILTER (WHERE estado='completado')    AS completados,
        COUNT(*) FILTER (WHERE estado='pendiente')     AS pendientes,
        ROUND(COUNT(*) FILTER (WHERE estado='completado') * 100.0 / NULLIF(COUNT(*),0),1) AS tasa
      FROM clima_participantes WHERE encuesta_id=$1
    `, [req.params.id]);

    // Resultados por pregunta (promedio y distribución)
    const { rows: porPregunta } = await db.query(`
      SELECT
        cpr.id, cpr.texto, cpr.categoria, cpr.tipo_respuesta,
        COUNT(cr.id)               AS respuestas,
        ROUND(AVG(cr.valor_numerico),2) AS promedio,
        MIN(cr.valor_numerico)     AS minimo,
        MAX(cr.valor_numerico)     AS maximo,
        json_agg(json_build_object('valor', cr.valor_numerico, 'texto', cr.texto_respuesta)
          ORDER BY cr.created_at) FILTER (WHERE cr.valor_numerico IS NOT NULL OR cr.texto_respuesta IS NOT NULL) AS distribución
      FROM clima_preguntas cpr
      LEFT JOIN clima_respuestas cr ON cr.pregunta_id = cpr.id
        AND cr.participante_id IN (SELECT id FROM clima_participantes WHERE encuesta_id=$1 AND estado='completado')
      WHERE cpr.encuesta_id=$1
      GROUP BY cpr.id
      ORDER BY cpr.orden
    `, [req.params.id]);

    // Resultados por departamento
    const { rows: porDepartamento } = await db.query(`
      SELECT
        COALESCE(cd.nombre, 'Sin departamento') AS departamento,
        COUNT(DISTINCT cp.id)                   AS participantes,
        ROUND(AVG(cr.valor_numerico),2)         AS promedio
      FROM clima_participantes cp
      LEFT JOIN clima_departamentos cd ON cd.id = cp.departamento_id
      LEFT JOIN clima_respuestas cr ON cr.participante_id = cp.id
      WHERE cp.encuesta_id=$1 AND cp.estado='completado'
      GROUP BY cd.nombre
      ORDER BY promedio DESC NULLS LAST
    `, [req.params.id]);

    // Resultados por categoría
    const { rows: porCategoria } = await db.query(`
      SELECT
        COALESCE(cpr.categoria, 'General') AS categoria,
        ROUND(AVG(cr.valor_numerico),2)    AS promedio,
        COUNT(cr.id)                       AS respuestas
      FROM clima_preguntas cpr
      LEFT JOIN clima_respuestas cr ON cr.pregunta_id = cpr.id
        AND cr.participante_id IN (SELECT id FROM clima_participantes WHERE encuesta_id=$1 AND estado='completado')
      WHERE cpr.encuesta_id=$1 AND cr.valor_numerico IS NOT NULL
      GROUP BY cpr.categoria
      ORDER BY promedio DESC
    `, [req.params.id]);

    // Comentarios abiertos
    const { rows: comentarios } = await db.query(`
      SELECT cr.texto_respuesta, cpr.texto AS pregunta, cp.departamento_id,
             COALESCE(cd.nombre,'Sin departamento') AS departamento
      FROM clima_respuestas cr
      JOIN clima_preguntas cpr ON cpr.id = cr.pregunta_id
      JOIN clima_participantes cp ON cp.id = cr.participante_id
      LEFT JOIN clima_departamentos cd ON cd.id = cp.departamento_id
      WHERE cp.encuesta_id=$1 AND cr.texto_respuesta IS NOT NULL AND cr.texto_respuesta != ''
      ORDER BY cr.created_at DESC
      LIMIT 50
    `, [req.params.id]);

    res.json({ encuesta, stats, porPregunta, porDepartamento, porCategoria, comentarios });
  } catch(err) {
    console.error('[clima resultados]', err.message);
    res.status(500).json({ error: 'Error al obtener resultados' });
  }
});

// ── GET /api/rrhh/clima/:id/link-publico ─────────────────
// Obtiene el link para compartir encuesta anónima
router.get('/:id/link-publico', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    const { rows: [e] } = await db.query(`
      SELECT token_publico FROM clima_encuestas WHERE id=$1 AND empresa_rrhh_id=$2
    `, [req.params.id, empresa_rrhh_id]);
    if (!e) return res.status(404).json({ error: 'No encontrada' });
    res.json({ link: `${process.env.APP_URL}/clima/publica/${e.token_publico}` });
  } catch(err) {
    res.status(500).json({ error: 'Error' });
  }
});

// ── CRUD departamentos ────────────────────────────────────
router.get('/departamentos/:empresa_cliente_id', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    const { rows: [ec] } = await db.query(
      'SELECT id FROM empresas_cliente WHERE id=$1 AND empresa_rrhh_id=$2',
      [req.params.empresa_cliente_id, empresa_rrhh_id]
    );
    if (!ec) return res.status(403).json({ error: 'No autorizado' });
    const { rows } = await db.query(
      'SELECT * FROM clima_departamentos WHERE empresa_cliente_id=$1 AND activo=true ORDER BY nombre',
      [req.params.empresa_cliente_id]
    );
    res.json(rows);
  } catch(err) { res.status(500).json({ error: 'Error' }); }
});

router.post('/departamentos/:empresa_cliente_id', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  const { nombre, descripcion } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
  try {
    const { rows: [ec] } = await db.query('SELECT id FROM empresas_cliente WHERE id=$1 AND empresa_rrhh_id=$2', [req.params.empresa_cliente_id, empresa_rrhh_id]);
    if (!ec) return res.status(403).json({ error: 'No autorizado' });
    const { rows: [d] } = await db.query(
      'INSERT INTO clima_departamentos (empresa_cliente_id,nombre,descripcion) VALUES ($1,$2,$3) RETURNING *',
      [req.params.empresa_cliente_id, nombre, descripcion||null]
    );
    res.status(201).json(d);
  } catch(err) { res.status(500).json({ error: 'Error al crear departamento' }); }
});

router.delete('/departamentos/:id', async (req, res) => {
  try {
    await db.query('UPDATE clima_departamentos SET activo=false WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch(err) { res.status(500).json({ error: 'Error' }); }
});

// ── CRUD preguntas ────────────────────────────────────────
router.post('/:id/preguntas', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  const { texto, tipo_respuesta, categoria, orden } = req.body;
  try {
    const { rows: [e] } = await db.query('SELECT id FROM clima_encuestas WHERE id=$1 AND empresa_rrhh_id=$2', [req.params.id, empresa_rrhh_id]);
    if (!e) return res.status(403).json({ error: 'No autorizado' });

    const { rows: [p] } = await db.query(`
      INSERT INTO clima_preguntas (encuesta_id,texto,tipo_respuesta,categoria,orden)
      VALUES ($1,$2,$3,$4,$5) RETURNING *
    `, [req.params.id, texto, tipo_respuesta||'likert5', categoria||null, orden||0]);

    // Opciones por defecto
    const optsDefault = {
      likert5: [['Muy en desacuerdo',1],['En desacuerdo',2],['Neutral',3],['De acuerdo',4],['Muy de acuerdo',5]],
      si_no:   [['No',0],['Sí',1]],
    };
    const opts = optsDefault[tipo_respuesta||'likert5'];
    if (opts) {
      for (let i=0;i<opts.length;i++)
        await db.query('INSERT INTO clima_opciones (pregunta_id,texto,valor,orden) VALUES ($1,$2,$3,$4)', [p.id,opts[i][0],opts[i][1],i]);
    }

    res.status(201).json(p);
  } catch(err) { console.error(err); res.status(500).json({ error: 'Error al crear pregunta' }); }
});

router.delete('/:encuesta_id/preguntas/:id', async (req, res) => {
  try {
    await db.query('UPDATE clima_preguntas SET activa=false WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch(err) { res.status(500).json({ error: 'Error' }); }
});

module.exports = router;
