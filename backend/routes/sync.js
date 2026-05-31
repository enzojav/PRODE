// ============================================================
//  routes/sync.js
// ============================================================

const express = require('express');
const db      = require('../config/db');
  const { requireAuth, requireAdmin } = require('../middleware/auth');

const router   = express.Router();
const API_HOST = 'v3.football.api-sports.io';
const LEAGUE   = 1;
const SEASON   = 2026;

let lastSync = null;

// Mapa de nombres en inglés (API) → español (base de datos)
const TEAM_MAP = {
  'Argentina':              'Argentina',
  'Algeria':                'Argelia',
  'Austria':                'Austria',
  'Jordan':                 'Jordania',
  'Portugal':               'Portugal',
  'Uzbekistan':             'Uzbekistán',
  'Colombia':               'Colombia',
  'DR Congo':               'Rep. D. Congo',
  'Morocco':                'Marruecos',
  'Brazil':                 'Brasil',
  'France':                 'Francia',
  'Germany':                'Alemania',
  'Spain':                  'España',
  'England':                'Inglaterra',
  'Netherlands':            'Países Bajos',
  'Belgium':                'Bélgica',
  'Croatia':                'Croacia',
  'Serbia':                 'Serbia',
  'Denmark':                'Dinamarca',
  'Switzerland':            'Suiza',
  'Poland':                 'Polonia',
  'Japan':                  'Japón',
  'South Korea':            'Corea del Sur',
  'Australia':              'Australia',
  'Mexico':                 'México',
  'United States':          'Estados Unidos',
  'Canada':                 'Canadá',
  'Ecuador':                'Ecuador',
  'Uruguay':                'Uruguay',
  'Chile':                  'Chile',
  'Paraguay':               'Paraguay',
  'Venezuela':              'Venezuela',
  'Bolivia':                'Bolivia',
  'Peru':                   'Perú',
  'Costa Rica':             'Costa Rica',
  'Honduras':               'Honduras',
  'Panama':                 'Panamá',
  'Jamaica':                'Jamaica',
  'Senegal':                'Senegal',
  'Cameroon':               'Camerún',
  'Ghana':                  'Ghana',
  'Nigeria':                'Nigeria',
  'Egypt':                  'Egipto',
  'Tunisia':                'Túnez',
  'South Africa':           'Sudáfrica',
  'Ivory Coast':            "Costa de Marfil",
  'Mali':                   'Mali',
  'Saudi Arabia':           'Arabia Saudita',
  'Iran':                   'Irán',
  'Qatar':                  'Qatar',
  'Iraq':                   'Irak',
  'Turkey':                 'Turquía',
  'Ukraine':                'Ucrania',
  'Czech Republic':         'República Checa',
  'Slovakia':               'Eslovaquia',
  'Slovenia':               'Eslovenia',
  'Hungary':                'Hungría',
  'Romania':                'Rumanía',
  'Scotland':               'Escocia',
  'Wales':                  'Gales',
  'New Zealand':            'Nueva Zelanda',
  'Indonesia':              'Indonesia',
  'Thailand':               'Tailandia',
  'China':                  'China',
};

function translateTeam(nameEn) {
  return TEAM_MAP[nameEn] || nameEn;
}

async function apiFetch(endpoint) {
  const key = process.env.FOOTBALL_API_KEY;
  if (!key) throw new Error('FOOTBALL_API_KEY no configurada en .env');

  const res = await fetch(`https://${API_HOST}/${endpoint}`, {
    headers: { 'x-apisports-key': key },
  });
  if (!res.ok) throw new Error(`API-Sports error ${res.status}`);
  const data = await res.json();
  if (data.errors && Object.keys(data.errors).length)
    throw new Error(JSON.stringify(data.errors));
  return data.response;
}

async function doSync() {
  const today     = new Date().toISOString().substring(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().substring(0, 10);

  let totalUpdated = 0;

  for (const dateStr of [yesterday, today]) {
    const fixtures = await apiFetch(
      `fixtures?league=${LEAGUE}&season=${SEASON}&date=${dateStr}`
    );

    for (const f of fixtures) {
      const gH = f.goals.home;
      const gA = f.goals.away;
      if (gH === null || gA === null) continue;

      const result   = gH > gA ? '1' : gH < gA ? '2' : 'x';
      const homeTeam = translateTeam(f.teams.home.name);
      const awayTeam = translateTeam(f.teams.away.name);

      const { rowCount } = await db.query(
        `UPDATE prode_matches
         SET goals_home = $1, goals_away = $2, result = $3
         WHERE home_team ILIKE $4 AND away_team ILIKE $5`,
        [gH, gA, result, homeTeam, awayTeam]
      );

      if (rowCount) totalUpdated++;
    }
  }

  if (totalUpdated > 0) await recalcAllPoints();

  lastSync = new Date().toISOString();
  return totalUpdated;
}

async function recalcAllPoints() {
  const { rows: matches } = await db.query(
    `SELECT id, goals_home, goals_away, result FROM prode_matches WHERE result != '' AND result IS NOT NULL`
  );

  for (const match of matches) {
    const { rows: preds } = await db.query(
      `SELECT * FROM prode_predictions WHERE match_id = $1`,
      [match.id]
    );

    for (const pred of preds) {
      let pts = 0;
      if (pred.predicted_result === match.result) {
        pts = 5;
        if (Number(pred.predicted_home) === Number(match.goals_home) &&
            Number(pred.predicted_away) === Number(match.goals_away)) {
          pts = 10;
        }
      }
      await db.query(
        `UPDATE prode_predictions SET points = $1 WHERE id = $2`,
        [pts, pred.id]
      );
    }
  }
}

// POST /api/sync/results — solo admin
router.post('/results', requireAuth, requireAdmin, async (req, res) => {
  if (lastSync) {
    const secsAgo = (Date.now() - new Date(lastSync).getTime()) / 1000;
    if (secsAgo < 60) {
      return res.status(429).json({
        error: `Esperá ${Math.ceil(60 - secsAgo)}s antes de volver a sincronizar.`,
        lastSync,
      });
    }
  }

  try {
    const updated = await doSync();
    res.json({ ok: true, updated, lastSync });
  } catch (e) {
    console.error('❌ Sync error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/sync/status
router.get('/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows: r1 } = await db.query(`SELECT COUNT(*) as c FROM prode_matches`);
    const { rows: r2 } = await db.query(`SELECT COUNT(*) as c FROM prode_matches WHERE result != '' AND result IS NOT NULL`);
    res.json({ lastSync, totalMatches: parseInt(r1[0].c), withResult: parseInt(r2[0].c) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


//SI FUNCA SACAR


// POST /api/sync/test — simular resultados (solo dev/admin)
router.post('/test', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Traer los primeros 3 partidos sin resultado
    const { rows: matches } = await db.query(
      `SELECT id FROM prode_matches WHERE result IS NULL OR result = '' LIMIT 3`
    );

    if (matches.length === 0)
      return res.json({ ok: true, message: 'No hay partidos sin resultado.' });

    for (const match of matches) {
      const gH = Math.floor(Math.random() * 4);
      const gA = Math.floor(Math.random() * 4);
      const result = gH > gA ? '1' : gH < gA ? '2' : 'x';

      await db.query(
        `UPDATE prode_matches SET goals_home = $1, goals_away = $2, result = $3 WHERE id = $4`,
        [gH, gA, result, match.id]
      );
    }

    await recalcAllPoints();
    res.json({ ok: true, updated: matches.length, message: `${matches.length} partidos simulados.` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


//SI FUNCA SACAR

module.exports = router;
