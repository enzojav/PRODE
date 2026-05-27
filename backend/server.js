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

// Validar que JWT_SECRET esté seteado
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'CAMBIA_ESTO_POR_UNA_CLAVE_SEGURA_Y_LARGA') {
  console.error('❌ ERROR: Definí JWT_SECRET en el archivo .env antes de arrancar.');
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1);
	
// ─── SEGURIDAD: HEADERS HTTP ─────────────────────────────────
app.use(helmet({
  // Permite que el frontend sirva scripts inline (para la SPA)
  contentSecurityPolicy: false,
}));

// ─── CORS ────────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// ─── BODY PARSING ────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

// ─── RATE LIMITING ───────────────────────────────────────────
// Login: máximo 10 intentos por 15 minutos por IP (anti brute-force)
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos. Esperá 15 minutos.' },
  standardHeaders: true,
  legacyHeaders:   false,
}));

// Registro: 5 por hora por IP
app.use('/api/auth/register', rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Demasiados registros desde esta IP.' },
}));

// API general: 300 requests por minuto por IP
app.use('/api', rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: { error: 'Demasiadas solicitudes. Intentá en un momento.' },
}));

// ─── RUTAS API ───────────────────────────────────────────────
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/members', require('./routes/members'));
app.use('/api/scores',  require('./routes/scores'));
app.use('/api/news',    require('./routes/news'));
app.use('/api/prode',   require('./routes/prode'));
app.use('/api/sync',    require('./routes/sync'));

// ─── SERVIR FRONTEND (SPA) ───────────────────────────────────
// En producción el frontend está en la carpeta /public
const PUBLIC_DIR = path.join(__dirname, 'public');
app.use(express.static(PUBLIC_DIR));

// Cualquier ruta que no sea /api devuelve el index.html (SPA routing)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Ruta no encontrada.' });
  }
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// ─── MANEJO DE ERRORES ───────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('💥 Error:', err.message);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

// ─── ARRANCAR ────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`   Entorno: ${process.env.NODE_ENV || 'development'}`);
});
