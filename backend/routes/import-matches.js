// ============================================================
//  import-matches.js
//  Importa/sincroniza los partidos del Mundial 2026 desde
//  API-Football a la base de datos SQLite local.
//
//  USO:
//    node import-matches.js              ← importa fixtures
//    node import-matches.js --results    ← actualiza resultados
// ============================================================

require('dotenv').config();
const Database = require('better-sqlite3');
const path     = require('path');

const API_KEY  = process.env.API_FOOTBALL_KEY;
const API_HOST = 'v3.football.api-sports.io';
const LEAGUE   = 1;      // FIFA World Cup
const SEASON   = 2026;

const DB_PATH  = path.join(__dirname, 'data', 'app.db');
const db       = new Database(DB_PATH);

if (!API_KEY) {
  console.error('❌ Definí API_FOOTBALL_KEY en tu .env');
  process.exit(1);
}

// ── Banderas por nombre de equipo ──────────────────────────
const FLAGS = {
  'Mexico':           '🇲🇽', 'South Africa':     '🇿🇦', 'South Korea':      '🇰🇷',
  'Czech Republic':   '🇨🇿', 'Canada':           '🇨🇦', 'Bosnia':           '🇧🇦',
  'Qatar':            '🇶🇦', 'Switzerland':      '🇨🇭', 'Brazil':           '🇧🇷',
  'Morocco':          '🇲🇦', 'Haiti':            '🇭🇹', 'Scotland':         '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'USA':              '🇺🇸', 'United States':    '🇺🇸', 'Paraguay':         '🇵🇾',
  'Australia':        '🇦🇺', 'Turkey':           '🇹🇷', 'Germany':          '🇩🇪',
  "Ivory Coast":      '🇨🇮', "Cote d'Ivoire":    '🇨🇮', 'Ecuador':          '🇪🇨',
  'Curacao':          '🏳️',  'Netherlands':      '🇳🇱', 'Japan':            '🇯🇵',
  'Tunisia':          '🇹🇳', 'Sweden':           '🇸🇪', 'Belgium':          '🇧🇪',
  'New Zealand':      '🇳🇿', 'Egypt':            '🇪🇬', 'Iran':             '🇮🇷',
  'Spain':            '🇪🇸', 'Cape Verde':       '🇨🇻', 'Uruguay':          '🇺🇾',
  'Saudi Arabia':     '🇸🇦', 'France':           '🇫🇷', 'Senegal':          '🇸🇳',
  'Iraq':             '🇮🇶', 'Norway':           '🇳🇴', 'Argentina':        '🇦🇷',
  'Algeria':          '🇩🇿', 'Austria':          '🇦🇹', 'Jordan':           '🇯🇴',
  'Portugal':         '🇵🇹', 'DR Congo':         '🇨🇩', 'Uzbekistan':       '🇺🇿',
  'Colombia':         '🇨🇴', 'England':          '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Croatia':          '🇭🇷',
  'Ghana':            '🇬🇭', 'Panama':           '🇵🇦',
};

function getFlag(name) {
  return FLAGS[name] || '🏳️';
}

// ── Nombres en español ─────────────────────────────────────
const NAMES_ES = {
  'Mexico':           'México',       'South Korea':      'Corea del Sur',
  'Czech Republic':   'Rep. Checa',   'Switzerland':      'Suiza',
  'Morocco':          'Marruecos',    'Haiti':            'Haití',
  'Scotland':         'Escocia',      'USA':              'Estados Unidos',
  'United States':    'Estados Unidos','Turkey':          'Turquía',
  'Germany':          'Alemania',     "Ivory Coast":      'Costa de Marfil',
  "Cote d'Ivoire":    'Costa de Marfil', 'Curacao':       'Curazao',
  'Netherlands':      'Países Bajos', 'Belgium':          'Bélgica',
  'New Zealand':      'Nueva Zelanda', 'Cape Verde':      'Cabo Verde',
  'Saudi Arabia':     'Arabia Saudí', 'France':           'Francia',
  'Norway':           'Noruega',      'Algeria':          'Argelia',
  'Jordan':           'Jordania',     'Portugal':         'Portugal',
  'DR Congo':         'Rep. D. Congo', 'Uzbekistan':      'Uzbekistán',
  'England':          'Inglaterra',   'Croatia':          'Croacia',
  'Panama':           'Panamá',       'Bosnia':           'Bosnia',
};

function nameEs(name) {
  return NAMES_ES[name] || name;
}

// ── Formatear fecha para display ───────────────────────────
function formatDate(dateStr) {
  // dateStr viene como "2026-06-11"
  const d = new Date(dateStr + 'T12:00:00Z');
  const dias  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${dias[d.getUTCDay()]} ${d.getUTCDate()} ${meses[d.getUTCMonth()]}`;
}

// ── Formatear hora (UTC a hora local del partido, viene en UTC) ──
function formatTime(timestamp) {
  // La API devuelve Unix timestamp; mostramos hora UTC-6 (hora México/Centro)
  // Ajustá el offset si querés otro huso horario
  const d = new Date(timestamp * 1000);
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// ── Llamada a la API ───────────────────────────────────────
async function apiFetch(endpoint) {
  const url = `https://${API_HOST}/${endpoint}`;
  const res = await fetch(url, {
    headers: {
      'x-rapidapi-key':  API_KEY,
      'x-rapidapi-host': API_HOST,
    },
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (data.errors && Object.keys(data.errors).length) {
    throw new Error('API errors: ' + JSON.stringify(data.errors));
  }
  return data.response;
}

// ── IMPORTAR FIXTURES ─────────────────────────────────────
async function importFixtures() {
  console.log('📡 Obteniendo fixtures del Mundial 2026...');
  const fixtures = await apiFetch(`fixtures?league=${LEAGUE}&season=${SEASON}`);
  console.log(`   ${fixtures.length} partidos recibidos`);

  // Solo fase de grupos (las primeras 3 jornadas)
  const groupStage = fixtures.filter(f =>
    f.league.round && f.league.round.toLowerCase().includes('group')
  );
  console.log(`   ${groupStage.length} partidos de fase de grupos`);

  const insert = db.prepare(`
    INSERT INTO prode_matches
      (id, match_group, round, date, time, venue, home_name, home_flag, away_name, away_flag, result, goals_home, goals_away)
    VALUES
      (@id, @match_group, @round, @date, @time, @venue, @home_name, @home_flag, @away_name, @away_flag, '', NULL, NULL)
    ON CONFLICT(id) DO UPDATE SET
      match_group = excluded.match_group,
      round       = excluded.round,
      date        = excluded.date,
      time        = excluded.time,
      venue       = excluded.venue,
      home_name   = excluded.home_name,
      home_flag   = excluded.home_flag,
      away_name   = excluded.away_name,
      away_flag   = excluded.away_flag
  `);

  const runAll = db.transaction((matches) => {
    let inserted = 0, updated = 0;
    for (const f of matches) {
      const homeName = nameEs(f.teams.home.name);
      const awayName = nameEs(f.teams.away.name);

      // Extraer grupo de la ronda: "Group Stage - 1" → "A", etc.
      // La API devuelve el grupo en f.league.round o f.teams
      const groupRaw = f.league.round || '';
      const groupMatch = groupRaw.match(/Group\s+([A-L])/i);
      const group = groupMatch ? groupMatch[1].toUpperCase() : '?';

      // Jornada
      const rdMatch = groupRaw.match(/(\d)/);
      const jornada = rdMatch ? rdMatch[1] : '?';

      const row = {
        id:         f.fixture.id,
        match_group: group,
        round:      `Grupo ${group} · Jornada ${jornada}`,
        date:       formatDate(f.fixture.date.substring(0, 10)),
        time:       formatTime(f.fixture.timestamp),
        venue:      f.fixture.venue?.name || 'Por confirmar',
        home_name:  homeName,
        home_flag:  getFlag(f.teams.home.name),
        away_name:  awayName,
        away_flag:  getFlag(f.teams.away.name),
      };

      const info = insert.run(row);
      if (info.changes) inserted++;
      else updated++;
    }
    return { inserted, updated };
  });

  const { inserted, updated } = runAll(groupStage);
  console.log(`✅ Importados: ${inserted} nuevos, ${updated} actualizados`);
}

// ── SINCRONIZAR RESULTADOS ─────────────────────────────────
async function syncResults() {
  console.log('🔄 Sincronizando resultados...');

  // Traer solo partidos del día de hoy y ayer (para no gastar requests)
  const today     = new Date().toISOString().substring(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().substring(0, 10);

  for (const dateStr of [yesterday, today]) {
    let fixtures;
    try {
      fixtures = await apiFetch(`fixtures?league=${LEAGUE}&season=${SEASON}&date=${dateStr}`);
    } catch (e) {
      console.warn(`  ⚠ Error obteniendo ${dateStr}:`, e.message);
      continue;
    }

    let updated = 0;
    for (const f of fixtures) {
      const goals = f.goals;
      if (goals.home === null || goals.away === null) continue; // partido no jugado

      const gH = goals.home;
      const gA = goals.away;
      let result = '';
      if (gH > gA)      result = '1';
      else if (gH < gA) result = '2';
      else              result = 'x';

      const info = db.prepare(`
        UPDATE prode_matches
        SET goals_home = ?, goals_away = ?, result = ?
        WHERE id = ? AND (result = '' OR goals_home IS NULL)
      `).run(gH, gA, result, f.fixture.id);

      if (info.changes) updated++;
    }
    console.log(`   ${dateStr}: ${updated} resultados actualizados`);
  }

  // Recalcular standings después de actualizar resultados
  try {
    const { recalcStandings } = require('./routes/prode');
    recalcStandings();
    console.log('   Standings recalculados ✓');
  } catch {}

  console.log('✅ Sincronización completa');
}

// ── MAIN ───────────────────────────────────────────────────
const mode = process.argv[2];
if (mode === '--results') {
  syncResults().catch(e => { console.error('❌', e.message); process.exit(1); });
} else {
  importFixtures().catch(e => { console.error('❌', e.message); process.exit(1); });
}
