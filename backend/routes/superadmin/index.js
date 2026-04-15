const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db     = require('../../db');
const { auth, checkRol } = require('../../middleware/auth');

// Todas las rutas requieren ser superadmin
router.use(auth, checkRol('superadmin'));

// ── GET /api/superadmin/empresas-rrhh ────────────────────────
router.get('/empresas-rrhh', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT e.*,
        COUNT(DISTINCT ue.id)  AS total_usuarios,
        COUNT(DISTINCT ec.id)  AS total_clientes,
        (SELECT SUM(l.candidatos_total - l.candidatos_usados)
         FROM licencias l WHERE l.empresa_rrhh_id = e.id AND l.activa = true
        ) AS licencias_disponibles
      FROM empresas_rrhh e
      LEFT JOIN usuarios_rrhh   ue ON ue.empresa_rrhh_id = e.id AND ue.activo = true
      LEFT JOIN empresas_cliente ec ON ec.empresa_rrhh_id = e.id AND ec.activo = true
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener empresas RRHH' });
  }
});

// ── POST /api/superadmin/empresas-rrhh ───────────────────────
router.post('/empresas-rrhh', async (req, res) => {
  const { nombre, email_contacto, pais, ciudad, telefono, ruc_nit,
          admin_nombre, admin_email, admin_password } = req.body;

  if (!nombre || !admin_email || !admin_password) {
    return res.status(400).json({ error: 'Nombre, email y contraseña del admin son requeridos' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [empresa] } = await client.query(
      `INSERT INTO empresas_rrhh (nombre, email_contacto, pais, ciudad, telefono, ruc_nit)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [nombre, email_contacto, pais, ciudad, telefono, ruc_nit]
    );

    const hash = await bcrypt.hash(admin_password, 12);
    await client.query(
      `INSERT INTO usuarios_rrhh (empresa_rrhh_id, nombre, email, password_hash, rol)
       VALUES ($1,$2,$3,$4,'admin')`,
      [empresa.id, admin_nombre || nombre, admin_email.toLowerCase(), hash]
    );

    await client.query('COMMIT');
    res.status(201).json(empresa);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'El email ya está registrado' });
    console.error(err);
    res.status(500).json({ error: 'Error al crear empresa RRHH' });
  } finally {
    client.release();
  }
});

// ── PUT /api/superadmin/empresas-rrhh/:id ────────────────────
router.put('/empresas-rrhh/:id', async (req, res) => {
  const { nombre, email_contacto, pais, ciudad, telefono, activo } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE empresas_rrhh SET nombre=$1, email_contacto=$2, pais=$3,
       ciudad=$4, telefono=$5, activo=$6, updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [nombre, email_contacto, pais, ciudad, telefono, activo, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Empresa no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar empresa' });
  }
});

// ── GET /api/superadmin/licencias ────────────────────────────
router.get('/licencias', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT l.*, e.nombre AS empresa_nombre, p.nombre AS plan_nombre
      FROM licencias l
      JOIN empresas_rrhh e ON e.id = l.empresa_rrhh_id
      JOIN planes p        ON p.id = l.plan_id
      ORDER BY l.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener licencias' });
  }
});

// ── POST /api/superadmin/licencias ───────────────────────────
router.post('/licencias', async (req, res) => {
  const { empresa_rrhh_id, plan_id, candidatos_total, fecha_vencimiento, notas } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO licencias (empresa_rrhh_id, plan_id, candidatos_total, fecha_vencimiento, notas)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [empresa_rrhh_id, plan_id, candidatos_total, fecha_vencimiento, notas]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear licencia' });
  }
});

// ── GET /api/superadmin/planes ───────────────────────────────
router.get('/planes', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM planes WHERE activo = true ORDER BY precio');
  res.json(rows);
});

// ── POST /api/superadmin/planes ──────────────────────────────
router.post('/planes', async (req, res) => {
  const { nombre, descripcion, max_candidatos, max_pruebas, precio, moneda } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO planes (nombre, descripcion, max_candidatos, max_pruebas, precio, moneda)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [nombre, descripcion, max_candidatos, max_pruebas, precio, moneda || 'USD']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear plan' });
  }
});

// ── GET /api/superadmin/dashboard ────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const [empresas, candidatos, licencias, pruebas] = await Promise.all([
      db.query('SELECT COUNT(*) FROM empresas_rrhh WHERE activo = true'),
      db.query('SELECT COUNT(*) FROM candidatos WHERE estado = $1', ['completado']),
      db.query('SELECT COUNT(*) FROM licencias WHERE activa = true'),
      db.query('SELECT COUNT(*) FROM pruebas WHERE activa = true'),
    ]);
    res.json({
      empresas_rrhh:      parseInt(empresas.rows[0].count),
      candidatos_evaluados: parseInt(candidatos.rows[0].count),
      licencias_activas:  parseInt(licencias.rows[0].count),
      pruebas_activas:    parseInt(pruebas.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: 'Error en dashboard' });
  }
});

// ── GET /api/superadmin/pruebas ──────────────────────────────
router.get('/pruebas', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM pruebas ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener pruebas' });
  }
});

// ── POST /api/superadmin/pruebas ─────────────────────────────
router.post('/pruebas', async (req, res) => {
  const { nombre, descripcion, tipo, instrucciones, tiempo_limite, escala_tipo } = req.body;
  if (!nombre || !tipo) return res.status(400).json({ error: 'Nombre y tipo son requeridos' });
  try {
    const { rows } = await db.query(
      `INSERT INTO pruebas (nombre, descripcion, tipo, instrucciones, tiempo_limite, escala_tipo)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [nombre, descripcion, tipo, instrucciones, tiempo_limite || null, escala_tipo || 'likert5']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear prueba' });
  }
});

// ── PUT /api/superadmin/pruebas/:id ──────────────────────────
router.put('/pruebas/:id', async (req, res) => {
  try {
    // Obtener prueba actual para merge parcial
    const { rows: [actual] } = await db.query('SELECT * FROM pruebas WHERE id=$1', [req.params.id]);
    if (!actual) return res.status(404).json({ error: 'Prueba no encontrada' });

    const nombre       = req.body.nombre       ?? actual.nombre;
    const descripcion  = req.body.descripcion  ?? actual.descripcion;
    const tipo         = req.body.tipo         ?? actual.tipo;
    const instrucciones= req.body.instrucciones?? actual.instrucciones;
    const escala_tipo  = req.body.escala_tipo  ?? actual.escala_tipo;
    const activa       = req.body.activa       ?? actual.activa;
    const tiempo_limite= 'tiempo_limite' in req.body ? (req.body.tiempo_limite || null) : actual.tiempo_limite;

    const { rows } = await db.query(
      `UPDATE pruebas SET nombre=$1, descripcion=$2, tipo=$3, instrucciones=$4,
       tiempo_limite=$5, escala_tipo=$6, activa=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [nombre, descripcion, tipo, instrucciones, tiempo_limite, escala_tipo, activa, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar prueba' });
  }
});

module.exports = router;

// ── DELETE /api/superadmin/pruebas/:id ───────────────────────
router.delete('/pruebas/:id', async (req, res) => {
  try {
    const { rows } = await db.query('UPDATE pruebas SET activa=false, updated_at=NOW() WHERE id=$1 RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Prueba no encontrada' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Error al eliminar prueba' }); }
});

// ── DELETE /api/superadmin/empresas-rrhh/:id ─────────────────
router.delete('/empresas-rrhh/:id', async (req, res) => {
  try {
    const { rows } = await db.query('UPDATE empresas_rrhh SET activo=false, updated_at=NOW() WHERE id=$1 RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Empresa no encontrada' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Error al eliminar empresa' }); }
});

// ── PUT /api/superadmin/licencias/:id/renovar ────────────────
router.put('/licencias/:id/renovar', async (req, res) => {
  const { candidatos_adicionales, nueva_fecha_vencimiento } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE licencias SET candidatos_total=candidatos_total+$1, fecha_vencimiento=$2, activa=true, updated_at=NOW() WHERE id=$3 RETURNING *`,
      [candidatos_adicionales || 0, nueva_fecha_vencimiento, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Licencia no encontrada' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Error al renovar licencia' }); }
});

// ── GET /api/superadmin/empresas-rrhh/:id/pruebas ────────────
router.get('/empresas-rrhh/:id/pruebas', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*, COALESCE(rp.habilitada, false) AS habilitada FROM pruebas p LEFT JOIN rrhh_pruebas rp ON rp.prueba_id=p.id AND rp.empresa_rrhh_id=$1 WHERE p.activa=true ORDER BY p.nombre`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Error al obtener pruebas' }); }
});

// ── POST /api/superadmin/empresas-rrhh/:id/pruebas ───────────
router.post('/empresas-rrhh/:id/pruebas', async (req, res) => {
  const { prueba_ids } = req.body;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM rrhh_pruebas WHERE empresa_rrhh_id=$1', [req.params.id]);
    for (const pid of (prueba_ids || [])) {
      await client.query('INSERT INTO rrhh_pruebas (empresa_rrhh_id, prueba_id, habilitada) VALUES ($1,$2,true)', [req.params.id, pid]);
    }
    await client.query('COMMIT');
    res.json({ ok: true, asignadas: prueba_ids?.length || 0 });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Error al asignar pruebas' });
  } finally { client.release(); }
});

// ── GET /api/superadmin/pruebas/:id/dimensiones ──────────────
router.get('/pruebas/:id/dimensiones', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM dimensiones WHERE prueba_id=$1 ORDER BY orden', [req.params.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Error al obtener dimensiones' }); }
});

// ── POST /api/superadmin/pruebas/:id/dimensiones ─────────────
router.post('/pruebas/:id/dimensiones', async (req, res) => {
  const { nombre, codigo, descripcion, orden } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO dimensiones (prueba_id, nombre, codigo, descripcion, orden)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.params.id, nombre, codigo, descripcion, orden || 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Error al crear dimensión' }); }
});

// ── DELETE /api/superadmin/dimensiones/:id ───────────────────
router.delete('/dimensiones/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM dimensiones WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Error al eliminar dimensión' }); }
});

// ── GET /api/superadmin/pruebas/:id/items ────────────────────
router.get('/pruebas/:id/items', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT i.*, d.nombre AS dimension_nombre, d.codigo AS dimension_codigo,
        json_agg(json_build_object('id',o.id,'texto',o.texto,'valor',o.valor,'orden',o.orden)
          ORDER BY o.orden) FILTER (WHERE o.id IS NOT NULL) AS opciones
       FROM items i
       LEFT JOIN dimensiones d ON d.id = i.dimension_id
       LEFT JOIN opciones_item o ON o.item_id = i.id
       WHERE i.prueba_id=$1
       GROUP BY i.id, d.nombre, d.codigo
       ORDER BY i.orden`, [req.params.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Error al obtener items' }); }
});

// ── POST /api/superadmin/pruebas/:id/items ───────────────────
router.post('/pruebas/:id/items', async (req, res) => {
  const { texto, dimension_id, orden, opciones } = req.body;
  if (!texto) return res.status(400).json({ error: 'Texto del ítem requerido' });
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [item] } = await client.query(
      `INSERT INTO items (prueba_id, dimension_id, texto, orden) VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.params.id, dimension_id || null, texto, orden || 0]
    );
    if (opciones?.length) {
      for (const op of opciones) {
        await client.query(
          'INSERT INTO opciones_item (item_id, texto, valor, orden) VALUES ($1,$2,$3,$4)',
          [item.id, op.texto, op.valor, op.orden]
        );
      }
    }
    // Actualizar total_items
    await client.query(
      'UPDATE pruebas SET total_items=(SELECT COUNT(*) FROM items WHERE prueba_id=$1) WHERE id=$1',
      [req.params.id]
    );
    await client.query('COMMIT');
    res.status(201).json(item);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Error al crear ítem' });
  } finally { client.release(); }
});

// ── DELETE /api/superadmin/items/:id ─────────────────────────
router.delete('/items/:id', async (req, res) => {
  try {
    const { rows: [item] } = await db.query('DELETE FROM items WHERE id=$1 RETURNING prueba_id', [req.params.id]);
    if (item) {
      await db.query(
        'UPDATE pruebas SET total_items=(SELECT COUNT(*) FROM items WHERE prueba_id=$1) WHERE id=$1',
        [item.prueba_id]
      );
    }
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Error al eliminar ítem' }); }
});

// ── POST /api/superadmin/pruebas/:id/items/bulk ──────────────
// Carga masiva desde Excel/CSV
// Body: { items: [{ texto, dimension_codigo, orden, opciones:[{texto,valor,orden}] }] }
router.post('/pruebas/:id/items/bulk', async (req, res) => {
  const { items } = req.body;
  if (!items?.length) return res.status(400).json({ error: 'Lista de ítems requerida' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Cargar dimensiones de esta prueba
    const { rows: dims } = await client.query(
      'SELECT id, codigo FROM dimensiones WHERE prueba_id=$1', [req.params.id]
    );
    const dimMap = {};
    dims.forEach(d => dimMap[d.codigo.toUpperCase()] = d.id);

    let insertados = 0;
    for (const it of items) {
      const dim_id = it.dimension_codigo ? (dimMap[it.dimension_codigo.toUpperCase()] || null) : null;
      const { rows: [item] } = await client.query(
        'INSERT INTO items (prueba_id, dimension_id, texto, orden) VALUES ($1,$2,$3,$4) RETURNING id',
        [req.params.id, dim_id, it.texto, it.orden || insertados]
      );
      if (it.opciones?.length) {
        for (const op of it.opciones) {
          await client.query(
            'INSERT INTO opciones_item (item_id, texto, valor, orden) VALUES ($1,$2,$3,$4)',
            [item.id, op.texto, op.valor, op.orden]
          );
        }
      }
      insertados++;
    }

    await client.query(
      'UPDATE pruebas SET total_items=(SELECT COUNT(*) FROM items WHERE prueba_id=$1) WHERE id=$1',
      [req.params.id]
    );
    await client.query('COMMIT');
    res.json({ ok: true, insertados });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error en carga masiva' });
  } finally { client.release(); }
});

// ── PUT /api/superadmin/planes/:id ───────────────────────────
router.put('/planes/:id', async (req, res) => {
  const { nombre, descripcion, max_candidatos, max_pruebas, precio, moneda, activo } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE planes SET nombre=$1, descripcion=$2, max_candidatos=$3, max_pruebas=$4,
       precio=$5, moneda=$6, activo=$7 WHERE id=$8 RETURNING *`,
      [nombre, descripcion, max_candidatos, max_pruebas, precio, moneda||'USD', activo, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Plan no encontrado' });
    res.json(rows[0]);
  } catch(err) { res.status(500).json({ error: 'Error al actualizar plan' }); }
});

// ── DELETE /api/superadmin/planes/:id ────────────────────────
router.delete('/planes/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      'UPDATE planes SET activo=false WHERE id=$1 RETURNING id', [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Plan no encontrado' });
    res.json({ ok: true });
  } catch(err) { res.status(500).json({ error: 'Error al desactivar plan' }); }
});

// ── PUT /api/superadmin/items/:id ────────────────────────────
router.put('/items/:id', async (req, res) => {
  const { texto, dimension_id, orden, opciones } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE items SET texto=$1, dimension_id=$2, orden=$3 WHERE id=$4 RETURNING *`,
      [texto, dimension_id || null, orden, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Ítem no encontrado' });

    // Actualizar opciones si se enviaron
    if (opciones?.length) {
      for (const op of opciones) {
        if (op.id) {
          await db.query(
            'UPDATE opciones_item SET texto=$1 WHERE id=$2',
            [op.texto, op.id]
          );
        }
      }
    }
    res.json(rows[0]);
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar ítem' });
  }
});