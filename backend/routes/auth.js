const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// ─── LOGIN ────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Completá todos los campos.' });

  try {
    const { rows } = await db.query('SELECT * FROM users WHERE username = $1', [username.trim()]);
    const user = rows[0];

    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });

    // Bloquear si no está activo
    if (user.status === 'pending')
      return res.status(403).json({ error: 'Tu cuenta está pendiente de aprobación por el administrador.' });
    if (user.status === 'banned')
      return res.status(403).json({ error: 'Tu cuenta fue desactivada. Contactá al administrador.' });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    res.json({
      token,
      user: { id: user.id, username: user.username, displayName: user.display_name, role: user.role }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ─── REGISTER ─────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { username, password, displayName } = req.body;
  if (!username || !password || !displayName)
    return res.status(400).json({ error: 'Completá todos los campos.' });
  if (password.length < 4)
    return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres.' });
  if (/\s/.test(username))
    return res.status(400).json({ error: 'El usuario no puede tener espacios.' });

  try {
    const exists = await db.query('SELECT id FROM users WHERE username = $1', [username.trim()]);
    if (exists.rows.length > 0)
      return res.status(409).json({ error: 'Ese usuario ya existe.' });

    const hash  = bcrypt.hashSync(password, 10);
    const color = ['#6CACE4','#FFB81C','#85bde8','#002470','#3ae8d0'][Math.floor(Math.random() * 5)];

    // Nuevo usuario queda en 'pending' hasta que el admin lo apruebe
    await db.query(
      "INSERT INTO users (username, password, display_name, role, status, color) VALUES ($1, $2, $3, 'player', 'pending', $4)",
      [username.trim(), hash, displayName.trim(), color]
    );

    // No se devuelve token — el usuario debe esperar aprobación
    res.status(201).json({
      pending: true,
      message: 'Cuenta creada. Un administrador debe aprobarla antes de que puedas ingresar.'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ─── ME ───────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, username, display_name, role, status FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado.' });
    const u = rows[0];
    if (u.status !== 'active')
      return res.status(403).json({ error: 'Cuenta inactiva.' });
    res.json({ user: { id: u.id, username: u.username, displayName: u.display_name, role: u.role } });
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ─── ADMIN: listar usuarios pendientes ───────────────────────
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT id, username, display_name, role, status, created_at FROM users WHERE username != 'admin' ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ─── ADMIN: aprobar / banear / reactivar usuario ──────────────
// status puede ser: 'active' | 'banned'
router.put('/users/:id/status', requireAuth, requireAdmin, async (req, res) => {
  const { status } = req.body;
  if (!['active', 'banned', 'pending'].includes(status))
    return res.status(400).json({ error: 'Estado inválido.' });

  try {
    // No se puede modificar al admin principal
    const { rows: target } = await db.query('SELECT role FROM users WHERE id = $1', [req.params.id]);
    if (!target[0]) return res.status(404).json({ error: 'Usuario no encontrado.' });
    if (target[0].role === 'admin')
      return res.status(403).json({ error: 'No podés modificar al administrador.' });

    await db.query('UPDATE users SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ ok: true, status });
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ─── ADMIN: eliminar usuario ──────────────────────────────────
router.delete('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows: target } = await db.query('SELECT role FROM users WHERE id = $1', [req.params.id]);
    if (!target[0]) return res.status(404).json({ error: 'Usuario no encontrado.' });
    if (target[0].role === 'admin')
      return res.status(403).json({ error: 'No podés eliminar al administrador.' });

    await db.query('DELETE FROM prode_predictions WHERE username = (SELECT username FROM users WHERE id = $1)', [req.params.id]);
    await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;
