// ============================================================
//  import-matches.js — openfootball (sin API key)
//  USO:
//    node import-matches.js         ← importa fixtures
//    node import-matches.js --sync  ← actualiza resultados
// ============================================================

require('dotenv').config();
const { Pool } = require('pg');

const JSON_URL = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// ── Traducciones ───────────────────────────────────────────
const NAMES_ES = {
  'Mexico':'México','South Korea':'Corea del Sur','Czech Republic':'Rep. Checa',
  'Switzerland':'Suiza','Morocco':'Marruecos','Haiti':'Haití','Scotland':'Escocia',
  'USA':'Estados Unidos','Paraguay':'Paraguay','Turkey':'Turquía',
  'Germany':'Alemania',"Ivory Coast":'Costa de Marfil',"Cote d'Ivoire":'Costa de Marfil',
  'Curaçao':'Curazao','Netherlands':'Países Bajos','Japan':'Japón',
  'Tunisia':'Túnez','Sweden':'Suecia','Belgium':'Bélgica','New Zealand':'Nueva Zelanda',
  'Egypt':'Egipto','Iran':'Irán','Spain':'España','Cape Verde':'Cabo Verde',
  'Saudi Arabia':'Arabia Saudí','France':'Francia','Norway':'Noruega',
  'Algeria':'Argelia','Austria':'Austria','Jordan':'Jordania',
  'Portugal':'Portugal','DR Congo':'Rep. D. Congo','Uzbekistan':'Uzbekistán',
  'Colombia':'Colombia','England':'Inglaterra','Croatia':'Croacia',
  'Ghana':'Ghana','Panama':'Panamá','Bosnia':'Bosnia','Qatar':'Qatar',
  'Canada':'Canadá','Brazil':'Brasil','South Africa':'Sudáfrica',
  'Ecuador':'Ecuador','Iraq':'Irak','Argentina':'Argentina',
  'Uruguay':'Uruguay','Senegal':'Senegal','Australia':'Australia',
};

const FLAGS = {
  'Mexico':'🇲🇽','South Africa':'🇿🇦','South Korea':'🇰🇷','Czech Republic':'🇨🇿',
  'Canada':'🇨🇦','Bosnia':'🇧🇦','Qatar':'🇶🇦','Switzerland':'🇨🇭',
  'Brazil':'🇧🇷','Morocco':'🇲🇦','Haiti':'🇭🇹','Scotland':'🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'USA':'🇺🇸','Paraguay':'🇵🇾','Australia':'🇦🇺','Turkey':'🇹🇷',
  'Germany':'🇩🇪',"Ivory Coast":'🇨🇮',"Cote d'Ivoire":'🇨🇮','Curaçao':'🇨🇼',
  'Netherlands':'🇳🇱','Japan':'🇯🇵','Tunisia':'🇹🇳','Sweden':'🇸🇪',
  'Belgium':'🇧🇪','New Zealand':'🇳🇿','Egypt':'🇪🇬','Iran':'🇮🇷',
  'Spain':'🇪🇸','Cape Verde':'🇨🇻','Uruguay':'🇺🇾','Saudi Arabia':'🇸🇦',
  'France':'🇫🇷','Senegal':'🇸🇳','Iraq':'🇮🇶','Norway':'🇳🇴',
  'Argentina':'🇦🇷','Algeria':'🇩🇿','Austria':'🇦🇹','Jordan':'🇯🇴',
  'Portugal':'🇵🇹','DR Congo':'🇨🇩','Uzbekistan':'🇺🇿','Colombia':'🇨🇴',
  'England':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','Croatia':'🇭🇷','Ghana':'🇬🇭','Panama':'🇵🇦',
  'Ecuador':'🇪🇨',
};

const nameEs  = n => NAMES_ES[n] || n;
const getFlag = n => FLAGS[n]    || '🏳️';

// ── Formatear fecha ────────────────────────────────────────
function formatDate(dateStr) {
  const d    = new Date(dateStr + 'T12:00:00Z');
  const dias  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${dias[d.getUTCDay()]} ${d.getUTCDate()} ${meses[d.getUTCMonth()]}`;
}

// ── Extraer hora limpia ────────────────────────────────────
function formatTime(timeStr) {
  // viene como "13:00 UTC-6" → sacamos solo "13:00"
  return (timeStr || '').split(' ')[0] || '';
}

// ── Extraer grupo ──────────────────────────────────────────
function extractGroup(groupStr) {
  // viene como "Group A" → "A"
  const m = (groupStr || '').match(/Group\s+([A-L])/i);
  return m ? m[1].toUpperCase() : '?';
}

// ── Extraer jornada ────────────────────────────────────────
function extractJornada(roundStr) {
  // viene como "Matchday 1" → "1"
  const m = (roundStr || '').match(/(\d+)/);
  return m ? m[1] : '?';
}

// ── IMPORTAR ───────────────────────────────────────────────
async function importFixtures() {
  console.log('📡 Bajando fixtures de openfootball...');

  const res  = await fetch(JSON_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  // Solo fase de grupos (tienen campo "group")
  const groupMatches = data.matches.filter(m => m.group);
  console.log(`   ${groupMatches.length} partidos de fase de grupos encontrados`);

  // Limpiar tablas (primero predicciones por FK)
  await pool.query('DELETE FROM prode_predictions');
  await pool.query('DELETE FROM prode_matches');
  console.log('   Tablas limpiadas');

  let id = 1;
  for (const m of groupMatches) {
    const group    = extractGroup(m.group);
    const jornada  = extractJornada(m.round);
    const homeName = nameEs(m.team1);
    const awayName = nameEs(m.team2);
    const date     = formatDate(m.date);
    const time     = formatTime(m.time);
    const venue    = m.ground || 'Por confirmar';
    const round    = `Grupo ${group} · Jornada ${jornada}`;

    // Resultado si ya existe en el JSON
    let homeScore = null, awayScore = null;
    if (m.score && m.score.ft) {
      homeScore = m.score.ft[0];
      awayScore = m.score.ft[1];
    }

    await pool.query(`
      INSERT INTO prode_matches
        (id, home, away, home_flag, away_flag, match_date, time, venue, group_name, home_score, away_score)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (id) DO UPDATE SET
        home       = EXCLUDED.home,
        away       = EXCLUDED.away,
        home_flag  = EXCLUDED.home_flag,
        away_flag  = EXCLUDED.away_flag,
        match_date = EXCLUDED.match_date,
        time       = EXCLUDED.time,
        venue      = EXCLUDED.venue,
        group_name = EXCLUDED.group_name,
        home_score = EXCLUDED.home_score,
        away_score = EXCLUDED.away_score
    `, [id, homeName, awayName, getFlag(m.team1), getFlag(m.team2),
        date, time, venue, round, homeScore, awayScore]);
    id++;
  }

  console.log(`✅ ${id - 1} partidos importados correctamente`);
  await pool.end();
}

// ── SYNC RESULTADOS ────────────────────────────────────────
async function syncResults() {
  console.log('🔄 Sincronizando resultados desde openfootball...');

  const res  = await fetch(JSON_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  let updated = 0;
  let id = 1;
  for (const m of data.matches.filter(x => x.group)) {
    if (m.score && m.score.ft) {
      const [gH, gA] = m.score.ft;
      await pool.query(
        'UPDATE prode_matches SET home_score=$1, away_score=$2 WHERE id=$3',
        [gH, gA, id]
      );
      updated++;
    }
    id++;
  }

  console.log(`✅ ${updated} resultados actualizados`);
  await pool.end();
}

// ── MAIN ───────────────────────────────────────────────────
const mode = process.argv[2];
if (mode === '--sync') {
  syncResults().catch(e => { console.error('❌', e.message); process.exit(1); });
} else {
  importFixtures().catch(e => { console.error('❌', e.message); process.exit(1); });
}
