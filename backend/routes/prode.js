const router = require('express').Router();
const db     = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// ── Helpers de puntos ─────────────────────────────────────────
function goalsToResult(h, a) {
  if (h === null || a === null || h === undefined || a === undefined) return null;
  const hN = Number(h), aN = Number(a);
  if (isNaN(hN) || isNaN(aN)) return null;
  return hN > aN ? '1' : hN < aN ? '2' : 'x';
}

function calcPoints(pred, match) {
  const mH = match.home_score !== null ? Number(match.home_score) : null;
  const mA = match.away_score !== null ? Number(match.away_score) : null;
  if (mH === null || mA === null) return 0;

  const pH = pred.home_score !== null && pred.home_score !== undefined ? Number(pred.home_score) : null;
  const pA = pred.away_score !== null && pred.away_score !== undefined ? Number(pred.away_score) : null;

  const realResult = goalsToResult(mH, mA);
  const predResult = pred.result || goalsToResult(pH, pA);

  if (pH !== null && pA !== null && !isNaN(pH) && !isNaN(pA) && pH === mH && pA === mA) return 10;
  if (predResult && predResult === realResult) return 5;
  return 0;
}

// ── Lock por fecha/hora ───────────────────────────────────────
const MONTH_MAP = { Ene:0,Feb:1,Mar:2,Abr:3,May:4,Jun:5,Jul:6,Ago:7,Sep:8,Oct:9,Nov:10,Dic:11 };
function isMatchLocked(match) {
  try {
    const parts = (match.match_date || '').split(' ');
    const day   = parseInt(parts[1]);
    const month = MONTH_MAP[parts[2]];
    const [hh, mm] = (match.time || '00:00').split(':').map(Number);
    return new Date() >= new Date(2026, month, day, hh, mm, 0);
  } catch { return false; }
}

// ── PARTIDOS ──────────────────────────────────────────────────
router.get('/matches', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM prode_matches ORDER BY id');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

router.put('/matches/:id/result', requireAuth, requireAdmin, async (req, res) => {
  const { home_score, away_score } = req.body;
  if (home_score === undefined || away_score === undefined)
    return res.status(400).json({ error: 'Faltan goles.' });

  const hN = Number(home_score), aN = Number(away_score);
  if (isNaN(hN) || isNaN(aN) || hN < 0 || aN < 0)
    return res.status(400).json({ error: 'Goles inválidos.' });

  try {
    const { rows } = await db.query(
      'UPDATE prode_matches SET home_score=$1, away_score=$2 WHERE id=$3 RETURNING *',
      [hN, aN, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Partido no encontrado.' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

// ── BORRAR RESULTADO (solo admin) ─────────────────────────────
router.delete('/matches/:id/result', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      'UPDATE prode_matches SET home_score=NULL, away_score=NULL WHERE id=$1 RETURNING *',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Partido no encontrado.' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

// ── PREDICCIONES ──────────────────────────────────────────────
router.get('/predictions', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM prode_predictions WHERE username=$1',
      [req.user.username]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

router.post('/predictions', requireAuth, async (req, res) => {
  const { match_id, result, home_score, away_score } = req.body;
  if (!match_id) return res.status(400).json({ error: 'Falta match_id.' });

  try {
    // Verificar lock en el servidor
    const { rows: matchRows } = await db.query('SELECT * FROM prode_matches WHERE id=$1', [match_id]);
    const match = matchRows[0];
    if (!match) return res.status(404).json({ error: 'Partido no encontrado.' });

    if (isMatchLocked(match))
      return res.status(403).json({ error: 'El partido ya comenzó, no podés modificar tu pronóstico.' });

    const exists = await db.query(
      'SELECT id FROM prode_predictions WHERE username=$1 AND match_id=$2',
      [req.user.username, match_id]
    );

    let saved;
    if (exists.rows.length > 0) {
      const { rows } = await db.query(
        'UPDATE prode_predictions SET result=$1, home_score=$2, away_score=$3 WHERE username=$4 AND match_id=$5 RETURNING *',
        [result || null, home_score ?? null, away_score ?? null, req.user.username, match_id]
      );
      saved = rows[0];
    } else {
      const { rows } = await db.query(
        'INSERT INTO prode_predictions (username, match_id, result, home_score, away_score) VALUES ($1,$2,$3,$4,$5) RETURNING *',
        [req.user.username, match_id, result || null, home_score ?? null, away_score ?? null]
      );
      saved = rows[0];
    }
    res.json(saved);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ── STANDINGS (lógica correcta: 10/5/0) ──────────────────────
router.get('/standings', requireAuth, async (req, res) => {
  try {
    const matches = await db.query('SELECT * FROM prode_matches WHERE home_score IS NOT NULL');
    const preds   = await db.query('SELECT * FROM prode_predictions');
    const users   = await db.query("SELECT username, display_name FROM users WHERE status='active'");

    const standings = users.rows.map(u => {
      let pts = 0, exact = 0, winner = 0, total = 0;
      matches.rows.forEach(m => {
        const p = preds.rows.find(p => p.username === u.username && p.match_id === m.id);
        if (!p) return;
        total++;
        const pts_match = calcPoints(p, m);
        if (pts_match === 10) { pts += 10; exact++; }
        else if (pts_match === 5) { pts += 5; winner++; }
      });
      return {
        username:    u.username,
        displayName: u.display_name,
        pts,
        exact,
        ok:    exact + winner,
        total,
      };
    }).filter(s => s.total > 0);

    standings.sort((a,b) => b.pts - a.pts || b.exact - a.exact);
    res.json(standings);
  } catch (e) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

module.exports = router;
