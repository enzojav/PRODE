// ============================================================
//  seed.js — Poblar PostgreSQL con todos los datos iniciales
//  Correr UNA SOLA VEZ desde Railway Shell: node seed.js
// ============================================================
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const TEAMS = {
  1: 'Equipo Supervisores',
  2: 'Equipo Coordinadores',
  3: 'Equipo Coordinador Calidad',
  4: 'Gerente',
};
const COLORS = ['#6CACE4','#FFB81C','#85bde8','#002470','#3ae8d0','#ff8c42','#a8d8ea','#43e8b0'];

async function seed() {
  console.log('🌱 Iniciando seed completo...\n');

  // ── MIEMBROS ───────────────────────────────────────────────
  const { rows: existingMembers } = await pool.query('SELECT COUNT(*) as c FROM members');
  if (parseInt(existingMembers[0].c) > 0) {
    console.log(`⚠️  Miembros: ya hay ${existingMembers[0].c}, saltando.`);
  } else {
    const members = [
      { name:'Enzo Aguirre',    role:'Desarrollo',      teamId:1 },
      { name:'Leonel Sanagua',  role:'Coordinador',     teamId:1 },
      { name:'Pamela Ribero',   role:'Supervisora',     teamId:1 },
      { name:'Paulo',           role:'Supervisor',      teamId:2 },
      { name:'Mariana Cruz',    role:'Gerente',         teamId:4 },
      { name:'Jesus Gimenez',   role:'Coordinador',     teamId:2 },
      { name:'Marcos Tornesse', role:'Gerente Calidad', teamId:4 },
      { name:'Belen deluca',    role:'Supervisora',     teamId:3 },
    ];
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      await pool.query(
        'INSERT INTO members (name, role, team, avatar_color) VALUES ($1,$2,$3,$4)',
        [m.name, m.role, TEAMS[m.teamId], COLORS[i]]
      );
    }
    console.log(`✅ ${members.length} miembros insertados`);
  }

  // ── NOTICIAS ──────────────────────────────────────────────
  const { rows: existingNews } = await pool.query('SELECT COUNT(*) as c FROM news');
  if (parseInt(existingNews[0].c) > 0) {
    console.log(`⚠️  Noticias: ya hay ${existingNews[0].c}, saltando.`);
  } else {
    const news = [
      { title:'Se perdio un tupper en el 2do de Agustin Pereyra', body:'Todos los supervisores y operadores a buscar el tupper', category:'Calidad',      emoji:'✅',  author:'Marcos Tornesse' },
      { title:'Inscripciones a capacitación',                     body:'Jueves de capacitación, hay medialunas',                category:'Capacitación', emoji:'🗣️', author:'Enzo Aguirre'   },
      { title:'Viernes de dinamica',                              body:'Dia de la empanada Australiana',                       category:'Gestión',      emoji:'📋', author:'Laura Gómez'    },
      { title:'Score Balance',                                    body:'Venimos atrasadisimos estamos al horno',                category:'Calidad',      emoji:'⭐', author:'Ana López'      },
    ];
    for (const n of news) {
      await pool.query(
        'INSERT INTO news (title, body, category, emoji, author) VALUES ($1,$2,$3,$4,$5)',
        [n.title, n.body, n.category, n.emoji, n.author]
      );
    }
    console.log(`✅ ${news.length} noticias insertadas`);
  }

  // ── PARTIDOS ──────────────────────────────────────────────
  const { rows: existingMatches } = await pool.query('SELECT COUNT(*) as c FROM prode_matches');
  if (parseInt(existingMatches[0].c) > 0) {
    console.log(`⚠️  Partidos: ya hay ${existingMatches[0].c}, saltando.`);
  } else {
    const matches = [
      // GRUPO A
      { id:1,  group_name:'A', round:'Grupo A · Jornada 1', date:'Jue 11 Jun', time:'16:00', venue:'Estadio Azteca, CDMX',              home:'México',        home_flag:'🇲🇽', away:'Sudáfrica',     away_flag:'🇿🇦' },
      { id:2,  group_name:'A', round:'Grupo A · Jornada 1', date:'Jue 11 Jun', time:'23:00', venue:'Estadio Akron, Guadalajara',        home:'Corea del Sur', home_flag:'🇰🇷', away:'Rep. Checa',    away_flag:'🇨🇿' },
      { id:3,  group_name:'A', round:'Grupo A · Jornada 2', date:'Mié 18 Jun', time:'20:00', venue:'Mercedes-Benz, Atlanta',            home:'Rep. Checa',    home_flag:'🇨🇿', away:'Sudáfrica',     away_flag:'🇿🇦' },
      { id:4,  group_name:'A', round:'Grupo A · Jornada 2', date:'Mié 18 Jun', time:'22:00', venue:'Estadio Akron, Guadalajara',        home:'México',        home_flag:'🇲🇽', away:'Corea del Sur', away_flag:'🇰🇷' },
      { id:5,  group_name:'A', round:'Grupo A · Jornada 3', date:'Mar 24 Jun', time:'20:00', venue:'Estadio Azteca, CDMX',              home:'Rep. Checa',    home_flag:'🇨🇿', away:'México',        away_flag:'🇲🇽' },
      { id:6,  group_name:'A', round:'Grupo A · Jornada 3', date:'Mar 24 Jun', time:'20:00', venue:'Estadio BBVA, Monterrey',           home:'Sudáfrica',     home_flag:'🇿🇦', away:'Corea del Sur', away_flag:'🇰🇷' },
      // GRUPO B
      { id:7,  group_name:'B', round:'Grupo B · Jornada 1', date:'Vie 12 Jun', time:'16:00', venue:'BMO Field, Toronto',                home:'Canadá',  home_flag:'🇨🇦', away:'Bosnia', away_flag:'🇧🇦' },
      { id:8,  group_name:'B', round:'Grupo B · Jornada 1', date:'Sáb 13 Jun', time:'16:00', venue:"Levi's Stadium, San Francisco",     home:'Qatar',   home_flag:'🇶🇦', away:'Suiza',  away_flag:'🇨🇭' },
      { id:9,  group_name:'B', round:'Grupo B · Jornada 2', date:'Mié 18 Jun', time:'14:00', venue:'SoFi Stadium, Los Ángeles',         home:'Suiza',   home_flag:'🇨🇭', away:'Bosnia', away_flag:'🇧🇦' },
      { id:10, group_name:'B', round:'Grupo B · Jornada 2', date:'Mié 18 Jun', time:'17:00', venue:'BC Place, Vancouver',               home:'Canadá',  home_flag:'🇨🇦', away:'Qatar',  away_flag:'🇶🇦' },
      { id:11, group_name:'B', round:'Grupo B · Jornada 3', date:'Mié 24 Jun', time:'16:00', venue:"Levi's Stadium, San Francisco",     home:'Suiza',   home_flag:'🇨🇭', away:'Canadá', away_flag:'🇨🇦' },
      { id:12, group_name:'B', round:'Grupo B · Jornada 3', date:'Mié 24 Jun', time:'16:00', venue:'Arrowhead, Kansas City',            home:'Bosnia',  home_flag:'🇧🇦', away:'Qatar',  away_flag:'🇶🇦' },
      // GRUPO C
      { id:13, group_name:'C', round:'Grupo C · Jornada 1', date:'Sáb 13 Jun', time:'19:00', venue:'MetLife Stadium, Nueva Jersey',     home:'Brasil',    home_flag:'🇧🇷', away:'Marruecos', away_flag:'🇲🇦' },
      { id:14, group_name:'C', round:'Grupo C · Jornada 1', date:'Sáb 13 Jun', time:'22:00', venue:'Gillette Stadium, Boston',          home:'Haití',     home_flag:'🇭🇹', away:'Escocia',   away_flag:'🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
      { id:15, group_name:'C', round:'Grupo C · Jornada 2', date:'Vie 19 Jun', time:'22:00', venue:'Hard Rock, Miami',                  home:'Brasil',    home_flag:'🇧🇷', away:'Haití',     away_flag:'🇭🇹' },
      { id:16, group_name:'C', round:'Grupo C · Jornada 2', date:'Vie 19 Jun', time:'19:00', venue:'Lumen Field, Seattle',              home:'Escocia',   home_flag:'🏴󠁧󠁢󠁳󠁣󠁴󠁿', away:'Marruecos', away_flag:'🇲🇦' },
      { id:17, group_name:'C', round:'Grupo C · Jornada 3', date:'Jue 25 Jun', time:'20:00', venue:'MetLife Stadium, Nueva Jersey',     home:'Marruecos', home_flag:'🇲🇦', away:'Haití',     away_flag:'🇭🇹' },
      { id:18, group_name:'C', round:'Grupo C · Jornada 3', date:'Jue 25 Jun', time:'20:00', venue:'Gillette Stadium, Boston',          home:'Escocia',   home_flag:'🏴󠁧󠁢󠁳󠁣󠁴󠁿', away:'Brasil',    away_flag:'🇧🇷' },
      // GRUPO D
      { id:19, group_name:'D', round:'Grupo D · Jornada 1', date:'Vie 12 Jun', time:'22:00', venue:'SoFi Stadium, Los Ángeles',         home:'Estados Unidos', home_flag:'🇺🇸', away:'Paraguay',       away_flag:'🇵🇾' },
      { id:20, group_name:'D', round:'Grupo D · Jornada 1', date:'Dom 14 Jun', time:'01:00', venue:'BC Place, Vancouver',               home:'Australia',      home_flag:'🇦🇺', away:'Turquía',        away_flag:'🇹🇷' },
      { id:21, group_name:'D', round:'Grupo D · Jornada 2', date:'Vie 19 Jun', time:'16:00', venue:'AT&T Stadium, Dallas',              home:'Estados Unidos', home_flag:'🇺🇸', away:'Australia',      away_flag:'🇦🇺' },
      { id:22, group_name:'D', round:'Grupo D · Jornada 2', date:'Sáb 20 Jun', time:'01:00', venue:"Levi's Stadium, San Francisco",     home:'Turquía',        home_flag:'🇹🇷', away:'Paraguay',       away_flag:'🇵🇾' },
      { id:23, group_name:'D', round:'Grupo D · Jornada 3', date:'Vie 26 Jun', time:'20:00', venue:'SoFi Stadium, Los Ángeles',         home:'Paraguay',       home_flag:'🇵🇾', away:'Australia',      away_flag:'🇦🇺' },
      { id:24, group_name:'D', round:'Grupo D · Jornada 3', date:'Vie 26 Jun', time:'20:00', venue:'Lumen Field, Seattle',              home:'Turquía',        home_flag:'🇹🇷', away:'Estados Unidos', away_flag:'🇺🇸' },
      // GRUPO E
      { id:25, group_name:'E', round:'Grupo E · Jornada 1', date:'Dom 14 Jun', time:'19:00', venue:'AT&T Stadium, Dallas',              home:'Alemania',       home_flag:'🇩🇪', away:'Costa de Marfil', away_flag:'🇨🇮' },
      { id:26, group_name:'E', round:'Grupo E · Jornada 1', date:'Sáb 14 Jun', time:'22:00', venue:'Arrowhead, Kansas City',            home:'Ecuador',        home_flag:'🇪🇨', away:'Curazao',         away_flag:'🏳️' },
      { id:27, group_name:'E', round:'Grupo E · Jornada 2', date:'Sáb 20 Jun', time:'17:00', venue:'AT&T Stadium, Dallas',              home:'Alemania',       home_flag:'🇩🇪', away:'Ecuador',         away_flag:'🇪🇨' },
      { id:28, group_name:'E', round:'Grupo E · Jornada 2', date:'Sáb 20 Jun', time:'21:00', venue:'Lincoln Financial, Filadelfia',     home:'Costa de Marfil',home_flag:'🇨🇮', away:'Curazao',         away_flag:'🏳️' },
      { id:29, group_name:'E', round:'Grupo E · Jornada 3', date:'Vie 26 Jun', time:'20:00', venue:'Arrowhead, Kansas City',            home:'Alemania',       home_flag:'🇩🇪', away:'Curazao',         away_flag:'🏳️' },
      { id:30, group_name:'E', round:'Grupo E · Jornada 3', date:'Vie 26 Jun', time:'20:00', venue:'AT&T Stadium, Dallas',              home:'Costa de Marfil',home_flag:'🇨🇮', away:'Ecuador',         away_flag:'🇪🇨' },
      // GRUPO F
      { id:31, group_name:'F', round:'Grupo F · Jornada 1', date:'Dom 14 Jun', time:'16:00', venue:'Lincoln Financial, Filadelfia',     home:'Países Bajos', home_flag:'🇳🇱', away:'Japón',  away_flag:'🇯🇵' },
      { id:32, group_name:'F', round:'Grupo F · Jornada 1', date:'Dom 15 Jun', time:'01:00', venue:'Lumen Field, Seattle',              home:'Túnez',        home_flag:'🇹🇳', away:'Suecia', away_flag:'🇸🇪' },
      { id:33, group_name:'F', round:'Grupo F · Jornada 2', date:'Sáb 20 Jun', time:'14:00', venue:'Lincoln Financial, Filadelfia',     home:'Países Bajos', home_flag:'🇳🇱', away:'Túnez',  away_flag:'🇹🇳' },
      { id:34, group_name:'F', round:'Grupo F · Jornada 2', date:'Dom 21 Jun', time:'01:00', venue:'Lumen Field, Seattle',              home:'Suecia',       home_flag:'🇸🇪', away:'Japón',  away_flag:'🇯🇵' },
      { id:35, group_name:'F', round:'Grupo F · Jornada 3', date:'Sáb 27 Jun', time:'20:00', venue:'Gillette Stadium, Boston',          home:'Japón',        home_flag:'🇯🇵', away:'Túnez',  away_flag:'🇹🇳' },
      { id:36, group_name:'F', round:'Grupo F · Jornada 3', date:'Sáb 27 Jun', time:'20:00', venue:'Lincoln Financial, Filadelfia',     home:'Suecia',       home_flag:'🇸🇪', away:'Países Bajos', away_flag:'🇳🇱' },
      // GRUPO G
      { id:37, group_name:'G', round:'Grupo G · Jornada 1', date:'Lun 15 Jun', time:'19:00', venue:'Hard Rock, Miami',                  home:'Bélgica',       home_flag:'🇧🇪', away:'Nueva Zelanda', away_flag:'🇳🇿' },
      { id:38, group_name:'G', round:'Grupo G · Jornada 1', date:'Dom 15 Jun', time:'22:00', venue:'SoFi Stadium, Los Ángeles',         home:'Egipto',        home_flag:'🇪🇬', away:'Irán',          away_flag:'🇮🇷' },
      { id:39, group_name:'G', round:'Grupo G · Jornada 2', date:'Dom 21 Jun', time:'16:00', venue:'Hard Rock, Miami',                  home:'Bélgica',       home_flag:'🇧🇪', away:'Irán',          away_flag:'🇮🇷' },
      { id:40, group_name:'G', round:'Grupo G · Jornada 2', date:'Dom 21 Jun', time:'19:00', venue:'SoFi Stadium, Los Ángeles',         home:'Egipto',        home_flag:'🇪🇬', away:'Nueva Zelanda', away_flag:'🇳🇿' },
      { id:41, group_name:'G', round:'Grupo G · Jornada 3', date:'Sáb 27 Jun', time:'20:00', venue:'Hard Rock, Miami',                  home:'Bélgica',       home_flag:'🇧🇪', away:'Egipto',        away_flag:'🇪🇬' },
      { id:42, group_name:'G', round:'Grupo G · Jornada 3', date:'Sáb 27 Jun', time:'20:00', venue:'Lumen Field, Seattle',              home:'Irán',          home_flag:'🇮🇷', away:'Nueva Zelanda', away_flag:'🇳🇿' },
      // GRUPO H
      { id:43, group_name:'H', round:'Grupo H · Jornada 1', date:'Lun 15 Jun', time:'13:00', venue:'Mercedes-Benz, Atlanta',            home:'España',    home_flag:'🇪🇸', away:'Cabo Verde',   away_flag:'🇨🇻' },
      { id:44, group_name:'H', round:'Grupo H · Jornada 1', date:'Lun 15 Jun', time:'22:00', venue:'Arrowhead, Kansas City',            home:'Uruguay',   home_flag:'🇺🇾', away:'Arabia Saudí', away_flag:'🇸🇦' },
      { id:45, group_name:'H', round:'Grupo H · Jornada 2', date:'Dom 21 Jun', time:'13:00', venue:'Mercedes-Benz, Atlanta',            home:'España',    home_flag:'🇪🇸', away:'Arabia Saudí', away_flag:'🇸🇦' },
      { id:46, group_name:'H', round:'Grupo H · Jornada 2', date:'Dom 21 Jun', time:'22:00', venue:'Arrowhead, Kansas City',            home:'Uruguay',   home_flag:'🇺🇾', away:'Cabo Verde',   away_flag:'🇨🇻' },
      { id:47, group_name:'H', round:'Grupo H · Jornada 3', date:'Sáb 27 Jun', time:'20:00', venue:'Estadio Akron, Guadalajara',        home:'España',    home_flag:'🇪🇸', away:'Uruguay',      away_flag:'🇺🇾' },
      { id:48, group_name:'H', round:'Grupo H · Jornada 3', date:'Sáb 27 Jun', time:'20:00', venue:'Mercedes-Benz, Atlanta',            home:'Cabo Verde',home_flag:'🇨🇻', away:'Arabia Saudí', away_flag:'🇸🇦' },
      // GRUPO I
      { id:49, group_name:'I', round:'Grupo I · Jornada 1', date:'Mar 16 Jun', time:'16:00', venue:'MetLife Stadium, Nueva Jersey',     home:'Francia',  home_flag:'🇫🇷', away:'Senegal',  away_flag:'🇸🇳' },
      { id:50, group_name:'I', round:'Grupo I · Jornada 1', date:'Mar 16 Jun', time:'19:00', venue:'Arrowhead, Kansas City',            home:'Irak',     home_flag:'🇮🇶', away:'Noruega',  away_flag:'🇳🇴' },
      { id:51, group_name:'I', round:'Grupo I · Jornada 2', date:'Lun 22 Jun', time:'18:00', venue:'MetLife Stadium, Nueva Jersey',     home:'Francia',  home_flag:'🇫🇷', away:'Irak',     away_flag:'🇮🇶' },
      { id:52, group_name:'I', round:'Grupo I · Jornada 2', date:'Lun 22 Jun', time:'21:00', venue:'Hard Rock, Miami',                  home:'Noruega',  home_flag:'🇳🇴', away:'Senegal',  away_flag:'🇸🇳' },
      { id:53, group_name:'I', round:'Grupo I · Jornada 3', date:'Dom 27 Jun', time:'20:00', venue:'MetLife Stadium, Nueva Jersey',     home:'Senegal',  home_flag:'🇸🇳', away:'Irak',     away_flag:'🇮🇶' },
      { id:54, group_name:'I', round:'Grupo I · Jornada 3', date:'Dom 27 Jun', time:'20:00', venue:'AT&T Stadium, Dallas',              home:'Noruega',  home_flag:'🇳🇴', away:'Francia',  away_flag:'🇫🇷' },
      // GRUPO J
      { id:55, group_name:'J', round:'Grupo J · Jornada 1', date:'Mar 16 Jun', time:'22:00', venue:'Arrowhead, Kansas City',            home:'Argentina', home_flag:'🇦🇷', away:'Argelia',  away_flag:'🇩🇿' },
      { id:56, group_name:'J', round:'Grupo J · Jornada 1', date:'Mar 16 Jun', time:'01:00', venue:'Lumen Field, Seattle',              home:'Austria',   home_flag:'🇦🇹', away:'Jordania', away_flag:'🇯🇴' },
      { id:57, group_name:'J', round:'Grupo J · Jornada 2', date:'Lun 22 Jun', time:'14:00', venue:'AT&T Stadium, Dallas',              home:'Argentina', home_flag:'🇦🇷', away:'Austria',  away_flag:'🇦🇹' },
      { id:58, group_name:'J', round:'Grupo J · Jornada 2', date:'Lun 22 Jun', time:'00:00', venue:'Lumen Field, Seattle',              home:'Jordania',  home_flag:'🇯🇴', away:'Argelia',  away_flag:'🇩🇿' },
      { id:59, group_name:'J', round:'Grupo J · Jornada 3', date:'Sáb 27 Jun', time:'23:00', venue:'Arrowhead, Kansas City',            home:'Jordania',  home_flag:'🇯🇴', away:'Argentina',away_flag:'🇦🇷' },
      { id:60, group_name:'J', round:'Grupo J · Jornada 3', date:'Sáb 27 Jun', time:'23:00', venue:'AT&T Stadium, Dallas',              home:'Argelia',   home_flag:'🇩🇿', away:'Austria',  away_flag:'🇦🇹' },
      // GRUPO K
      { id:61, group_name:'K', round:'Grupo K · Jornada 1', date:'Mié 17 Jun', time:'14:00', venue:'NRG Stadium, Houston',              home:'Portugal',      home_flag:'🇵🇹', away:'Rep. D. Congo', away_flag:'🇨🇩' },
      { id:62, group_name:'K', round:'Grupo K · Jornada 1', date:'Mié 17 Jun', time:'23:00', venue:'Hard Rock, Miami',                  home:'Uzbekistán',    home_flag:'🇺🇿', away:'Colombia',      away_flag:'🇨🇴' },
      { id:63, group_name:'K', round:'Grupo K · Jornada 2', date:'Mar 23 Jun', time:'14:00', venue:'NRG Stadium, Houston',              home:'Portugal',      home_flag:'🇵🇹', away:'Uzbekistán',    away_flag:'🇺🇿' },
      { id:64, group_name:'K', round:'Grupo K · Jornada 2', date:'Mar 23 Jun', time:'23:00', venue:'Hard Rock, Miami',                  home:'Colombia',      home_flag:'🇨🇴', away:'Rep. D. Congo', away_flag:'🇨🇩' },
      { id:65, group_name:'K', round:'Grupo K · Jornada 3', date:'Dom 27 Jun', time:'20:00', venue:'NRG Stadium, Houston',              home:'Colombia',      home_flag:'🇨🇴', away:'Portugal',      away_flag:'🇵🇹' },
      { id:66, group_name:'K', round:'Grupo K · Jornada 3', date:'Dom 27 Jun', time:'20:00', venue:'Lincoln Financial, Filadelfia',     home:'Rep. D. Congo', home_flag:'🇨🇩', away:'Uzbekistán',    away_flag:'🇺🇿' },
      // GRUPO L
      { id:67, group_name:'L', round:'Grupo L · Jornada 1', date:'Mié 17 Jun', time:'17:00', venue:'AT&T Stadium, Dallas',              home:'Inglaterra', home_flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', away:'Croacia', away_flag:'🇭🇷' },
      { id:68, group_name:'L', round:'Grupo L · Jornada 1', date:'Mié 17 Jun', time:'20:00', venue:'BMO Field, Toronto',                home:'Ghana',      home_flag:'🇬🇭',     away:'Panamá', away_flag:'🇵🇦' },
      { id:69, group_name:'L', round:'Grupo L · Jornada 2', date:'Mar 23 Jun', time:'17:00', venue:'AT&T Stadium, Dallas',              home:'Inglaterra', home_flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', away:'Ghana',   away_flag:'🇬🇭' },
      { id:70, group_name:'L', round:'Grupo L · Jornada 2', date:'Mar 23 Jun', time:'20:00', venue:'Lincoln Financial, Filadelfia',     home:'Panamá',     home_flag:'🇵🇦',     away:'Croacia', away_flag:'🇭🇷' },
      { id:71, group_name:'L', round:'Grupo L · Jornada 3', date:'Sáb 27 Jun', time:'18:00', venue:'Lincoln Financial, Filadelfia',     home:'Panamá',     home_flag:'🇵🇦',     away:'Inglaterra', away_flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
      { id:72, group_name:'L', round:'Grupo L · Jornada 3', date:'Sáb 27 Jun', time:'18:00', venue:'BMO Field, Toronto',                home:'Croacia',    home_flag:'🇭🇷',     away:'Ghana',      away_flag:'🇬🇭' },
    ];

    for (const m of matches) {
      await pool.query(
        'INSERT INTO prode_matches (id, group_name, home, home_flag, away, away_flag, match_date, time, venue) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [m.id, m.group_name, m.home, m.home_flag, m.away, m.away_flag, m.date, m.time, m.venue]
      );
    }
    // Resetear el serial de ID para que futuros inserts no choquen
    await pool.query("SELECT setval('prode_matches_id_seq', (SELECT MAX(id) FROM prode_matches))");
    console.log(`✅ ${matches.length} partidos insertados`);
  }

  console.log('\n✅ Seed completo. Ya podés usar la app.');
  await pool.end();
}

seed().catch(e => {
  console.error('❌ Error en seed:', e.message);
  process.exit(1);
});
