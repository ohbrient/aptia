const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db     = require('../../db');
const { auth, checkRol } = require('../../middleware/auth');
const licensing = require('../../services/licensingService');

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
    await db.query('BEGIN');
    const { rows: [empresa] } = await db.query(
      `INSERT INTO empresas_rrhh (nombre, email_contacto, pais, ciudad, telefono, ruc_nit)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [nombre, email_contacto, pais, ciudad, telefono, ruc_nit]
    );
    const hash = await bcrypt.hash(admin_password, 12);
    await db.query(
      `INSERT INTO usuarios_rrhh (empresa_rrhh_id, nombre, email, password_hash, rol)
       VALUES ($1,$2,$3,$4,'admin')`,
      [empresa.id, admin_nombre || nombre, admin_email.toLowerCase(), hash]
    );
    await db.query('COMMIT');
    res.status(201).json(empresa);
  } catch (err) {
    await db.query('ROLLBACK');
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

// ── PUT /api/superadmin/empresas-rrhh/:id/reset-password ─────
router.put('/empresas-rrhh/:id/reset-password', async (req, res) => {
  const { nueva_password } = req.body;
  if (!nueva_password || nueva_password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }
  try {
    const { rows: [admin] } = await db.query(
      `SELECT id, email FROM usuarios_rrhh WHERE empresa_rrhh_id=$1 AND rol='admin' LIMIT 1`,
      [req.params.id]
    );
    if (!admin) return res.status(404).json({ error: 'Administrador no encontrado' });

    const hash = await bcrypt.hash(nueva_password, 12);
    await db.query(
      `UPDATE usuarios_rrhh SET password_hash=$1, updated_at=NOW() WHERE id=$2`,
      [hash, admin.id]
    );
    res.json({ ok: true, email: admin.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al restablecer contraseña' });
  }
});

// ── DELETE /api/superadmin/empresas-rrhh/:id ─────────────────
router.delete('/empresas-rrhh/:id', async (req, res) => {
  try {
    const { rows } = await db.query('UPDATE empresas_rrhh SET activo=false, updated_at=NOW() WHERE id=$1 RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Empresa no encontrada' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Error al eliminar empresa' }); }
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
  if (!empresa_rrhh_id || !plan_id || !candidatos_total || !fecha_vencimiento) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }
  try {
    const { rows: [empresa] } = await db.query('SELECT id, nombre FROM empresas_rrhh WHERE id=$1', [empresa_rrhh_id]);
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });
    const { rows: [plan] } = await db.query('SELECT id FROM planes WHERE id=$1', [plan_id]);
    if (!plan) return res.status(404).json({ error: 'Plan no encontrado' });
    const { rows: [licencia] } = await db.query(
      `INSERT INTO licencias (empresa_rrhh_id, plan_id, candidatos_total, fecha_vencimiento, notas, activa)
       VALUES ($1,$2,$3,$4,$5,false) RETURNING *`,
      [empresa_rrhh_id, plan_id, candidatos_total, fecha_vencimiento, notas]
    );
    res.status(201).json(licencia);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear licencia' });
  }
});

// ── POST /api/superadmin/licencias/:id/descargar-archivo ─────
router.post('/licencias/:id/descargar-archivo', async (req, res) => {
  try {
    const { rows: [lic] } = await db.query(`
      SELECT l.*, e.nombre AS empresa_nombre, p.nombre AS plan_nombre
      FROM licencias l
      JOIN empresas_rrhh e ON e.id = l.empresa_rrhh_id
      JOIN planes p ON p.id = l.plan_id
      WHERE l.id = $1
    `, [req.params.id]);
    if (!lic) return res.status(404).json({ error: 'Licencia no encontrada' });

    const licenseData = {
      licenseId: lic.id,
      empresaId: lic.empresa_rrhh_id,
      empresaNombre: lic.empresa_nombre,
      startDate: lic.fecha_inicio,
      expiryDate: lic.fecha_vencimiento,
      maxUsers: 50,
      maxCandidates: lic.candidatos_total,
      features: ['pruebas', 'reportes', 'analytics']
    };

    const licenseFile = licensing.generateLicenseFile(licenseData);
    const fileContent = licensing.createLicenseFileContent(licenseFile);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${licenseFile.filename}"`);
    res.send(fileContent);
  } catch (err) {
    console.error('[descargar-archivo]', err);
    res.status(500).json({ error: 'Error al generar archivo de licencia' });
  }
});

// ── GET /api/superadmin/licencias/:id/info-descarga ──────────
router.get('/licencias/:id/info-descarga', async (req, res) => {
  try {
    const { rows: [lic] } = await db.query(`
      SELECT l.*, e.nombre AS empresa_nombre, p.nombre AS plan_nombre
      FROM licencias l
      JOIN empresas_rrhh e ON e.id = l.empresa_rrhh_id
      JOIN planes p ON p.id = l.plan_id
      WHERE l.id = $1
    `, [req.params.id]);
    if (!lic) return res.status(404).json({ error: 'Licencia no encontrada' });
    res.json({
      licenseId: lic.id, empresa: lic.empresa_nombre, plan: lic.plan_nombre,
      candidatos: lic.candidatos_total, vencimiento: lic.fecha_vencimiento,
      estado: lic.activa ? 'activa' : 'inactiva'
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener info de licencia' });
  }
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

// ── DELETE /api/superadmin/licencias/:id ─────────────────────
router.delete('/licencias/:id', async (req, res) => {
  try {
    const { rows: [lic] } = await db.query('SELECT id FROM licencias WHERE id=$1', [req.params.id]);
    if (!lic) return res.status(404).json({ error: 'Licencia no encontrada' });
    await db.query('DELETE FROM licencias WHERE id=$1', [req.params.id]);
    res.json({ ok: true, mensaje: 'Licencia eliminada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar licencia' });
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
  } catch (err) { res.status(500).json({ error: 'Error al crear plan' }); }
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
    const { rows } = await db.query('UPDATE planes SET activo=false WHERE id=$1 RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Plan no encontrado' });
    res.json({ ok: true });
  } catch(err) { res.status(500).json({ error: 'Error al desactivar plan' }); }
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
      empresas_rrhh:        parseInt(empresas.rows[0].count),
      candidatos_evaluados: parseInt(candidatos.rows[0].count),
      licencias_activas:    parseInt(licencias.rows[0].count),
      pruebas_activas:      parseInt(pruebas.rows[0].count),
    });
  } catch (err) { res.status(500).json({ error: 'Error en dashboard' }); }
});

// ── GET /api/superadmin/pruebas ──────────────────────────────
router.get('/pruebas', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM pruebas ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Error al obtener pruebas' }); }
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
  } catch (err) { res.status(500).json({ error: 'Error al crear prueba' }); }
});

// ── PUT /api/superadmin/pruebas/:id ──────────────────────────
router.put('/pruebas/:id', async (req, res) => {
  try {
    const { rows: [actual] } = await db.query('SELECT * FROM pruebas WHERE id=$1', [req.params.id]);
    if (!actual) return res.status(404).json({ error: 'Prueba no encontrada' });
    const nombre        = req.body.nombre        ?? actual.nombre;
    const descripcion   = req.body.descripcion   ?? actual.descripcion;
    const tipo          = req.body.tipo          ?? actual.tipo;
    const instrucciones = req.body.instrucciones ?? actual.instrucciones;
    const escala_tipo   = req.body.escala_tipo   ?? actual.escala_tipo;
    const activa        = req.body.activa        ?? actual.activa;
    const tiempo_limite = 'tiempo_limite' in req.body ? (req.body.tiempo_limite || null) : actual.tiempo_limite;
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

// ── DELETE /api/superadmin/pruebas/:id ───────────────────────
router.delete('/pruebas/:id', async (req, res) => {
  try {
    const { rows } = await db.query('UPDATE pruebas SET activa=false, updated_at=NOW() WHERE id=$1 RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Prueba no encontrada' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Error al eliminar prueba' }); }
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
    await db.query('BEGIN');
    await db.query('DELETE FROM rrhh_pruebas WHERE empresa_rrhh_id=$1', [req.params.id]);
    for (const pid of (prueba_ids || [])) {
      await db.query('INSERT INTO rrhh_pruebas (empresa_rrhh_id, prueba_id, habilitada) VALUES ($1,$2,true)', [req.params.id, pid]);
    }
    await db.query('COMMIT');
    res.json({ ok: true, asignadas: prueba_ids?.length || 0 });
  } catch (err) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: 'Error al asignar pruebas' });
  } finally { client.release(); }
});

// ── GET /api/superadmin/pruebas/:id/dimensiones ──────────────
router.get('/pruebas/:id/dimensiones', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM dimensiones WHERE prueba_id=$1 ORDER BY orden', [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Error al obtener dimensiones' }); }
});

// ── POST /api/superadmin/pruebas/:id/dimensiones ─────────────
router.post('/pruebas/:id/dimensiones', async (req, res) => {
  const { nombre, codigo, descripcion, orden } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO dimensiones (prueba_id, nombre, codigo, descripcion, orden) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
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
    await db.query('BEGIN');
    const { rows: [item] } = await db.query(
      `INSERT INTO items (prueba_id, dimension_id, texto, orden) VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.params.id, dimension_id || null, texto, orden || 0]
    );
    if (opciones?.length) {
      for (const op of opciones)
        await db.query('INSERT INTO opciones_item (item_id, texto, valor, orden) VALUES ($1,$2,$3,$4)', [item.id, op.texto, op.valor, op.orden]);
    }
    await db.query('UPDATE pruebas SET total_items=(SELECT COUNT(*) FROM items WHERE prueba_id=$1) WHERE id=$1', [req.params.id]);
    await db.query('COMMIT');
    res.status(201).json(item);
  } catch (err) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: 'Error al crear ítem' });
  } finally { client.release(); }
});

// ── DELETE /api/superadmin/items/:id ─────────────────────────
router.delete('/items/:id', async (req, res) => {
  try {
    const { rows: [item] } = await db.query('DELETE FROM items WHERE id=$1 RETURNING prueba_id', [req.params.id]);
    if (item) await db.query('UPDATE pruebas SET total_items=(SELECT COUNT(*) FROM items WHERE prueba_id=$1) WHERE id=$1', [item.prueba_id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Error al eliminar ítem' }); }
});

// ── POST /api/superadmin/pruebas/:id/items/bulk ──────────────
router.post('/pruebas/:id/items/bulk', async (req, res) => {
  const { items } = req.body;
  if (!items?.length) return res.status(400).json({ error: 'Lista de ítems requerida' });
  const client = await db.pool.connect();
  try {
    await db.query('BEGIN');
    const { rows: dims } = await db.query('SELECT id, codigo FROM dimensiones WHERE prueba_id=$1', [req.params.id]);
    const dimMap = {};
    dims.forEach(d => dimMap[d.codigo.toUpperCase()] = d.id);
    let insertados = 0;
    for (const it of items) {
      const dim_id = it.dimension_codigo ? (dimMap[it.dimension_codigo.toUpperCase()] || null) : null;
      const { rows: [item] } = await db.query(
        'INSERT INTO items (prueba_id, dimension_id, texto, orden) VALUES ($1,$2,$3,$4) RETURNING id',
        [req.params.id, dim_id, it.texto, it.orden || insertados]
      );
      if (it.opciones?.length)
        for (const op of it.opciones)
          await db.query('INSERT INTO opciones_item (item_id, texto, valor, orden) VALUES ($1,$2,$3,$4)', [item.id, op.texto, op.valor, op.orden]);
      insertados++;
    }
    await db.query('UPDATE pruebas SET total_items=(SELECT COUNT(*) FROM items WHERE prueba_id=$1) WHERE id=$1', [req.params.id]);
    await db.query('COMMIT');
    res.json({ ok: true, insertados });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error en carga masiva' });
  } finally { client.release(); }
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
    if (opciones?.length)
      for (const op of opciones)
        if (op.id) await db.query('UPDATE opciones_item SET texto=$1 WHERE id=$2', [op.texto, op.id]);
    res.json(rows[0]);
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar ítem' });
  }
});

// ── POST /api/superadmin/demo/crear ──────────────────────────
router.post('/demo/crear', async (req, res) => {
  const { prospecto_nombre, empresa_nombre, email, tipo } = req.body;
  if (!prospecto_nombre || !empresa_nombre || !email || !tipo)
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  try {
    await db.query('BEGIN');
    const expira = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const { rows: [empresa] } = await db.query(`
      INSERT INTO empresas_rrhh (nombre, email_contacto, activo, onboarding_completado, es_demo, demo_tipo, demo_expira_at, demo_prospecto)
      VALUES ($1,$2,true,true,$3,$4,$5,$6) RETURNING *
    `, [empresa_nombre, email, true, tipo, expira, prospecto_nombre]);

    const password = 'Demo' + Math.random().toString(36).slice(2, 8) + '!';
    const hash = await bcrypt.hash(password, 10);
    await db.query(`
      INSERT INTO usuarios_rrhh (empresa_rrhh_id, nombre, email, password_hash, rol, activo, permisos)
      VALUES ($1,$2,$3,$4,'admin',true,$5)
    `, [empresa.id, prospecto_nombre, email, hash,
        JSON.stringify({ ver_candidatos:true, gestionar_procesos:true, invitar_candidatos:true, ver_reportes:true, administrador:true })]);

    const { rows: [plan] } = await db.query("SELECT id FROM planes WHERE nombre = 'Profesional' LIMIT 1");
    if (plan) {
      await db.query(`
        INSERT INTO licencias (empresa_rrhh_id, plan_id, candidatos_total, candidatos_usados, fecha_vencimiento, activa, notas)
        VALUES ($1,$2,150,0,$3,true,'Licencia demo')
      `, [empresa.id, plan.id, expira]);
    }

    await db.query('COMMIT');
    res.json({
      ok: true, empresa_id: empresa.id, email, password, expira: expira.toISOString(),
      login_url: (process.env.FRONTEND_URL || 'http://localhost:5173') + '/login'
    });
  } catch(err) {
    await db.query('ROLLBACK');
    console.error('[demo/crear]', err.message);
    res.status(500).json({ error: 'Error al crear demo: ' + err.message });
  }
});

// ── GET /api/superadmin/demos ─────────────────────────────────
router.get('/demos', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT e.id, e.nombre, e.email_contacto, e.demo_tipo, e.demo_expira_at, e.demo_prospecto,
        e.activo, e.created_at, u.email AS admin_email,
        EXTRACT(EPOCH FROM (e.demo_expira_at - NOW())) / 86400 AS dias_restantes
      FROM empresas_rrhh e
      LEFT JOIN usuarios_rrhh u ON u.empresa_rrhh_id = e.id AND u.rol = 'admin'
      WHERE e.es_demo = true
      ORDER BY e.created_at DESC
    `);
    res.json(rows);
  } catch(err) { res.status(500).json({ error: 'Error al obtener demos' }); }
});

// ── DELETE /api/superadmin/demos/:id ─────────────────────────
router.delete('/demos/:id', async (req, res) => {
  try {
    await db.query(`UPDATE empresas_rrhh SET activo=false WHERE id=$1 AND es_demo=true`, [req.params.id]);
    res.json({ ok: true });
  } catch(err) { res.status(500).json({ error: 'Error al desactivar demo' }); }
});

// ── DELETE /api/superadmin/empresas-rrhh/:id/completo ────────
router.delete('/empresas-rrhh/:id/completo', async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [empresa] } = await client.query('SELECT id, nombre FROM empresas_rrhh WHERE id=$1', [req.params.id]);
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });

    await client.query('DELETE FROM licencias WHERE empresa_rrhh_id=$1', [req.params.id]);
    await client.query('DELETE FROM sublicencias WHERE empresa_rrhh_id=$1', [req.params.id]);
    await client.query('DELETE FROM rrhh_pruebas WHERE empresa_rrhh_id=$1', [req.params.id]);

    const { rows: empresasCliente } = await client.query('SELECT id FROM empresas_cliente WHERE empresa_rrhh_id=$1', [req.params.id]);
    for (const ec of empresasCliente) {
      const { rows: procesos } = await client.query('SELECT id FROM procesos WHERE empresa_cliente_id=$1', [ec.id]);
      for (const p of procesos) {
        const { rows: candidatos } = await client.query('SELECT id FROM candidatos WHERE proceso_id=$1', [p.id]);
        for (const c of candidatos) {
          await client.query('DELETE FROM respuestas WHERE sesion_id IN (SELECT id FROM sesiones_prueba WHERE candidato_id=$1)', [c.id]);
          await client.query('DELETE FROM resultados WHERE sesion_id IN (SELECT id FROM sesiones_prueba WHERE candidato_id=$1)', [c.id]);
          await client.query('DELETE FROM sesiones_prueba WHERE candidato_id=$1', [c.id]);
          await client.query('DELETE FROM informes WHERE candidato_id=$1', [c.id]);
        }
        await client.query('DELETE FROM candidatos WHERE proceso_id=$1', [p.id]);
        await client.query('DELETE FROM proceso_pruebas WHERE proceso_id=$1', [p.id]);
      }
      await client.query('DELETE FROM procesos WHERE empresa_cliente_id=$1', [ec.id]);
      await client.query('DELETE FROM usuarios_empresa WHERE empresa_cliente_id=$1', [ec.id]);
    }
    await client.query('DELETE FROM empresas_cliente WHERE empresa_rrhh_id=$1', [req.params.id]);
    await client.query('DELETE FROM usuarios_rrhh WHERE empresa_rrhh_id=$1', [req.params.id]);
    await client.query('DELETE FROM activity_log WHERE empresa_rrhh_id=$1', [req.params.id]);
    await client.query('DELETE FROM empresas_rrhh WHERE id=$1', [req.params.id]);

    await client.query('COMMIT');
    res.json({ ok: true, mensaje: `Empresa "${empresa.nombre}" eliminada completamente` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[DELETE empresa completo]', err.message);
    res.status(500).json({ error: 'Error al eliminar empresa' });
  } finally {
    client.release();
  }
});

module.exports = router;