const router = require('express').Router();
const db     = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Partidos
router.get('/matches', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM prode_matches ORDER BY match_date');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

router.put('/matches/:id/result', requireAuth, requireAdmin, async (req, res) => {
  const { home_score, away_score } = req.body;
  try {
    const { rows } = await db.query(
      'UPDATE prode_matches SET home_score=$1, away_score=$2 WHERE id=$3 RETURNING *',
      [home_score, away_score, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Partido no encontrado.' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// Predicciones
router.get('/predictions', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM prode_predictions WHERE username=$1',
      [req.user.username]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

router.post('/predictions', requireAuth, async (req, res) => {
  const { match_id, home_score, away_score } = req.body;
  try {
    const exists = await db.query(
      'SELECT id FROM prode_predictions WHERE username=$1 AND match_id=$2',
      [req.user.username, match_id]
    );
    if (exists.rows.length > 0) {
      const { rows } = await db.query(
        'UPDATE prode_predictions SET home_score=$1, away_score=$2 WHERE username=$3 AND match_id=$4 RETURNING *',
        [home_score, away_score, req.user.username, match_id]
      );
      res.json(rows[0]);
    } else {
      const { rows } = await db.query(
        'INSERT INTO prode_predictions (username, match_id, home_score, away_score) VALUES ($1, $2, $3, $4) RETURNING *',
        [req.user.username, match_id, home_score, away_score]
      );
      res.json(rows[0]);
    }
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

router.post('/predictions/submit', requireAuth, async (req, res) => {
  try {
    await db.query(
      'UPDATE prode_predictions SET submitted=true WHERE username=$1',
      [req.user.username]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// Standings
router.get('/standings', requireAuth, async (req, res) => {
  try {
    const matches = await db.query('SELECT * FROM prode_matches WHERE home_score IS NOT NULL');
    const preds   = await db.query('SELECT * FROM prode_predictions');
    const users   = await db.query('SELECT username, display_name FROM users');

    const standings = users.rows.map(u => {
      let pts = 0, exact = 0, total = 0;
      matches.rows.forEach(m => {
        const p = preds.rows.find(p => p.username === u.username && p.match_id === m.id);
        if (!p) return;
        total++;
        if (p.home_score === m.home_score && p.away_score === m.away_score) {
          pts += 3; exact++;
        } else if (Math.sign(p.home_score - p.away_score) === Math.sign(m.home_score - m.away_score)) {
          pts += 1;
        }
      });
      return { username: u.username, displayName: u.display_name, pts, exact, total };
    });

    standings.sort((a, b) => b.pts - a.pts);
    res.json(standings);
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;
EOF
