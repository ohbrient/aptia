const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../db');
const { auth } = require('../middleware/auth');

const sign = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

router.post('/login', async (req, res) => {
  const { email, password, rol } = req.body;
  if (!email || !password || !rol)
    return res.status(400).json({ error: 'Email, contrasena y rol son requeridos' });
  try {
    let user = null;
    let tokenPayload = {};
    if (rol === 'superadmin') {
      const { rows } = await db.query('SELECT * FROM superadmins WHERE email = $1 AND activo = true', [email.toLowerCase()]);
      if (rows.length) { user = rows[0]; tokenPayload = { id: user.id, rol: 'superadmin', nombre: user.nombre, email: user.email }; }
    } else if (rol === 'rrhh') {
      const { rows } = await db.query(`
        SELECT u.*, e.nombre AS empresa_nombre, e.id AS empresa_id
        FROM usuarios_rrhh u
        JOIN empresas_rrhh e ON e.id = u.empresa_rrhh_id
        WHERE u.email = $1 AND u.activo = true AND e.activo = true
      `, [email.toLowerCase()]);
      if (rows.length) {
        user = rows[0];
        const esAdmin = user.rol === 'admin';
        const permisos = esAdmin
          ? { ver_candidatos: true, gestionar_procesos: true, invitar_candidatos: true, ver_reportes: true, administrador: true }
          : (user.permisos || {});
        tokenPayload = {
          id: user.id, rol: 'rrhh', nombre: user.nombre, email: user.email,
          empresa_rrhh_id: user.empresa_id, empresa_nombre: user.empresa_nombre,
          sub_rol: user.rol, permisos,
        };
      }
    } else if (rol === 'empresa') {
      const { rows } = await db.query(`
        SELECT u.*, e.nombre AS empresa_nombre, e.id AS empresa_id, e.empresa_rrhh_id
        FROM usuarios_empresa u
        JOIN empresas_cliente e ON e.id = u.empresa_cliente_id
        WHERE u.email = $1 AND u.activo = true AND e.activo = true
      `, [email.toLowerCase()]);
      if (rows.length) { user = rows[0]; tokenPayload = { id: user.id, rol: 'empresa', nombre: user.nombre, email: user.email, empresa_cliente_id: user.empresa_id, empresa_nombre: user.empresa_nombre, empresa_rrhh_id: user.empresa_rrhh_id, sub_rol: user.rol }; }
    } else { return res.status(400).json({ error: 'Rol invalido' }); }

    if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Credenciales incorrectas' });
    const table = rol === 'superadmin' ? 'superadmins' : rol === 'rrhh' ? 'usuarios_rrhh' : 'usuarios_empresa';
    await db.query(`UPDATE ${table} SET ultimo_login = NOW() WHERE id = $1`, [user.id]);
    return res.json({ token: sign(tokenPayload), user: tokenPayload });
  } catch (err) { console.error('[auth/login]', err); return res.status(500).json({ error: 'Error interno' }); }
});

router.get('/me', auth, async (req, res) => { res.json({ user: req.user }); });

router.post('/cambiar-password', auth, async (req, res) => {
  const { password_actual, password_nuevo } = req.body;
  const { id, rol } = req.user;
  if (!password_actual || !password_nuevo) return res.status(400).json({ error: 'Ambas contrasenas son requeridas' });
  if (password_nuevo.length < 6) return res.status(400).json({ error: 'Minimo 6 caracteres' });
  const tabla = rol === 'superadmin' ? 'superadmins' : rol === 'rrhh' ? 'usuarios_rrhh' : 'usuarios_empresa';
  try {
    const { rows } = await db.query(`SELECT password_hash FROM ${tabla} WHERE id=$1`, [id]);
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    const ok = await bcrypt.compare(password_actual, rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: 'La contrasena actual es incorrecta' });
    const hash = await bcrypt.hash(password_nuevo, 12);
    await db.query(`UPDATE ${tabla} SET password_hash=$1, updated_at=NOW() WHERE id=$2`, [hash, id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Error al cambiar contrasena' }); }
});

module.exports = router;