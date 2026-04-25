// ══════════════════════════════════════════════════════════
// ENDPOINTS PERFILES DE PUESTO — agregar al final de
// backend/routes/rrhh/index.js (antes del module.exports)
// ══════════════════════════════════════════════════════════

// ── GET /api/rrhh/procesos/:id/perfil ────────────────────
// Obtiene el perfil de puesto de un proceso (todas las pruebas)
router.get('/procesos/:id/perfil', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    // Verificar que el proceso pertenece a esta empresa
    const { rows: [proceso] } = await db.query(`
      SELECT p.id FROM procesos p
      JOIN empresas_cliente ec ON ec.id = p.empresa_cliente_id
      WHERE p.id = $1 AND ec.empresa_rrhh_id = $2
    `, [req.params.id, empresa_rrhh_id]);
    if (!proceso) return res.status(404).json({ error: 'Proceso no encontrado' });

    // Obtener perfiles con sus dimensiones
    const { rows: perfiles } = await db.query(`
      SELECT
        pp.id, pp.proceso_id, pp.prueba_id, pp.nombre, pp.descripcion, pp.activo,
        pr.nombre AS prueba_nombre, pr.tipo AS prueba_tipo,
        json_agg(
          json_build_object(
            'id',             pd.id,
            'dimension_id',   pd.dimension_id,
            'dimension_nombre', d.nombre,
            'dimension_codigo', d.codigo,
            'puntaje_minimo', pd.puntaje_minimo,
            'peso',           pd.peso
          ) ORDER BY d.orden
        ) FILTER (WHERE pd.id IS NOT NULL) AS dimensiones
      FROM perfiles_puesto pp
      JOIN pruebas pr ON pr.id = pp.prueba_id
      LEFT JOIN perfil_dimensiones pd ON pd.perfil_id = pp.id
      LEFT JOIN dimensiones d ON d.id = pd.dimension_id
      WHERE pp.proceso_id = $1 AND pp.activo = true
      GROUP BY pp.id, pr.nombre, pr.tipo
      ORDER BY pr.nombre
    `, [req.params.id]);

    res.json(perfiles);
  } catch (err) {
    console.error('[perfil GET]', err.message);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

// ── POST /api/rrhh/procesos/:id/perfil ───────────────────
// Crea o actualiza el perfil de una prueba en el proceso
// Body: { prueba_id, nombre, descripcion, dimensiones: [{dimension_id, puntaje_minimo, peso}] }
router.post('/procesos/:id/perfil', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  const { prueba_id, nombre, descripcion, dimensiones = [] } = req.body;

  if (!prueba_id) return res.status(400).json({ error: 'prueba_id requerido' });

  const client = await db.pool.connect();
  try {
    // Verificar que el proceso pertenece a esta empresa
    const { rows: [proceso] } = await client.query(`
      SELECT p.id, p.puesto FROM procesos p
      JOIN empresas_cliente ec ON ec.id = p.empresa_cliente_id
      WHERE p.id = $1 AND ec.empresa_rrhh_id = $2
    `, [req.params.id, empresa_rrhh_id]);
    if (!proceso) return res.status(404).json({ error: 'Proceso no encontrado' });

    await client.query('BEGIN');

    // Upsert perfil
    const { rows: [perfil] } = await client.query(`
      INSERT INTO perfiles_puesto (proceso_id, prueba_id, nombre, descripcion, activo)
      VALUES ($1, $2, $3, $4, true)
      ON CONFLICT (proceso_id, prueba_id)
      DO UPDATE SET nombre=$3, descripcion=$4, activo=true, updated_at=NOW()
      RETURNING *
    `, [req.params.id, prueba_id, nombre || proceso.puesto || 'Perfil del puesto', descripcion]);

    // Eliminar dimensiones anteriores y reinsertar
    await client.query('DELETE FROM perfil_dimensiones WHERE perfil_id = $1', [perfil.id]);

    for (const dim of dimensiones) {
      if (!dim.dimension_id) continue;
      await client.query(`
        INSERT INTO perfil_dimensiones (perfil_id, dimension_id, puntaje_minimo, peso)
        VALUES ($1, $2, $3, $4)
      `, [perfil.id, dim.dimension_id, dim.puntaje_minimo ?? 60, dim.peso ?? 1]);
    }

    await client.query('COMMIT');

    // Recalcular match para candidatos existentes del proceso
    await recalcularMatchProceso(req.params.id, prueba_id);

    res.status(201).json({ ok: true, perfil_id: perfil.id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[perfil POST]', err.message);
    res.status(500).json({ error: 'Error al guardar perfil' });
  } finally {
    client.release();
  }
});

// ── DELETE /api/rrhh/procesos/:proceso_id/perfil/:prueba_id ─
router.delete('/procesos/:proceso_id/perfil/:prueba_id', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    const { rows: [proceso] } = await db.query(`
      SELECT p.id FROM procesos p
      JOIN empresas_cliente ec ON ec.id = p.empresa_cliente_id
      WHERE p.id = $1 AND ec.empresa_rrhh_id = $2
    `, [req.params.proceso_id, empresa_rrhh_id]);
    if (!proceso) return res.status(404).json({ error: 'Proceso no encontrado' });

    await db.query(`
      UPDATE perfiles_puesto SET activo = false, updated_at = NOW()
      WHERE proceso_id = $1 AND prueba_id = $2
    `, [req.params.proceso_id, req.params.prueba_id]);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar perfil' });
  }
});

// ── GET /api/rrhh/procesos/:id/perfil/dimensiones-disponibles ─
// Devuelve las dimensiones de cada prueba asignada al proceso
router.get('/procesos/:id/perfil/dimensiones-disponibles', async (req, res) => {
  const { empresa_rrhh_id } = req.user;
  try {
    const { rows: [proceso] } = await db.query(`
      SELECT p.id FROM procesos p
      JOIN empresas_cliente ec ON ec.id = p.empresa_cliente_id
      WHERE p.id = $1 AND ec.empresa_rrhh_id = $2
    `, [req.params.id, empresa_rrhh_id]);
    if (!proceso) return res.status(404).json({ error: 'Proceso no encontrado' });

    const { rows } = await db.query(`
      SELECT
        pr.id AS prueba_id,
        pr.nombre AS prueba_nombre,
        pr.tipo AS prueba_tipo,
        json_agg(
          json_build_object(
            'id', d.id,
            'nombre', d.nombre,
            'codigo', d.codigo,
            'orden', d.orden,
            'interpretacion_alta', d.interpretacion_alta,
            'interpretacion_baja', d.interpretacion_baja
          ) ORDER BY d.orden
        ) FILTER (WHERE d.id IS NOT NULL) AS dimensiones
      FROM proceso_pruebas pp
      JOIN pruebas pr ON pr.id = pp.prueba_id
      LEFT JOIN dimensiones d ON d.prueba_id = pr.id
      WHERE pp.proceso_id = $1
      GROUP BY pr.id
      ORDER BY pr.nombre
    `, [req.params.id]);

    res.json(rows);
  } catch (err) {
    console.error('[perfil dims]', err.message);
    res.status(500).json({ error: 'Error al obtener dimensiones' });
  }
});

// ══════════════════════════════════════════════════════════
// HELPER: Calcular match score
// Llamar después de guardar resultados de una sesión
// ══════════════════════════════════════════════════════════
async function calcularMatchScore(sesion_id, proceso_id, prueba_id) {
  try {
    // Obtener perfil activo para esta prueba en este proceso
    const { rows: [perfil] } = await db.query(`
      SELECT pp.id FROM perfiles_puesto pp
      WHERE pp.proceso_id = $1 AND pp.prueba_id = $2 AND pp.activo = true
      LIMIT 1
    `, [proceso_id, prueba_id]);

    if (!perfil) return null; // Sin perfil definido = sin match

    // Obtener dimensiones del perfil con sus mínimos
    const { rows: dimsPerf } = await db.query(`
      SELECT pd.dimension_id, pd.puntaje_minimo, pd.peso
      FROM perfil_dimensiones pd
      WHERE pd.perfil_id = $1
    `, [perfil.id]);

    if (!dimsPerf.length) return null;

    // Obtener resultados del candidato para esta sesión
    const { rows: resultados } = await db.query(`
      SELECT r.dimension_id, r.puntaje_pct
      FROM resultados r
      WHERE r.sesion_id = $1
    `, [sesion_id]);

    const resultMap = {};
    resultados.forEach(r => { resultMap[r.dimension_id] = parseFloat(r.puntaje_pct) || 0; });

    // Calcular match ponderado
    let totalPeso = 0;
    let matchPonderado = 0;

    for (const dim of dimsPerf) {
      const puntajeCandidato = resultMap[dim.dimension_id] ?? 0;
      const minimo  = parseFloat(dim.puntaje_minimo) || 60;
      const peso    = parseFloat(dim.peso) || 1;

      // Score por dimensión: qué % del mínimo requerido alcanzó
      // Si supera el mínimo = 100% en esa dimensión
      const scoreDim = Math.min((puntajeCandidato / minimo) * 100, 100);

      matchPonderado += scoreDim * peso;
      totalPeso      += peso;
    }

    const match = totalPeso > 0 ? Math.round(matchPonderado / totalPeso) : 0;
    const nivel =
      match >= 80 ? 'alto'         :
      match >= 60 ? 'medio'        :
      match >= 40 ? 'bajo'         : 'no_compatible';

    // Guardar match en la sesión
    await db.query(`
      UPDATE sesiones_prueba
      SET match_score = $1, match_nivel = $2
      WHERE id = $3
    `, [match, nivel, sesion_id]);

    return { match, nivel };
  } catch (err) {
    console.error('[calcularMatch]', err.message);
    return null;
  }
}

// Recalcular match para todos los candidatos completados de un proceso/prueba
async function recalcularMatchProceso(proceso_id, prueba_id) {
  try {
    const { rows: sesiones } = await db.query(`
      SELECT sp.id AS sesion_id
      FROM sesiones_prueba sp
      JOIN candidatos c ON c.id = sp.candidato_id
      WHERE c.proceso_id = $1 AND sp.prueba_id = $2 AND sp.estado = 'completada'
    `, [proceso_id, prueba_id]);

    for (const s of sesiones) {
      await calcularMatchScore(s.sesion_id, proceso_id, prueba_id);
    }

    console.log(`[match] Recalculados ${sesiones.length} scores para proceso ${proceso_id}`);
  } catch (err) {
    console.error('[recalcularMatch]', err.message);
  }
}

// Exportar helper para usarlo en prueba.js
module.exports.calcularMatchScore = calcularMatchScore;
