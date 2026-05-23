const router = require('express').Router();
const db     = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM news ORDER BY created_at DESC');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { title, body, category, emoji, author } = req.body;
  if (!title) return res.status(400).json({ error: 'El título es requerido.' });
  try {
    const { rows } = await db.query(
      'INSERT INTO news (title, body, category, emoji, author) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, body, category, emoji, author]
    );
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM news WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;
EOF
