// ============================================================
//  scripts/import-matches.js
//  Corre UNA SOLA VEZ para importar los partidos del Mundial
//  desde el database.js original a la base de datos SQLite.
//
//  Uso: node scripts/import-matches.js
// ============================================================

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const db = require('../config/db');

// ── Pegá acá el array DB_MATCHES de tu database.js original ──
// (solo la parte de partidos, sin const DB_MATCHES = )
const matches = [
  { id:1,  group:"A", round:"Grupo A · Jornada 1", date:"Jue 12 Jun", time:"21:00", venue:"SoFi Stadium, Los Ángeles",
    home:{ name:"México",   flag:"🇲🇽" }, away:{ name:"Ecuador",  flag:"🇪🇨" }, result:"", goalsHome:null, goalsAway:null },
  { id:2,  group:"A", round:"Grupo A · Jornada 1", date:"Vie 13 Jun", time:"18:00", venue:"MetLife Stadium, Nueva Jersey",
    home:{ name:"EE.UU.",   flag:"🇺🇸" }, away:{ name:"Panamá",   flag:"🇵🇦" }, result:"", goalsHome:null, goalsAway:null },
  // ... agregar el resto de los partidos de tu database.js ...
  // Para importar todos, copiá el array completo de DB_MATCHES
];

const insert = db.prepare(`
  INSERT OR IGNORE INTO prode_matches
    (id, match_group, round, date, time, venue, home_name, home_flag, away_name, away_flag, result, goals_home, goals_away)
  VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let count = 0;
const insertMany = db.transaction(() => {
  matches.forEach(m => {
    insert.run(
      m.id,
      m.group,
      m.round,
      m.date,
      m.time,
      m.venue,
      m.home.name,
      m.home.flag,
      m.away.name,
      m.away.flag,
      m.result || '',
      m.goalsHome ?? null,
      m.goalsAway ?? null
    );
    count++;
  });
});

insertMany();
console.log(`✅ ${count} partidos importados correctamente.`);
process.exit(0);
