// ══════════════════════════════════════════════════════════
// EVALUACIÓN 360° — Rutas Públicas
// Archivo: backend/routes/publico/eval360.js
// ══════════════════════════════════════════════════════════
const router = require('express').Router();
const db     = require('../../db');

// ── GET /api/eval360/:token ───────────────────────────────
router.get('/:token', async (req, res) => {
  try {
    const { rows: [evaluador] } = await db.query(`
      SELECT ev.*,
        e.nombre_evaluado, e.puesto, e.proceso_nombre, e.estado AS eval_estado, e.fecha_cierre,
        er.nombre AS empresa_nombre
      FROM eval360_evaluadores ev
      JOIN evaluaciones_360 e ON e.id = ev.evaluacion_id
      JOIN empresas_rrhh er ON er.id = e.empresa_rrhh_id
      WHERE ev.token_acceso = $1
    `, [req.params.token]);

    if (!evaluador) return res.status(404).json({ error: 'Enlace inválido' });
    if (evaluador.estado === 'completado') return res.status(410).json({ error: 'ya_completado' });
    if (evaluador.eval_estado !== 'activa') return res.status(410).json({ error: 'eval_no_activa' });

    const esAuto = evaluador.rol === 'auto';

    // Preguntas filtradas por rol
    const { rows: preguntas } = await db.query(`
      SELECT id,
        CASE WHEN $2 = true THEN texto_auto ELSE texto_otros END AS texto,
        categoria, tipo_respuesta, orden, aplica_roles
      FROM eval360_preguntas
      WHERE evaluacion_id = $1
        AND activa = true
        AND aplica_roles LIKE '%' || $3 || '%'
      ORDER BY orden
    `, [evaluador.evaluacion_id, esAuto, evaluador.rol]);

    // Agregar opciones por defecto según tipo
    const opcionesDefault = {
      likert5: [
        {texto:'Muy en desacuerdo',valor:1},
        {texto:'En desacuerdo',valor:2},
        {texto:'Neutral',valor:3},
        {texto:'De acuerdo',valor:4},
        {texto:'Muy de acuerdo',valor:5},
      ],
      si_no: [{texto:'No',valor:0},{texto:'Sí',valor:1}],
    };

    const preguntasConOpciones = preguntas.map(p => ({
      ...p,
      opciones: opcionesDefault[p.tipo_respuesta] || opcionesDefault.likert5,
    }));

    res.json({ evaluador, preguntas: preguntasConOpciones });
  } catch(err) {
    console.error('[eval360 público]', err.message);
    res.status(500).json({ error: 'Error al cargar evaluación' });
  }
});

// ── POST /api/eval360/:token/responder ────────────────────
router.post('/:token/responder', async (req, res) => {
  const { respuestas } = req.body; // [{pregunta_id, valor_numerico, texto_respuesta}]
  try {
    const { rows: [evaluador] } = await db.query(
      'SELECT * FROM eval360_evaluadores WHERE token_acceso=$1', [req.params.token]
    );
    if (!evaluador) return res.status(404).json({ error: 'Token inválido' });
    if (evaluador.estado === 'completado') return res.status(410).json({ error: 'ya_completado' });

    for (const r of (respuestas||[])) {
      await db.query(`
        INSERT INTO eval360_respuestas (evaluador_id, pregunta_id, valor_numerico, texto_respuesta)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (evaluador_id, pregunta_id)
        DO UPDATE SET valor_numerico=$3, texto_respuesta=$4
      `, [evaluador.id, r.pregunta_id, r.valor_numerico??null, r.texto_respuesta||null]);
    }

    await db.query(
      `UPDATE eval360_evaluadores SET estado='completado', fecha_completado=NOW() WHERE id=$1`,
      [evaluador.id]
    );

    res.json({ ok: true });
  } catch(err) {
    console.error('[eval360 responder]', err.message);
    res.status(500).json({ error: 'Error al guardar respuestas' });
  }
});

module.exports = router;
