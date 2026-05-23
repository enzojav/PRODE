const router = require('express').Router();
const db     = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  const { period } = req.query;
  try {
    let query = `
      SELECT s.*, m.name as member_name, m.team
      FROM scores s
      JOIN members m ON s.member_id = m.id
    `;
    const params = [];
    if (period) {
      query += ' WHERE s.period = $1';
      params.push(period);
    }
    query += ' ORDER BY m.name';
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

router.put('/', requireAuth, requireAdmin, async (req, res) => {
  const { member_id, period, category, value, weight } = req.body;
  try {
    const exists = await db.query(
      'SELECT id FROM scores WHERE member_id=$1 AND period=$2 AND category=$3',
      [member_id, period, category]
    );
    if (exists.rows.length > 0) {
      const { rows } = await db.query(
        'UPDATE scores SET value=$1, weight=$2 WHERE member_id=$3 AND period=$4 AND category=$5 RETURNING *',
        [value, weight, member_id, period, category]
      );
      res.json(rows[0]);
    } else {
      const { rows } = await db.query(
        'INSERT INTO scores (member_id, period, category, value, weight) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [member_id, period, category, value, weight]
      );
      res.json(rows[0]);
    }
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

router.get('/courses', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM courses ORDER BY name');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;
