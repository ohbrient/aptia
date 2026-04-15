require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const app = express();

// ── Middlewares globales ──────────────────────────────────────
app.use(cors({
  origin: process.env.APP_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Aptia API', ts: new Date().toISOString() });
});

// ── Rutas ─────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/superadmin',    require('./routes/superadmin'));
app.use('/api/rrhh',          require('./routes/rrhh'));
app.use('/api/empresa',       require('./routes/empresa'));
app.use('/api/prueba',        require('./routes/publico/prueba'));

// ── 404 ──────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
});

// ── Error global ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error global]', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ── Iniciar servidor ──────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Aptia API corriendo en http://localhost:${PORT}`);
});

module.exports = app;
