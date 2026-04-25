// ══════════════════════════════════════════════════════════
// CLIMA LABORAL — Rutas Públicas
// Archivo: backend/routes/publico/clima.js
// ══════════════════════════════════════════════════════════
const router = require('express').Router();
const db     = require('../../db');

// ── GET /api/clima/:token ─────────────────────────────────
// Cargar encuesta por token de participante
router.get('/:token', async (req, res) => {
  try {
    const { rows: [part] } = await db.query(`
      SELECT cp.*, ce.nombre AS encuesta_nombre, ce.descripcion AS encuesta_descripcion,
             ce.estado AS encuesta_estado, ce.anonima, ce.prueba_id,
             er.nombre AS empresa_nombre
      FROM clima_participantes cp
      JOIN clima_encuestas ce ON ce.id = cp.encuesta_id
      JOIN empresas_rrhh er ON er.id = ce.empresa_rrhh_id
      WHERE cp.token_acceso = $1
    `, [req.params.token]);

    if (!part) return res.status(404).json({ error: 'Enlace inválido' });
    if (part.estado === 'completado') return res.status(410).json({ error: 'ya_completado' });
    if (part.encuesta_estado !== 'activa') return res.status(410).json({ error: 'encuesta_no_activa' });

    // Preguntas con opciones
    const { rows: preguntas } = await db.query(`
      SELECT p.*,
        json_agg(json_build_object('id',o.id,'texto',o.texto,'valor',o.valor,'orden',o.orden) ORDER BY o.orden)
          FILTER (WHERE o.id IS NOT NULL) AS opciones
      FROM clima_preguntas p
      LEFT JOIN clima_opciones o ON o.pregunta_id = p.id
      WHERE p.encuesta_id = $1 AND p.activa = true
      GROUP BY p.id ORDER BY p.orden
    `, [part.encuesta_id]);

    res.json({ participante: part, preguntas });
  } catch(err) {
    console.error('[clima público]', err.message);
    res.status(500).json({ error: 'Error al cargar encuesta' });
  }
});

// ── GET /api/clima/publica/:token_publico ──────────────────
// Link anónimo masivo (sin token de participante)
router.get('/publica/:token', async (req, res) => {
  try {
    const { rows: [encuesta] } = await db.query(`
      SELECT ce.*, er.nombre AS empresa_nombre
      FROM clima_encuestas ce
      JOIN empresas_rrhh er ON er.id = ce.empresa_rrhh_id
      WHERE ce.token_publico = $1 AND ce.estado = 'activa'
    `, [req.params.token]);

    if (!encuesta) return res.status(404).json({ error: 'Encuesta no encontrada o no activa' });

    // Crear participante anónimo al vuelo
    const { rows: [part] } = await db.query(`
      INSERT INTO clima_participantes (encuesta_id, anonimo)
      VALUES ($1, true) RETURNING *
    `, [encuesta.id]);

    const { rows: preguntas } = await db.query(`
      SELECT p.*,
        json_agg(json_build_object('id',o.id,'texto',o.texto,'valor',o.valor,'orden',o.orden) ORDER BY o.orden)
          FILTER (WHERE o.id IS NOT NULL) AS opciones
      FROM clima_preguntas p
      LEFT JOIN clima_opciones o ON o.pregunta_id = p.id
      WHERE p.encuesta_id = $1 AND p.activa = true
      GROUP BY p.id ORDER BY p.orden
    `, [encuesta.id]);

    res.json({
      participante: { ...part, encuesta_nombre: encuesta.nombre, encuesta_descripcion: encuesta.descripcion, empresa_nombre: encuesta.empresa_nombre },
      preguntas,
    });
  } catch(err) {
    console.error('[clima publica]', err.message);
    res.status(500).json({ error: 'Error' });
  }
});

// ── POST /api/clima/:token/responder ──────────────────────
// Guardar respuestas
router.post('/:token/responder', async (req, res) => {
  const { respuestas } = req.body; // [{pregunta_id, valor_numerico, texto_respuesta}]

  try {
    const { rows: [part] } = await db.query(
      'SELECT * FROM clima_participantes WHERE token_acceso=$1', [req.params.token]
    );
    if (!part) return res.status(404).json({ error: 'Token inválido' });
    if (part.estado === 'completado') return res.status(410).json({ error: 'ya_completado' });

    for (const r of (respuestas || [])) {
      await db.query(`
        INSERT INTO clima_respuestas (participante_id, pregunta_id, valor_numerico, texto_respuesta)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (participante_id, pregunta_id)
        DO UPDATE SET valor_numerico=$3, texto_respuesta=$4
      `, [part.id, r.pregunta_id, r.valor_numerico??null, r.texto_respuesta||null]);
    }

    await db.query(
      `UPDATE clima_participantes SET estado='completado', fecha_completado=NOW(), ip_acceso=$1 WHERE id=$2`,
      [req.ip, part.id]
    );

    res.json({ ok: true });
  } catch(err) {
    console.error('[clima responder]', err.message);
    res.status(500).json({ error: 'Error al guardar respuestas' });
  }
});

module.exports = router;
