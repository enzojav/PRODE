const router = require('express').Router();
const db     = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { createMatchNews } = require('./news');

// ─── Helpers de puntos ────────────────────────────────────────
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

const MONTH_MAP = { Ene:0,Feb:1,Mar:2,Abr:3,May:4,Jun:5,Jul:6,Ago:7,Sep:8,Oct:9,Nov:10,Dic:11 };

// ─── PARTIDOS ─────────────────────────────────────────────────
router.get('/matches', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM prode_matches ORDER BY id');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
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
    // Intentar actualizar bracket automáticamente
    updateR16Bracket().catch(e => console.error('Error actualizando bracket:', e.message));
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

router.delete('/matches/:id/result', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      'UPDATE prode_matches SET home_score=NULL, away_score=NULL WHERE id=$1 RETURNING *',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Partido no encontrado.' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

router.get('/matches/r16', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM prode_matches WHERE phase='R16' ORDER BY id");
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

// ─── BRACKET AUTOMÁTICO ───────────────────────────────────────
// Mapeo de los 16avos: qué slot corresponde a qué posición de grupo
// Formato: { matchId: { home: 'posicion', away: 'posicion' } }
const R16_MAP = {
  200: { home: '1E',  away: '3ABCDF' },
  201: { home: '1I',  away: '3CDFGH' },
  202: { home: '2A',  away: '2B'     },
  203: { home: '1F',  away: '2C'     },
  204: { home: '2K',  away: '2L'     },
  205: { home: '1H',  away: '2J'     },
  206: { home: '1D',  away: '3BEFIJ' },
  207: { home: '1G',  away: '3AEHIJ' },
  208: { home: '1C',  away: '2F'     },
  209: { home: '2E',  away: '2I'     },
  210: { home: '1A',  away: '3CEFHI' },
  211: { home: '1L',  away: '3EHIJK' },
  212: { home: '1J',  away: '2H'     },
  213: { home: '2D',  away: '2G'     },
  214: { home: '1B',  away: '3EFGIJ' },
  215: { home: '1K',  away: '3DEIJL' },
};

async function calcGroupStandings() {
  const { rows: matches } = await db.query(
    "SELECT * FROM prode_matches WHERE phase != 'R16' AND home_score IS NOT NULL"
  );

  const teams = {}; // { 'México': { pts, gf, ga, gd, group, flag } }

  for (const m of matches) {
    const grp = (m.group_name || '').split('·')[0].trim(); // "Grupo A"
    const grpLetter = grp.replace('Grupo ', '').trim(); // "A"

    const hS = Number(m.home_score), aS = Number(m.away_score);

    if (!teams[m.home]) teams[m.home] = { pts:0, gf:0, ga:0, group: grpLetter, flag: m.home_flag || '🏳️' };
    if (!teams[m.away]) teams[m.away] = { pts:0, gf:0, ga:0, group: grpLetter, flag: m.away_flag || '🏳️' };

    teams[m.home].gf += hS; teams[m.home].ga += aS;
    teams[m.away].gf += aS; teams[m.away].ga += hS;

    if (hS > aS) { teams[m.home].pts += 3; }
    else if (hS < aS) { teams[m.away].pts += 3; }
    else { teams[m.home].pts += 1; teams[m.away].pts += 1; }
  }

  // Agrupar por grupo
  const groups = {};
  for (const [name, data] of Object.entries(teams)) {
    if (!groups[data.group]) groups[data.group] = [];
    groups[data.group].push({ name, ...data, gd: data.gf - data.ga });
  }

  // Ordenar dentro de cada grupo
  for (const g of Object.keys(groups)) {
    groups[g].sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  }

  return groups;
}

async function updateR16Bracket() {
  const groups = await calcGroupStandings();

  // Verificar que todos los grupos tengan todos sus partidos jugados
  // Solo actualizamos si el grupo tiene resultados
  const resolved = {}; // { '1A': { name, flag }, '2B': ... }

  for (const [grpLetter, standing] of Object.entries(groups)) {
    if (standing.length >= 1) resolved[`1${grpLetter}`] = standing[0];
    if (standing.length >= 2) resolved[`2${grpLetter}`] = standing[1];
    if (standing.length >= 3) resolved[`3${grpLetter}`] = standing[2];
  }

  // Mejores terceros — ordenados por pts, gd, gf
  const allThirds = Object.entries(groups)
    .filter(([, s]) => s.length >= 3)
    .map(([grp, s]) => ({ ...s[2], group: grp }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

  // Asignar mejores terceros a los slots que los necesitan
  // Los slots con "3ABCDF" necesitan el mejor 3ro de esos grupos
  function getBestThird(groupsStr) {
    const letters = groupsStr.replace('3','').split('');
    const candidates = allThirds.filter(t => letters.includes(t.group));
    return candidates[0] || null;
  }

  // Actualizar cada partido R16
  for (const [matchIdStr, slots] of Object.entries(R16_MAP)) {
    const matchId = parseInt(matchIdStr);

    let homeTeam = null, awayTeam = null;

    // Resolver home
    if (slots.home.startsWith('3')) {
      homeTeam = getBestThird(slots.home);
    } else {
      homeTeam = resolved[slots.home] || null;
    }

    // Resolver away
    if (slots.away.startsWith('3')) {
      awayTeam = getBestThird(slots.away);
    } else {
      awayTeam = resolved[slots.away] || null;
    }

    if (!homeTeam && !awayTeam) continue;

    const updates = [];
    const vals = [];
    let i = 1;

    if (homeTeam) {
      updates.push(`home=$${i++}, home_flag=$${i++}`);
      vals.push(homeTeam.name, homeTeam.flag);
    }
    if (awayTeam) {
      updates.push(`away=$${i++}, away_flag=$${i++}`);
      vals.push(awayTeam.name, awayTeam.flag);
    }

    vals.push(matchId);
    await db.query(
      `UPDATE prode_matches SET ${updates.join(', ')} WHERE id=$${i}`,
      vals
    );
  }

  console.log('✅ Bracket R16 actualizado');
}

// Endpoint manual para forzar actualización del bracket (admin)
router.post('/bracket/update', requireAuth, requireAdmin, async (req, res) => {
  try {
    await updateR16Bracket();
    res.json({ ok: true, message: 'Bracket actualizado correctamente.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ─── PREDICCIONES ─────────────────────────────────────────────
router.get('/predictions', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM prode_predictions WHERE username = $1',
      [req.user.username]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
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

    const exists = await db.query(
      'SELECT id FROM prode_predictions WHERE username = $1 AND match_id = $2',
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

// ─── STANDINGS ────────────────────────────────────────────────
router.get('/standings', requireAuth, async (req, res) => {
  try {
    const matches = await db.query('SELECT * FROM prode_matches WHERE home_score IS NOT NULL');
    const preds   = await db.query('SELECT * FROM prode_predictions');
    const users   = await db.query("SELECT username, display_name FROM users WHERE status = 'active' AND role != 'admin'");

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
      return { username: u.username, displayName: u.display_name, pts, exact, ok: exact + winner, total };
    }).filter(s => s.total > 0);

    standings.sort((a,b) => b.pts - a.pts || b.exact - a.exact);
    res.json(standings);
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;