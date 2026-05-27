// seed.js — Insertar partidos del Mundial 2026 en PostgreSQL
// Correr con: node seed.js
// Requiere DATABASE_URL en el entorno
require('dotenv').config();
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL no definida');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const DB_MATCHES = [
  // ─── GRUPO A ───
  { id:1,  group:"A", round:"Grupo A · Jornada 1", date:"Jue 11 Jun", time:"16:00", venue:"Estadio Azteca, CDMX",         home:"México",          home_flag:"🇲🇽", away:"Sudáfrica",      away_flag:"🇿🇦" },
  { id:2,  group:"A", round:"Grupo A · Jornada 1", date:"Jue 11 Jun", time:"23:00", venue:"Estadio Akron, Guadalajara",   home:"Corea del Sur",   home_flag:"🇰🇷", away:"Rep. Checa",     away_flag:"🇨🇿" },
  { id:3,  group:"A", round:"Grupo A · Jornada 2", date:"Mié 18 Jun", time:"20:00", venue:"Mercedes-Benz, Atlanta",       home:"Rep. Checa",      home_flag:"🇨🇿", away:"Sudáfrica",      away_flag:"🇿🇦" },
  { id:4,  group:"A", round:"Grupo A · Jornada 2", date:"Mié 18 Jun", time:"22:00", venue:"Estadio Akron, Guadalajara",   home:"México",          home_flag:"🇲🇽", away:"Corea del Sur",  away_flag:"🇰🇷" },
  { id:5,  group:"A", round:"Grupo A · Jornada 3", date:"Mar 24 Jun", time:"20:00", venue:"Estadio Azteca, CDMX",         home:"Rep. Checa",      home_flag:"🇨🇿", away:"México",         away_flag:"🇲🇽" },
  { id:6,  group:"A", round:"Grupo A · Jornada 3", date:"Mar 24 Jun", time:"20:00", venue:"Estadio BBVA, Monterrey",      home:"Sudáfrica",       home_flag:"🇿🇦", away:"Corea del Sur",  away_flag:"🇰🇷" },
  // ─── GRUPO B ───
  { id:7,  group:"B", round:"Grupo B · Jornada 1", date:"Vie 12 Jun", time:"16:00", venue:"BMO Field, Toronto",           home:"Canadá",          home_flag:"🇨🇦", away:"Bosnia",         away_flag:"🇧🇦" },
  { id:8,  group:"B", round:"Grupo B · Jornada 1", date:"Sáb 13 Jun", time:"16:00", venue:"Levi's Stadium, San Francisco",home:"Qatar",           home_flag:"🇶🇦", away:"Suiza",          away_flag:"🇨🇭" },
  { id:9,  group:"B", round:"Grupo B · Jornada 2", date:"Mié 18 Jun", time:"14:00", venue:"SoFi Stadium, Los Ángeles",   home:"Suiza",           home_flag:"🇨🇭", away:"Bosnia",         away_flag:"🇧🇦" },
  { id:10, group:"B", round:"Grupo B · Jornada 2", date:"Mié 18 Jun", time:"17:00", venue:"BC Place, Vancouver",          home:"Canadá",          home_flag:"🇨🇦", away:"Qatar",          away_flag:"🇶🇦" },
  { id:11, group:"B", round:"Grupo B · Jornada 3", date:"Mié 24 Jun", time:"16:00", venue:"Levi's Stadium, San Francisco",home:"Suiza",           home_flag:"🇨🇭", away:"Canadá",         away_flag:"🇨🇦" },
  { id:12, group:"B", round:"Grupo B · Jornada 3", date:"Mié 24 Jun", time:"16:00", venue:"Arrowhead, Kansas City",       home:"Bosnia",          home_flag:"🇧🇦", away:"Qatar",          away_flag:"🇶🇦" },
  // ─── GRUPO C ───
  { id:13, group:"C", round:"Grupo C · Jornada 1", date:"Sáb 13 Jun", time:"19:00", venue:"MetLife Stadium, Nueva Jersey",home:"Brasil",          home_flag:"🇧🇷", away:"Marruecos",      away_flag:"🇲🇦" },
  { id:14, group:"C", round:"Grupo C · Jornada 1", date:"Sáb 13 Jun", time:"22:00", venue:"Gillette Stadium, Boston",     home:"Haití",           home_flag:"🇭🇹", away:"Escocia",        away_flag:"🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  { id:15, group:"C", round:"Grupo C · Jornada 2", date:"Vie 19 Jun", time:"22:00", venue:"Hard Rock, Miami",             home:"Brasil",          home_flag:"🇧🇷", away:"Haití",          away_flag:"🇭🇹" },
  { id:16, group:"C", round:"Grupo C · Jornada 2", date:"Vie 19 Jun", time:"19:00", venue:"Lumen Field, Seattle",         home:"Escocia",         home_flag:"🏴󠁧󠁢󠁳󠁣󠁴󠁿", away:"Marruecos",  away_flag:"🇲🇦" },
  { id:17, group:"C", round:"Grupo C · Jornada 3", date:"Jue 25 Jun", time:"20:00", venue:"MetLife Stadium, Nueva Jersey",home:"Marruecos",       home_flag:"🇲🇦", away:"Haití",          away_flag:"🇭🇹" },
  { id:18, group:"C", round:"Grupo C · Jornada 3", date:"Jue 25 Jun", time:"20:00", venue:"Gillette Stadium, Boston",     home:"Escocia",         home_flag:"🏴󠁧󠁢󠁳󠁣󠁴󠁿", away:"Brasil",     away_flag:"🇧🇷" },
  // ─── GRUPO D ───
  { id:19, group:"D", round:"Grupo D · Jornada 1", date:"Vie 12 Jun", time:"22:00", venue:"SoFi Stadium, Los Ángeles",   home:"Estados Unidos",  home_flag:"🇺🇸", away:"Paraguay",       away_flag:"🇵🇾" },
  { id:20, group:"D", round:"Grupo D · Jornada 1", date:"Dom 14 Jun", time:"01:00", venue:"BC Place, Vancouver",          home:"Australia",       home_flag:"🇦🇺", away:"Turquía",        away_flag:"🇹🇷" },
  { id:21, group:"D", round:"Grupo D · Jornada 2", date:"Vie 19 Jun", time:"16:00", venue:"AT&T Stadium, Dallas",         home:"Estados Unidos",  home_flag:"🇺🇸", away:"Australia",      away_flag:"🇦🇺" },
  { id:22, group:"D", round:"Grupo D · Jornada 2", date:"Sáb 20 Jun", time:"01:00", venue:"Levi's Stadium, San Francisco",home:"Turquía",         home_flag:"🇹🇷", away:"Paraguay",       away_flag:"🇵🇾" },
  { id:23, group:"D", round:"Grupo D · Jornada 3", date:"Vie 26 Jun", time:"20:00", venue:"SoFi Stadium, Los Ángeles",   home:"Paraguay",        home_flag:"🇵🇾", away:"Australia",      away_flag:"🇦🇺" },
  { id:24, group:"D", round:"Grupo D · Jornada 3", date:"Vie 26 Jun", time:"20:00", venue:"Lumen Field, Seattle",         home:"Turquía",         home_flag:"🇹🇷", away:"Estados Unidos", away_flag:"🇺🇸" },
  // ─── GRUPO E ───
  { id:25, group:"E", round:"Grupo E · Jornada 1", date:"Dom 14 Jun", time:"19:00", venue:"AT&T Stadium, Dallas",         home:"Alemania",        home_flag:"🇩🇪", away:"Costa de Marfil",away_flag:"🇨🇮" },
  { id:26, group:"E", round:"Grupo E · Jornada 1", date:"Sáb 14 Jun", time:"22:00", venue:"Arrowhead, Kansas City",       home:"Ecuador",         home_flag:"🇪🇨", away:"Curazao",        away_flag:"🏳️" },
  { id:27, group:"E", round:"Grupo E · Jornada 2", date:"Sáb 20 Jun", time:"17:00", venue:"AT&T Stadium, Dallas",         home:"Alemania",        home_flag:"🇩🇪", away:"Ecuador",        away_flag:"🇪🇨" },
  { id:28, group:"E", round:"Grupo E · Jornada 2", date:"Sáb 20 Jun", time:"21:00", venue:"Lincoln Financial, Filadelfia",home:"Costa de Marfil", home_flag:"🇨🇮", away:"Curazao",        away_flag:"🏳️" },
  { id:29, group:"E", round:"Grupo E · Jornada 3", date:"Vie 26 Jun", time:"20:00", venue:"Arrowhead, Kansas City",       home:"Alemania",        home_flag:"🇩🇪", away:"Curazao",        away_flag:"🏳️" },
  { id:30, group:"E", round:"Grupo E · Jornada 3", date:"Vie 26 Jun", time:"20:00", venue:"AT&T Stadium, Dallas",         home:"Costa de Marfil", home_flag:"🇨🇮", away:"Ecuador",        away_flag:"🇪🇨" },
  // ─── GRUPO F ───
  { id:31, group:"F", round:"Grupo F · Jornada 1", date:"Dom 14 Jun", time:"16:00", venue:"Lincoln Financial, Filadelfia",home:"Países Bajos",    home_flag:"🇳🇱", away:"Japón",          away_flag:"🇯🇵" },
  { id:32, group:"F", round:"Grupo F · Jornada 1", date:"Dom 15 Jun", time:"01:00", venue:"Lumen Field, Seattle",         home:"Túnez",           home_flag:"🇹🇳", away:"Suecia",         away_flag:"🇸🇪" },
  { id:33, group:"F", round:"Grupo F · Jornada 2", date:"Sáb 20 Jun", time:"14:00", venue:"Lincoln Financial, Filadelfia",home:"Países Bajos",    home_flag:"🇳🇱", away:"Túnez",          away_flag:"🇹🇳" },
  { id:34, group:"F", round:"Grupo F · Jornada 2", date:"Dom 21 Jun", time:"01:00", venue:"Lumen Field, Seattle",         home:"Suecia",          home_flag:"🇸🇪", away:"Japón",          away_flag:"🇯🇵" },
  { id:35, group:"F", round:"Grupo F · Jornada 3", date:"Sáb 27 Jun", time:"20:00", venue:"Gillette Stadium, Boston",     home:"Japón",           home_flag:"🇯🇵", away:"Túnez",          away_flag:"🇹🇳" },
  { id:36, group:"F", round:"Grupo F · Jornada 3", date:"Sáb 27 Jun", time:"20:00", venue:"Lincoln Financial, Filadelfia",home:"Suecia",          home_flag:"🇸🇪", away:"Países Bajos",   away_flag:"🇳🇱" },
  // ─── GRUPO G ───
  { id:37, group:"G", round:"Grupo G · Jornada 1", date:"Lun 15 Jun", time:"19:00", venue:"Hard Rock, Miami",             home:"Bélgica",         home_flag:"🇧🇪", away:"Nueva Zelanda",  away_flag:"🇳🇿" },
  { id:38, group:"G", round:"Grupo G · Jornada 1", date:"Dom 15 Jun", time:"22:00", venue:"SoFi Stadium, Los Ángeles",   home:"Egipto",          home_flag:"🇪🇬", away:"Irán",           away_flag:"🇮🇷" },
  { id:39, group:"G", round:"Grupo G · Jornada 2", date:"Dom 21 Jun", time:"16:00", venue:"Hard Rock, Miami",             home:"Bélgica",         home_flag:"🇧🇪", away:"Irán",           away_flag:"🇮🇷" },
  { id:40, group:"G", round:"Grupo G · Jornada 2", date:"Dom 21 Jun", time:"19:00", venue:"SoFi Stadium, Los Ángeles",   home:"Egipto",          home_flag:"🇪🇬", away:"Nueva Zelanda",  away_flag:"🇳🇿" },
  { id:41, group:"G", round:"Grupo G · Jornada 3", date:"Sáb 27 Jun", time:"20:00", venue:"Hard Rock, Miami",             home:"Bélgica",         home_flag:"🇧🇪", away:"Egipto",         away_flag:"🇪🇬" },
  { id:42, group:"G", round:"Grupo G · Jornada 3", date:"Sáb 27 Jun", time:"20:00", venue:"Lumen Field, Seattle",         home:"Irán",            home_flag:"🇮🇷", away:"Nueva Zelanda",  away_flag:"🇳🇿" },
  // ─── GRUPO H ───
  { id:43, group:"H", round:"Grupo H · Jornada 1", date:"Lun 15 Jun", time:"13:00", venue:"Mercedes-Benz, Atlanta",       home:"España",          home_flag:"🇪🇸", away:"Cabo Verde",     away_flag:"🇨🇻" },
  { id:44, group:"H", round:"Grupo H · Jornada 1", date:"Lun 15 Jun", time:"22:00", venue:"Arrowhead, Kansas City",       home:"Uruguay",         home_flag:"🇺🇾", away:"Arabia Saudí",   away_flag:"🇸🇦" },
  { id:45, group:"H", round:"Grupo H · Jornada 2", date:"Dom 21 Jun", time:"13:00", venue:"Mercedes-Benz, Atlanta",       home:"España",          home_flag:"🇪🇸", away:"Arabia Saudí",   away_flag:"🇸🇦" },
  { id:46, group:"H", round:"Grupo H · Jornada 2", date:"Dom 21 Jun", time:"22:00", venue:"Arrowhead, Kansas City",       home:"Uruguay",         home_flag:"🇺🇾", away:"Cabo Verde",     away_flag:"🇨🇻" },
  { id:47, group:"H", round:"Grupo H · Jornada 3", date:"Sáb 27 Jun", time:"20:00", venue:"Estadio Akron, Guadalajara",   home:"España",          home_flag:"🇪🇸", away:"Uruguay",        away_flag:"🇺🇾" },
  { id:48, group:"H", round:"Grupo H · Jornada 3", date:"Sáb 27 Jun", time:"20:00", venue:"Mercedes-Benz, Atlanta",       home:"Cabo Verde",      home_flag:"🇨🇻", away:"Arabia Saudí",   away_flag:"🇸🇦" },
  // ─── GRUPO I ───
  { id:49, group:"I", round:"Grupo I · Jornada 1", date:"Mar 16 Jun", time:"16:00", venue:"MetLife Stadium, Nueva Jersey",home:"Francia",         home_flag:"🇫🇷", away:"Senegal",        away_flag:"🇸🇳" },
  { id:50, group:"I", round:"Grupo I · Jornada 1", date:"Mar 16 Jun", time:"19:00", venue:"Arrowhead, Kansas City",       home:"Irak",            home_flag:"🇮🇶", away:"Noruega",        away_flag:"🇳🇴" },
  { id:51, group:"I", round:"Grupo I · Jornada 2", date:"Lun 22 Jun", time:"18:00", venue:"MetLife Stadium, Nueva Jersey",home:"Francia",         home_flag:"🇫🇷", away:"Irak",           away_flag:"🇮🇶" },
  { id:52, group:"I", round:"Grupo I · Jornada 2", date:"Lun 22 Jun", time:"21:00", venue:"Hard Rock, Miami",             home:"Noruega",         home_flag:"🇳🇴", away:"Senegal",        away_flag:"🇸🇳" },
  { id:53, group:"I", round:"Grupo I · Jornada 3", date:"Dom 27 Jun", time:"20:00", venue:"MetLife Stadium, Nueva Jersey",home:"Senegal",         home_flag:"🇸🇳", away:"Irak",           away_flag:"🇮🇶" },
  { id:54, group:"I", round:"Grupo I · Jornada 3", date:"Dom 27 Jun", time:"20:00", venue:"AT&T Stadium, Dallas",         home:"Noruega",         home_flag:"🇳🇴", away:"Francia",        away_flag:"🇫🇷" },
  // ─── GRUPO J ───
  { id:55, group:"J", round:"Grupo J · Jornada 1", date:"Mar 16 Jun", time:"22:00", venue:"Arrowhead, Kansas City",       home:"Argentina",       home_flag:"🇦🇷", away:"Argelia",        away_flag:"🇩🇿" },
  { id:56, group:"J", round:"Grupo J · Jornada 1", date:"Mar 16 Jun", time:"01:00", venue:"Lumen Field, Seattle",         home:"Austria",         home_flag:"🇦🇹", away:"Jordania",       away_flag:"🇯🇴" },
  { id:57, group:"J", round:"Grupo J · Jornada 2", date:"Lun 22 Jun", time:"14:00", venue:"AT&T Stadium, Dallas",         home:"Argentina",       home_flag:"🇦🇷", away:"Austria",        away_flag:"🇦🇹" },
  { id:58, group:"J", round:"Grupo J · Jornada 2", date:"Lun 22 Jun", time:"00:00", venue:"Lumen Field, Seattle",         home:"Jordania",        home_flag:"🇯🇴", away:"Argelia",        away_flag:"🇩🇿" },
  { id:59, group:"J", round:"Grupo J · Jornada 3", date:"Sáb 27 Jun", time:"23:00", venue:"Arrowhead, Kansas City",       home:"Jordania",        home_flag:"🇯🇴", away:"Argentina",      away_flag:"🇦🇷" },
  { id:60, group:"J", round:"Grupo J · Jornada 3", date:"Sáb 27 Jun", time:"23:00", venue:"AT&T Stadium, Dallas",         home:"Argelia",         home_flag:"🇩🇿", away:"Austria",        away_flag:"🇦🇹" },
  // ─── GRUPO K ───
  { id:61, group:"K", round:"Grupo K · Jornada 1", date:"Mié 17 Jun", time:"14:00", venue:"NRG Stadium, Houston",         home:"Portugal",        home_flag:"🇵🇹", away:"Rep. D. Congo",  away_flag:"🇨🇩" },
  { id:62, group:"K", round:"Grupo K · Jornada 1", date:"Mié 17 Jun", time:"23:00", venue:"Hard Rock, Miami",             home:"Uzbekistán",      home_flag:"🇺🇿", away:"Colombia",       away_flag:"🇨🇴" },
  { id:63, group:"K", round:"Grupo K · Jornada 2", date:"Mar 23 Jun", time:"14:00", venue:"NRG Stadium, Houston",         home:"Portugal",        home_flag:"🇵🇹", away:"Uzbekistán",     away_flag:"🇺🇿" },
  { id:64, group:"K", round:"Grupo K · Jornada 2", date:"Mar 23 Jun", time:"23:00", venue:"Hard Rock, Miami",             home:"Colombia",        home_flag:"🇨🇴", away:"Rep. D. Congo",  away_flag:"🇨🇩" },
  { id:65, group:"K", round:"Grupo K · Jornada 3", date:"Dom 27 Jun", time:"20:00", venue:"NRG Stadium, Houston",         home:"Colombia",        home_flag:"🇨🇴", away:"Portugal",       away_flag:"🇵🇹" },
  { id:66, group:"K", round:"Grupo K · Jornada 3", date:"Dom 27 Jun", time:"20:00", venue:"Lincoln Financial, Filadelfia",home:"Rep. D. Congo",   home_flag:"🇨🇩", away:"Uzbekistán",     away_flag:"🇺🇿" },
  // ─── GRUPO L ───
  { id:67, group:"L", round:"Grupo L · Jornada 1", date:"Mié 17 Jun", time:"17:00", venue:"AT&T Stadium, Dallas",         home:"Inglaterra",      home_flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", away:"Croacia",    away_flag:"🇭🇷" },
  { id:68, group:"L", round:"Grupo L · Jornada 1", date:"Mié 17 Jun", time:"20:00", venue:"BMO Field, Toronto",           home:"Ghana",           home_flag:"🇬🇭", away:"Panamá",         away_flag:"🇵🇦" },
  { id:69, group:"L", round:"Grupo L · Jornada 2", date:"Mar 23 Jun", time:"17:00", venue:"AT&T Stadium, Dallas",         home:"Inglaterra",      home_flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", away:"Ghana",      away_flag:"🇬🇭" },
  { id:70, group:"L", round:"Grupo L · Jornada 2", date:"Mar 23 Jun", time:"20:00", venue:"Lincoln Financial, Filadelfia",home:"Panamá",          home_flag:"🇵🇦", away:"Croacia",        away_flag:"🇭🇷" },
  { id:71, group:"L", round:"Grupo L · Jornada 3", date:"Sáb 27 Jun", time:"18:00", venue:"Lincoln Financial, Filadelfia",home:"Panamá",          home_flag:"🇵🇦", away:"Inglaterra",     away_flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { id:72, group:"L", round:"Grupo L · Jornada 3", date:"Sáb 27 Jun", time:"18:00", venue:"BMO Field, Toronto",           home:"Croacia",         home_flag:"🇭🇷", away:"Ghana",          away_flag:"🇬🇭" },
];

async function seed() {
  console.log('🌱 Iniciando seed de partidos...');

  // Limpiar tabla primero (opcional, evita duplicados)
  await pool.query('DELETE FROM prode_predictions');
  await pool.query('DELETE FROM prode_matches');
  console.log('🗑️  Tabla limpiada');

  for (const m of DB_MATCHES) {
    await pool.query(
      `INSERT INTO prode_matches (home, away, home_flag, away_flag, match_date, time, venue, group_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [m.home, m.away, m.home_flag, m.away_flag, m.date, m.time, m.venue, m.group]
    );
  }

  console.log(`✅ ${DB_MATCHES.length} partidos insertados correctamente`);
  await pool.end();
}

seed().catch(err => {
  console.error('❌ Error en seed:', err.message);
  process.exit(1);
});
