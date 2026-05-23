const router = require('express').Router();
const db     = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM members ORDER BY name');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { name, role, team, avatar_color } = req.body;
  if (!name) return res.status(400).json({ error: 'El nombre es requerido.' });
  try {
    const { rows } = await db.query(
      'INSERT INTO members (name, role, team, avatar_color) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, role, team, avatar_color]
    );
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { name, role, team, avatar_color } = req.body;
  try {
    const { rows } = await db.query(
      'UPDATE members SET name=$1, role=$2, team=$3, avatar_color=$4 WHERE id=$5 RETURNING *',
      [name, role, team, avatar_color, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Miembro no encontrado.' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM members WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;
