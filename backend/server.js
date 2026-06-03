// ============================================================
//  server.js — Servidor principal Express
//  Calidad & Capacitación — Backend API
// ============================================================

require('dotenv').config();

const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const path       = require('path');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'CAMBIA_ESTO_POR_UNA_CLAVE_SEGURA_Y_LARGA') {
  console.error('❌ ERROR: Definí JWT_SECRET en el archivo .env antes de arrancar.');
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.use('/api/auth/login', rateLimit({
  windowMs: 5 * 60 * 1000, max: 10,
  message: { error: 'Demasiados intentos. Esperá 5 minutos.' },
  standardHeaders: true, legacyHeaders: false,
}));
app.use('/api/auth/register', rateLimit({
  windowMs: 5 * 60 * 1000, max: 5,
  message: { error: 'Demasiados registros desde esta IP.' },
}));
app.use('/api', rateLimit({
  windowMs: 60 * 1000, max: 300,
  message: { error: 'Demasiadas solicitudes. Intentá en un momento.' },
}));

// ─── RUTAS API ───────────────────────────────────────────────
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/members', require('./routes/members'));
app.use('/api/scores',  require('./routes/scores'));
app.use('/api/prode',   require('./routes/prode'));

const { router: newsRouter } = require('./routes/news');
app.use('/api/news', newsRouter);

// ─── FRONTEND ────────────────────────────────────────────────
const PUBLIC_DIR = path.join(__dirname, 'public');
app.use(express.static(PUBLIC_DIR));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Ruta no encontrada.' });
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('💥 Error:', err.message);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`   Entorno: ${process.env.NODE_ENV || 'development'}`);
});