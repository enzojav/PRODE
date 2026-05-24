// ============================================================
//  import-matches.js
//  Corre UNA SOLA VEZ para importar los partidos del Mundial
//  Uso: node import-matches.js
// ============================================================
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const matches = [
  // ─── GRUPO A ───────────────────────────────────────────────
  { id:1,  group_name:"A", match_date:"Jue 11 Jun", time:"16:00", venue:"Estadio Azteca, CDMX",        home:"México",     home_flag:"🇲🇽", away:"Sudáfrica",  away_flag:"🇿🇦" },
  { id:2,  group_name:"A", match_date:"Jue 11 Jun", time:"23:00", venue:"Estadio Akron, Guadalajara",   home:"Corea del Sur", home_flag:"🇰🇷", away:"Rep. Checa", away_flag:"🇨🇿" },
  { id:3,  group_name:"A", match_date:"Mié 18 Jun", time:"20:00", venue:"Mercedes-Benz, Atlanta",       home:"México",     home_flag:"🇲🇽", away:"Corea del Sur", away_flag:"🇰🇷" },
  { id:4,  group_name:"A", match_date:"Mié 18 Jun", time:"22:00", venue:"Estadio Akron, Guadalajara",   home:"Sudáfrica",  away_flag:"🇨🇿", away:"Rep. Checa",  home_flag:"🇿🇦" },
  { id:5,  group_name:"A", match_date:"Mar 24 Jun", time:"20:00", venue:"Estadio Azteca, CDMX",         home:"México",     home_flag:"🇲🇽", away:"Rep. Checa",  away_flag:"🇨🇿" },
  { id:6,  group_name:"A", match_date:"Mar 24 Jun", time:"20:00", venue:"Estadio BBVA, Monterrey",      home:"Sudáfrica",  home_flag:"🇿🇦", away:"Corea del Sur", away_flag:"🇰🇷" },

  // ─── GRUPO B ───────────────────────────────────────────────
  { id:7,  group_name:"B", match_date:"Vie 12 Jun", time:"16:00", venue:"BMO Field, Toronto",           home:"Argentina",  home_flag:"🇦🇷", away:"Kazajistán", away_flag:"🇰🇿" },
  { id:8,  group_name:"B", match_date:"Sáb 13 Jun", time:"16:00", venue:"Levi's Stadium, San Francisco",home:"Nueva Zelanda", home_flag:"🇳🇿", away:"Ucrania",   away_flag:"🇺🇦" },
  { id:9,  group_name:"B", match_date:"Mié 18 Jun", time:"14:00", venue:"SoFi Stadium, Los Ángeles",    home:"Argentina",  home_flag:"🇦🇷", away:"Nueva Zelanda", away_flag:"🇳🇿" },
  { id:10, group_name:"B", match_date:"Mié 18 Jun", time:"17:00", venue:"BC Place, Vancouver",          home:"Kazajistán", home_flag:"🇰🇿", away:"Ucrania",    away_flag:"🇺🇦" },
  { id:11, group_name:"B", match_date:"Mié 24 Jun", time:"16:00", venue:"Levi's Stadium, San Francisco",home:"Argentina",  home_flag:"🇦🇷", away:"Ucrania",    away_flag:"🇺🇦" },
  { id:12, group_name:"B", match_date:"Mié 24 Jun", time:"16:00", venue:"Arrowhead, Kansas City",       home:"Kazajistán", home_flag:"🇰🇿", away:"Nueva Zelanda", away_flag:"🇳🇿" },

  // ─── GRUPO C ───────────────────────────────────────────────
  { id:13, group_name:"C", match_date:"Sáb 13 Jun", time:"19:00", venue:"MetLife Stadium, Nueva Jersey",home:"EE.UU.",     home_flag:"🇺🇸", away:"Panamá",     away_flag:"🇵🇦" },
  { id:14, group_name:"C", match_date:"Sáb 13 Jun", time:"22:00", venue:"Gillette Stadium, Boston",     home:"Uruguay",    home_flag:"🇺🇾", away:"Arabia Saudita", away_flag:"🇸🇦" },
  { id:15, group_name:"C", match_date:"Vie 19 Jun", time:"22:00", venue:"Hard Rock, Miami",              home:"EE.UU.",     home_flag:"🇺🇸", away:"Arabia Saudita", away_flag:"🇸🇦" },
  { id:16, group_name:"C", match_date:"Vie 19 Jun", time:"19:00", venue:"Lumen Field, Seattle",          home:"Panamá",     home_flag:"🇵🇦", away:"Uruguay",    away_flag:"🇺🇾" },
  { id:17, group_name:"C", match_date:"Jue 25 Jun", time:"20:00", venue:"MetLife Stadium, Nueva Jersey", home:"EE.UU.",     home_flag:"🇺🇸", away:"Uruguay",    away_flag:"🇺🇾" },
  { id:18, group_name:"C", match_date:"Jue 25 Jun", time:"20:00", venue:"Gillette Stadium, Boston",      home:"Arabia Saudita", home_flag:"🇸🇦", away:"Panamá", away_flag:"🇵🇦" },

  // ─── GRUPO D ───────────────────────────────────────────────
  { id:19, group_name:"D", match_date:"Vie 12 Jun", time:"22:00", venue:"SoFi Stadium, Los Ángeles",    home:"Francia",    home_flag:"🇫🇷", away:"Angola",     away_flag:"🇦🇴" },
  { id:20, group_name:"D", match_date:"Dom 14 Jun", time:"01:00", venue:"BC Place, Vancouver",           home:"Hungría",    home_flag:"🇭🇺", away:"Emiratos Árabes", away_flag:"🇦🇪" },
  { id:21, group_name:"D", match_date:"Vie 19 Jun", time:"16:00", venue:"AT&T Stadium, Dallas",          home:"Francia",    home_flag:"🇫🇷", away:"Hungría",    away_flag:"🇭🇺" },
  { id:22, group_name:"D", match_date:"Sáb 20 Jun", time:"01:00", venue:"Levi's Stadium, San Francisco", home:"Angola",     home_flag:"🇦🇴", away:"Emiratos Árabes", away_flag:"🇦🇪" },
  { id:23, group_name:"D", match_date:"Vie 26 Jun", time:"20:00", venue:"SoFi Stadium, Los Ángeles",    home:"Francia",    home_flag:"🇫🇷", away:"Emiratos Árabes", away_flag:"🇦🇪" },
  { id:24, group_name:"D", match_date:"Vie 26 Jun", time:"20:00", venue:"Lumen Field, Seattle",          home:"Angola",     home_flag:"🇦🇴", away:"Hungría",    away_flag:"🇭🇺" },

  // ─── GRUPO E ───────────────────────────────────────────────
  { id:25, group_name:"E", match_date:"Dom 14 Jun", time:"19:00", venue:"AT&T Stadium, Dallas",          home:"España",     home_flag:"🇪🇸", away:"Serbia",     away_flag:"🇷🇸" },
  { id:26, group_name:"E", match_date:"Sáb 14 Jun", time:"22:00", venue:"Arrowhead, Kansas City",        home:"Marruecos",  home_flag:"🇲🇦", away:"Dinamarca",  away_flag:"🇩🇰" },
  { id:27, group_name:"E", match_date:"Sáb 20 Jun", time:"17:00", venue:"AT&T Stadium, Dallas",          home:"España",     home_flag:"🇪🇸", away:"Marruecos",  away_flag:"🇲🇦" },
  { id:28, group_name:"E", match_date:"Sáb 20 Jun", time:"21:00", venue:"Lincoln Financial, Filadelfia", home:"Serbia",     home_flag:"🇷🇸", away:"Dinamarca",  away_flag:"🇩🇰" },
  { id:29, group_name:"E", match_date:"Vie 26 Jun", time:"20:00", venue:"Arrowhead, Kansas City",         home:"España",     home_flag:"🇪🇸", away:"Dinamarca",  away_flag:"🇩🇰" },
  { id:30, group_name:"E", match_date:"Vie 26 Jun", time:"20:00", venue:"AT&T Stadium, Dallas",           home:"Marruecos",  home_flag:"🇲🇦", away:"Serbia",     away_flag:"🇷🇸" },

  // ─── GRUPO F ───────────────────────────────────────────────
  { id:31, group_name:"F", match_date:"Dom 14 Jun", time:"16:00", venue:"Lincoln Financial, Filadelfia", home:"Brasil",     home_flag:"🇧🇷", away:"Egipto",     away_flag:"🇪🇬" },
  { id:32, group_name:"F", match_date:"Dom 15 Jun", time:"01:00", venue:"Lumen Field, Seattle",           home:"Croacia",    home_flag:"🇭🇷", away:"Senegal",    away_flag:"🇸🇳" },
  { id:33, group_name:"F", match_date:"Sáb 20 Jun", time:"14:00", venue:"Lincoln Financial, Filadelfia", home:"Brasil",     home_flag:"🇧🇷", away:"Croacia",    away_flag:"🇭🇷" },
  { id:34, group_name:"F", match_date:"Dom 21 Jun", time:"01:00", venue:"Lumen Field, Seattle",           home:"Egipto",     home_flag:"🇪🇬", away:"Senegal",    away_flag:"🇸🇳" },
  { id:35, group_name:"F", match_date:"Sáb 27 Jun", time:"20:00", venue:"Gillette Stadium, Boston",       home:"Brasil",     home_flag:"🇧🇷", away:"Senegal",    away_flag:"🇸🇳" },
  { id:36, group_name:"F", match_date:"Sáb 27 Jun", time:"20:00", venue:"Lincoln Financial, Filadelfia", home:"Croacia",    home_flag:"🇭🇷", away:"Egipto",     away_flag:"🇪🇬" },

  // ─── GRUPO G ───────────────────────────────────────────────
  { id:37, group_name:"G", match_date:"Lun 15 Jun", time:"19:00", venue:"Hard Rock, Miami",              home:"Portugal",   home_flag:"🇵🇹", away:"Venezuela",  away_flag:"🇻🇪" },
  { id:38, group_name:"G", match_date:"Dom 15 Jun", time:"22:00", venue:"SoFi Stadium, Los Ángeles",     home:"Alemania",   home_flag:"🇩🇪", away:"Rep. Dominicana", away_flag:"🇩🇴" },
  { id:39, group_name:"G", match_date:"Dom 21 Jun", time:"16:00", venue:"Hard Rock, Miami",              home:"Portugal",   home_flag:"🇵🇹", away:"Alemania",   away_flag:"🇩🇪" },
  { id:40, group_name:"G", match_date:"Dom 21 Jun", time:"19:00", venue:"SoFi Stadium, Los Ángeles",     home:"Venezuela",  home_flag:"🇻🇪", away:"Rep. Dominicana", away_flag:"🇩🇴" },
  { id:41, group_name:"G", match_date:"Sáb 27 Jun", time:"20:00", venue:"Hard Rock, Miami",              home:"Portugal",   home_flag:"🇵🇹", away:"Rep. Dominicana", away_flag:"🇩🇴" },
  { id:42, group_name:"G", match_date:"Sáb 27 Jun", time:"20:00", venue:"Lumen Field, Seattle",          home:"Alemania",   home_flag:"🇩🇪", away:"Venezuela",  away_flag:"🇻🇪" },

  // ─── GRUPO H ───────────────────────────────────────────────
  { id:43, group_name:"H", match_date:"Lun 15 Jun", time:"13:00", venue:"Mercedes-Benz, Atlanta",        home:"Países Bajos", home_flag:"🇳🇱", away:"Turquía",  away_flag:"🇹🇷" },
  { id:44, group_name:"H", match_date:"Lun 15 Jun", time:"22:00", venue:"Arrowhead, Kansas City",         home:"Australia",  home_flag:"🇦🇺", away:"Malí",      away_flag:"🇲🇱" },
  { id:45, group_name:"H", match_date:"Dom 21 Jun", time:"13:00", venue:"Mercedes-Benz, Atlanta",         home:"Países Bajos", home_flag:"🇳🇱", away:"Australia", away_flag:"🇦🇺" },
  { id:46, group_name:"H", match_date:"Dom 21 Jun", time:"22:00", venue:"Arrowhead, Kansas City",          home:"Turquía",    home_flag:"🇹🇷", away:"Malí",      away_flag:"🇲🇱" },
  { id:47, group_name:"H", match_date:"Sáb 27 Jun", time:"20:00", venue:"Estadio Akron, Guadalajara",     home:"Países Bajos", home_flag:"🇳🇱", away:"Malí",    away_flag:"🇲🇱" },
  { id:48, group_name:"H", match_date:"Sáb 27 Jun", time:"20:00", venue:"Mercedes-Benz, Atlanta",         home:"Australia",  home_flag:"🇦🇺", away:"Turquía",   away_flag:"🇹🇷" },

  // ─── GRUPO I ───────────────────────────────────────────────
  { id:49, group_name:"I", match_date:"Mar 16 Jun", time:"16:00", venue:"MetLife Stadium, Nueva Jersey",  home:"Colombia",   home_flag:"🇨🇴", away:"Eslovaquia", away_flag:"🇸🇰" },
  { id:50, group_name:"I", match_date:"Mar 16 Jun", time:"19:00", venue:"Arrowhead, Kansas City",          home:"Ecuador",    home_flag:"🇪🇨", away:"Austria",    away_flag:"🇦🇹" },
  { id:51, group_name:"I", match_date:"Lun 22 Jun", time:"18:00", venue:"MetLife Stadium, Nueva Jersey",   home:"Colombia",   home_flag:"🇨🇴", away:"Ecuador",    away_flag:"🇪🇨" },
  { id:52, group_name:"I", match_date:"Lun 22 Jun", time:"21:00", venue:"Hard Rock, Miami",                home:"Eslovaquia", home_flag:"🇸🇰", away:"Austria",    away_flag:"🇦🇹" },
  { id:53, group_name:"I", match_date:"Dom 27 Jun", time:"20:00", venue:"MetLife Stadium, Nueva Jersey",   home:"Colombia",   home_flag:"🇨🇴", away:"Austria",    away_flag:"🇦🇹" },
  { id:54, group_name:"I", match_date:"Dom 27 Jun", time:"20:00", venue:"AT&T Stadium, Dallas",            home:"Ecuador",    home_flag:"🇪🇨", away:"Eslovaquia", away_flag:"🇸🇰" },

  // ─── GRUPO J ───────────────────────────────────────────────
  { id:55, group_name:"J", match_date:"Mar 16 Jun", time:"22:00", venue:"Arrowhead, Kansas City",          home:"Bélgica",    home_flag:"🇧🇪", away:"Rumania",    away_flag:"🇷🇴" },
  { id:56, group_name:"J", match_date:"Mar 16 Jun", time:"01:00", venue:"Lumen Field, Seattle",            home:"México",     home_flag:"🇲🇽", away:"Perú",       away_flag:"🇵🇪" },
  { id:57, group_name:"J", match_date:"Lun 22 Jun", time:"14:00", venue:"AT&T Stadium, Dallas",            home:"Bélgica",    home_flag:"🇧🇪", away:"México",     away_flag:"🇲🇽" },
  { id:58, group_name:"J", match_date:"Lun 22 Jun", time:"00:00", venue:"Lumen Field, Seattle",            home:"Rumania",    home_flag:"🇷🇴", away:"Perú",       away_flag:"🇵🇪" },
  { id:59, group_name:"J", match_date:"Sáb 27 Jun", time:"23:00", venue:"Arrowhead, Kansas City",          home:"Bélgica",    home_flag:"🇧🇪", away:"Perú",       away_flag:"🇵🇪" },
  { id:60, group_name:"J", match_date:"Sáb 27 Jun", time:"23:00", venue:"AT&T Stadium, Dallas",            home:"México",     home_flag:"🇲🇽", away:"Rumania",    away_flag:"🇷🇴" },

  // ─── GRUPO K ───────────────────────────────────────────────
  { id:61, group_name:"K", match_date:"Mié 17 Jun", time:"14:00", venue:"NRG Stadium, Houston",            home:"Inglaterra", home_flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", away:"Túnez",    away_flag:"🇹🇳" },
  { id:62, group_name:"K", match_date:"Mié 17 Jun", time:"23:00", venue:"Hard Rock, Miami",                home:"Japón",      home_flag:"🇯🇵", away:"Ghana",      away_flag:"🇬🇭" },
  { id:63, group_name:"K", match_date:"Mar 23 Jun", time:"14:00", venue:"NRG Stadium, Houston",            home:"Inglaterra", home_flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", away:"Japón",    away_flag:"🇯🇵" },
  { id:64, group_name:"K", match_date:"Mar 23 Jun", time:"23:00", venue:"Hard Rock, Miami",                home:"Túnez",      home_flag:"🇹🇳", away:"Ghana",      away_flag:"🇬🇭" },
  { id:65, group_name:"K", match_date:"Dom 27 Jun", time:"20:00", venue:"NRG Stadium, Houston",            home:"Inglaterra", home_flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", away:"Ghana",   away_flag:"🇬🇭" },
  { id:66, group_name:"K", match_date:"Dom 27 Jun", time:"20:00", venue:"Lincoln Financial, Filadelfia",   home:"Japón",      home_flag:"🇯🇵", away:"Túnez",      away_flag:"🇹🇳" },

  // ─── GRUPO L ───────────────────────────────────────────────
  { id:67, group_name:"L", match_date:"Mié 17 Jun", time:"17:00", venue:"AT&T Stadium, Dallas",            home:"Italia",     home_flag:"🇮🇹", away:"México",     away_flag:"🇲🇽" },
  { id:68, group_name:"L", match_date:"Mié 17 Jun", time:"20:00", venue:"BMO Field, Toronto",              home:"Canadá",     home_flag:"🇨🇦", away:"Argelia",    away_flag:"🇩🇿" },
  { id:69, group_name:"L", match_date:"Mar 23 Jun", time:"17:00", venue:"AT&T Stadium, Dallas",            home:"Italia",     home_flag:"🇮🇹", away:"Canadá",     away_flag:"🇨🇦" },
  { id:70, group_name:"L", match_date:"Mar 23 Jun", time:"20:00", venue:"Lincoln Financial, Filadelfia",   home:"México",     home_flag:"🇲🇽", away:"Argelia",    away_flag:"🇩🇿" },
  { id:71, group_name:"L", match_date:"Sáb 27 Jun", time:"18:00", venue:"Lincoln Financial, Filadelfia",   home:"Italia",     home_flag:"🇮🇹", away:"Argelia",    away_flag:"🇩🇿" },
  { id:72, group_name:"L", match_date:"Sáb 27 Jun", time:"18:00", venue:"BMO Field, Toronto",              home:"Canadá",     home_flag:"🇨🇦", away:"México",     away_flag:"🇲🇽" },
];

async function run() {
  console.log('🌍 Importando partidos del Mundial 2026...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM prode_predictions');
    await client.query('DELETE FROM prode_matches');
    console.log('🗑️  Tablas limpias');

    for (const m of matches) {
      await client.query(
        `INSERT INTO prode_matches (id, home, away, match_date, group_name, home_flag, away_flag, time, venue)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [m.id, m.home, m.away, m.match_date, m.group_name, m.home_flag, m.away_flag, m.time, m.venue]
      );
    }

    await client.query('COMMIT');
    console.log(`✅ ${matches.length} partidos importados correctamente`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', e.message);
  } finally {
    client.release();
    pool.end();
  }
}

run();
