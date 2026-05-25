const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../config/db');

// LOGIN
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Completá todos los campos.' });

  try {
    const { rows } = await db.query('SELECT * FROM users WHERE username = $1', [username.trim()]);
    const user = rows[0];
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });

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

// REGISTER
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
    const color = ['#6CACE4','#FFB81C','#85bde8','#002470','#3ae8d0'][Math.floor(Math.random()*5)];
    const result = await db.query(
      "INSERT INTO users (username, password, display_name, role, color) VALUES ($1, $2, $3, 'player', $4) RETURNING id",
      [username.trim(), hash, displayName.trim(), color]
    );
    const token = jwt.sign(
      { id: result.rows[0].id, username: username.trim(), role: 'player' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    res.json({
      token,
      user: { id: result.rows[0].id, username: username.trim(), displayName: displayName.trim(), role: 'player' }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ME
router.get('/me', require('../middleware/auth').requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, username, display_name, role FROM users WHERE id = $1', [req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado.' });
    const u = rows[0];
    res.json({ user: { id: u.id, username: u.username, displayName: u.display_name, role: u.role } });
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;

