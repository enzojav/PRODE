const router = require('express').Router();
const db     = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { createMatchNews } = require('./news');

// ─── /me ─────────────────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  res.json({ username: req.user.username, role: req.user.role });
});

// ─── Helpers ──────────────────────────────────────────────────
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

  const phase = match.phase || 'group';
  const isElim = phase === 'R16' || phase === 'QF' || phase === 'SF' || phase === 'F';
  const realResult = goalsToResult(mH, mA);
  const pH = pred.home_score !== null && pred.home_score !== undefined ? Number(pred.home_score) : null;
  const pA = pred.away_score !== null && pred.away_score !== undefined ? Number(pred.away_score) : null;
  const predResult = pred.result || goalsToResult(pH, pA);

  if (isElim) return predResult && predResult === realResult ? 10 : 0;

  if (pH !== null && pA !== null && !isNaN(pH) && !isNaN(pA) && pH === mH && pA === mA) return 13;
  if (predResult && predResult === realResult) return 5;
  return 0;
}

function matchWinner(m) {
  if (!m || m.home_score === null || m.away_score === null) return null;
  const hN = Number(m.home_score), aN = Number(m.away_score);
  if (hN > aN) return { name: m.home, flag: m.home_flag || '🏳️' };
  if (aN > hN) return { name: m.away, flag: m.away_flag || '🏳️' };
  return null;
}

const MONTH_MAP = { Ene:0,Feb:1,Mar:2,Abr:3,May:4,Jun:5,Jul:6,Ago:7,Sep:8,Oct:9,Nov:10,Dic:11 };

// ─── PARTIDOS ─────────────────────────────────────────────────
router.get('/matches', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM prode_matches ORDER BY id');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

router.get('/matches/r16', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM prode_matches WHERE phase='R16' ORDER BY id");
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

router.get('/matches/elim', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM prode_matches WHERE phase IN ('QF','SF','F') ORDER BY id");
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
    createMatchNews(rows[0]);
    const phase = rows[0].phase;
    if (phase === 'Group Stage') {
      updateR16Bracket().catch(e => console.error('Error bracket R16:', e.message));
    } else if (phase === 'R16') {
      updateQFBracket().catch(e => console.error('Error bracket QF:', e.message));
    } else if (phase === 'QF') {
      updateSFBracket().catch(e => console.error('Error bracket SF:', e.message));
    } else if (phase === 'SF') {
      updateFinalBracket().catch(e => console.error('Error bracket Final:', e.message));
    }
  } catch (e) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

router.delete('/matches/:id/result', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      'UPDATE prode_matches SET home_score=NULL, away_score=NULL WHERE id=$1 RETURNING *',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Partido no encontrado.' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

// ─── BRACKET AUTOMÁTICO ───────────────────────────────────────

const R16_MAP = {
  200: { home: '1E', away: '3ABCDF' }, 201: { home: '1I', away: '3CDFGH' },
  202: { home: '2A', away: '2B'     }, 203: { home: '1F', away: '2C'     },
  204: { home: '2K', away: '2L'     }, 205: { home: '1H', away: '2J'     },
  206: { home: '1D', away: '3BEFIJ' }, 207: { home: '1G', away: '3AEHIJ' },
  208: { home: '1C', away: '2F'     }, 209: { home: '2E', away: '2I'     },
  210: { home: '1A', away: '3CEFHI' }, 211: { home: '1L', away: '3EHIJK' },
  212: { home: '1J', away: '2H'     }, 213: { home: '2D', away: '2G'     },
  214: { home: '1B', away: '3EFGIJ' }, 215: { home: '1K', away: '3DEIJL' },
};

const QF_MAP = {
  216: [200, 201], 217: [202, 203],
  218: [204, 205], 219: [206, 207],
  220: [208, 209], 221: [210, 211],
  222: [212, 213], 223: [214, 215],
};

const SF_MAP = {
  224: [216, 217], 225: [218, 219],
  226: [220, 221], 227: [222, 223],
};

const REAL_SF_MAP = {
  228: [224, 225],
  231: [226, 227],
};

const FINAL_SF_MAP = {
  232: [228, 231],
};

async function calcGroupStandings() {
  const { rows: matches } = await db.query(
    "SELECT * FROM prode_matches WHERE phase='Group Stage' AND home_score IS NOT NULL"
  );
  const teams = {};
  for (const m of matches) {
    const grp = (m.group_name || '').split('·')[0].trim();
    const grpLetter = grp.replace('Grupo ', '').trim();
    const hS = Number(m.home_score), aS = Number(m.away_score);
    if (!teams[m.home]) teams[m.home] = { pts:0, gf:0, ga:0, group: grpLetter, flag: m.home_flag || '🏳️' };
    if (!teams[m.away]) teams[m.away] = { pts:0, gf:0, ga:0, group: grpLetter, flag: m.away_flag || '🏳️' };
    teams[m.home].gf += hS; teams[m.home].ga += aS;
    teams[m.away].gf += aS; teams[m.away].ga += hS;
    if (hS > aS) { teams[m.home].pts += 3; }
    else if (hS < aS) { teams[m.away].pts += 3; }
    else { teams[m.home].pts += 1; teams[m.away].pts += 1; }
  }
  const groups = {};
  for (const [name, data] of Object.entries(teams)) {
    if (!groups[data.group]) groups[data.group] = [];
    groups[data.group].push({ name, ...data, gd: data.gf - data.ga });
  }
  for (const g of Object.keys(groups)) {
    groups[g].sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  }
  return groups;
}

async function updateR16Bracket() {
  const groups = await calcGroupStandings();
  const resolved = {};
  for (const [grpLetter, standing] of Object.entries(groups)) {
    if (standing.length >= 1) resolved[`1${grpLetter}`] = standing[0];
    if (standing.length >= 2) resolved[`2${grpLetter}`] = standing[1];
    if (standing.length >= 3) resolved[`3${grpLetter}`] = standing[2];
  }
  const allThirds = Object.entries(groups)
    .filter(([, s]) => s.length >= 3)
    .map(([grp, s]) => ({ ...s[2], group: grp }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  function getBestThird(groupsStr) {
    const letters = groupsStr.replace('3','').split('');
    return allThirds.filter(t => letters.includes(t.group))[0] || null;
  }
  for (const [matchIdStr, slots] of Object.entries(R16_MAP)) {
    const matchId = parseInt(matchIdStr);
    const homeTeam = slots.home.startsWith('3') ? getBestThird(slots.home) : resolved[slots.home] || null;
    const awayTeam = slots.away.startsWith('3') ? getBestThird(slots.away) : resolved[slots.away] || null;
    if (!homeTeam && !awayTeam) continue;
    const updates = [], vals = [];
    let i = 1;
    if (homeTeam) { updates.push(`home=$${i++}, home_flag=$${i++}`); vals.push(homeTeam.name, homeTeam.flag); }
    if (awayTeam) { updates.push(`away=$${i++}, away_flag=$${i++}`); vals.push(awayTeam.name, awayTeam.flag); }
    vals.push(matchId);
    await db.query(`UPDATE prode_matches SET ${updates.join(', ')} WHERE id=$${i}`, vals);
  }
  console.log('✅ Bracket R16 actualizado');
  await updateQFBracket();
}

async function updateQFBracket() {
  const { rows: r16 } = await db.query("SELECT * FROM prode_matches WHERE phase='R16'");
  const byId = {};
  r16.forEach(m => { byId[m.id] = m; });
  for (const [qfIdStr, r16Ids] of Object.entries(QF_MAP)) {
    const qfId = parseInt(qfIdStr);
    const wA = matchWinner(byId[r16Ids[0]]);
    const wB = matchWinner(byId[r16Ids[1]]);
    if (!wA && !wB) continue;
    const updates = [], vals = [];
    let i = 1;
    if (wA) { updates.push(`home=$${i++}, home_flag=$${i++}`); vals.push(wA.name, wA.flag); }
    if (wB) { updates.push(`away=$${i++}, away_flag=$${i++}`); vals.push(wB.name, wB.flag); }
    vals.push(qfId);
    await db.query(`UPDATE prode_matches SET ${updates.join(', ')} WHERE id=$${i}`, vals);
  }
  console.log('✅ Bracket QF actualizado');
  await updateSFBracket();
}

async function updateSFBracket() {
  const { rows: qf } = await db.query("SELECT * FROM prode_matches WHERE id IN (224,225,226,227)");
  const byId = {};
  qf.forEach(m => { byId[m.id] = m; });
  for (const [sfIdStr, qfIds] of Object.entries(REAL_SF_MAP)) {
    const sfId = parseInt(sfIdStr);
    const wA = matchWinner(byId[qfIds[0]]);
    const wB = matchWinner(byId[qfIds[1]]);
    if (!wA && !wB) continue;
    const updates = [], vals = [];
    let i = 1;
    if (wA) { updates.push(`home=$${i++}, home_flag=$${i++}`); vals.push(wA.name, wA.flag); }
    if (wB) { updates.push(`away=$${i++}, away_flag=$${i++}`); vals.push(wB.name, wB.flag); }
    vals.push(sfId);
    await db.query(`UPDATE prode_matches SET ${updates.join(', ')} WHERE id=$${i}`, vals);
  }
  console.log('✅ Bracket SF actualizado');
  await updateFinalBracket();
}

async function updateFinalBracket() {
  const { rows: sf } = await db.query("SELECT * FROM prode_matches WHERE phase='SF'");
  const byId = {};
  sf.forEach(m => { byId[m.id] = m; });
  const w224 = matchWinner(byId[224]);
  const w225 = matchWinner(byId[225]);
  const w226 = matchWinner(byId[226]);
  const w227 = matchWinner(byId[227]);
  const homeTeam = w224 || w225 || null;
  const awayTeam = w226 || w227 || null;
  if (!homeTeam && !awayTeam) return;
  const updates = [], vals = [];
  let i = 1;
  if (homeTeam) { updates.push(`home=$${i++}, home_flag=$${i++}`); vals.push(homeTeam.name, homeTeam.flag); }
  if (awayTeam) { updates.push(`away=$${i++}, away_flag=$${i++}`); vals.push(awayTeam.name, awayTeam.flag); }
  vals.push(228);
  await db.query(`UPDATE prode_matches SET ${updates.join(', ')} WHERE id=$${i}`, vals);
  console.log('✅ Bracket Final actualizado');
}

router.post('/bracket/update', requireAuth, requireAdmin, async (req, res) => {
  try {
    await updateR16Bracket();
    res.json({ ok: true, message: 'Bracket completo actualizado.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ─── PREDICCIONES ─────────────────────────────────────────────
router.get('/predictions', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM prode_predictions WHERE username = $1', [req.user.username]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

router.post('/predictions', requireAuth, async (req, res) => {
  const { match_id, result, home_score, away_score } = req.body;
  if (!match_id) return res.status(400).json({ error: 'Falta match_id.' });
  try {
    const { rows: matchRows } = await db.query('SELECT * FROM prode_matches WHERE id = $1', [match_id]);
    const match = matchRows[0];
    if (!match) return res.status(404).json({ error: 'Partido no encontrado.' });
    try {
      const parts = (match.match_date || '').split(' ');
      const day   = parseInt(parts[1]);
      const month = MONTH_MAP[parts[2]];
      const [hh, mm] = (match.time || '00:00').split(':').map(Number);
      const matchTime = new Date(Date.UTC(2026, month, day, hh + 3, mm, 0));
      const lockTime  = new Date(matchTime.getTime() - 60 * 60 * 1000);
      if (new Date() >= lockTime)
        return res.status(403).json({ error: 'Las predicciones para este partido están cerradas (1 hora antes del inicio).' });
    } catch { }
    const exists = await db.query('SELECT id FROM prode_predictions WHERE username = $1 AND match_id = $2', [req.user.username, match_id]);
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

// ─── STANDINGS ────────────────────────────────────────────────
router.get('/standings', requireAuth, async (req, res) => {
  try {
    const matches = await db.query("SELECT * FROM prode_matches WHERE home_score IS NOT NULL");
    const preds   = await db.query('SELECT * FROM prode_predictions');
    const users   = await db.query("SELECT username, display_name FROM users WHERE status = 'active' AND role != 'admin'");
    const standings = users.rows.map(u => {
      let pts = 0, exact = 0, winner = 0, total = 0;
      matches.rows.forEach(m => {
        const p = preds.rows.find(p => p.username === u.username && p.match_id === m.id);
        if (!p) return;
        total++;
        const pts_match = calcPoints(p, m);
        if (pts_match === 13) { pts += 13; exact++; }
        else if (pts_match === 10) { pts += 10; winner++; }
        else if (pts_match === 5)  { pts += 5;  winner++; }
      });
      return { username: u.username, displayName: u.display_name, pts, exact, ok: exact + winner, total };
    }).filter(s => s.total > 0);
    standings.sort((a,b) => b.pts - a.pts || b.exact - a.exact);
    res.json(standings);
  } catch (e) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

module.exports = router;
module.exports.updateR16Bracket = updateR16Bracket;