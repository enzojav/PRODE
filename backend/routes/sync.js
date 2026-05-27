// ============================================================
//  routes/sync.js
//  Endpoint para sincronizar resultados desde API-Football.
//  Solo accesible por admin o desde el propio servidor (cron).
// ============================================================

const express = require('express');
const db      = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { recalcStandings } = require('./prode');

const router   = express.Router();
const API_HOST = 'v3.football.api-sports.io';
const LEAGUE   = 1;
const SEASON   = 2026;

let lastSync = null; // para evitar spam

async function apiFetch(endpoint) {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error('API_FOOTBALL_KEY no configurada en .env');

  const res = await fetch(`https://${API_HOST}/${endpoint}`, {
    headers: {
      'x-rapidapi-key':  key,
      'x-rapidapi-host': API_HOST,
    },
  });
  if (!res.ok) throw new Error(`API-Football error ${res.status}`);
  const data = await res.json();
  if (data.errors && Object.keys(data.errors).length) {
    throw new Error(JSON.stringify(data.errors));
  }
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

      let result = gH > gA ? '1' : gH < gA ? '2' : 'x';

      const info = db.prepare(`
        UPDATE prode_matches
        SET goals_home = ?, goals_away = ?, result = ?
        WHERE id = ?
      `).run(gH, gA, result, f.fixture.id);

      if (info.changes) totalUpdated++;
    }
  }

  if (totalUpdated > 0) recalcStandings();
  lastSync = new Date().toISOString();
  return totalUpdated;
}

// POST /api/sync/results — solo admin
// Llamalo manualmente desde el panel o con un cron job externo
router.post('/results', requireAuth, requireAdmin, async (req, res) => {
  // Limitar a 1 sync por minuto para no desperdiciar requests de la API
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

// GET /api/sync/status — ver última sincronización
router.get('/status', requireAuth, requireAdmin, (req, res) => {
  const totalMatches  = db.prepare("SELECT COUNT(*) as c FROM prode_matches").get().c;
  const withResult    = db.prepare("SELECT COUNT(*) as c FROM prode_matches WHERE result != ''").get().c;
  res.json({ lastSync, totalMatches, withResult });
});

module.exports = router;
