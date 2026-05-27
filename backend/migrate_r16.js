require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const matches = [
    { id:200, phase:'R16', group_name:'16avos · Partido 1',  date:'Sáb 27 Jun', time:'16:00', venue:'Por definir', home:'1E',  home_flag:'🏳️', away:'3 ABCDF', away_flag:'🏳️' },
    { id:201, phase:'R16', group_name:'16avos · Partido 2',  date:'Sáb 27 Jun', time:'20:00', venue:'Por definir', home:'1I',  home_flag:'🏳️', away:'3 CDFGH', away_flag:'🏳️' },
    { id:202, phase:'R16', group_name:'16avos · Partido 3',  date:'Dom 28 Jun', time:'16:00', venue:'Por definir', home:'2A',  home_flag:'🏳️', away:'2B',      away_flag:'🏳️' },
    { id:203, phase:'R16', group_name:'16avos · Partido 4',  date:'Dom 28 Jun', time:'20:00', venue:'Por definir', home:'1F',  home_flag:'🏳️', away:'2C',      away_flag:'🏳️' },
    { id:204, phase:'R16', group_name:'16avos · Partido 5',  date:'Lun 29 Jun', time:'16:00', venue:'Por definir', home:'2K',  home_flag:'🏳️', away:'2L',      away_flag:'🏳️' },
    { id:205, phase:'R16', group_name:'16avos · Partido 6',  date:'Lun 29 Jun', time:'20:00', venue:'Por definir', home:'1H',  home_flag:'🏳️', away:'2J',      away_flag:'🏳️' },
    { id:206, phase:'R16', group_name:'16avos · Partido 7',  date:'Mar 30 Jun', time:'16:00', venue:'Por definir', home:'1D',  home_flag:'🏳️', away:'3 BEFIJ', away_flag:'🏳️' },
    { id:207, phase:'R16', group_name:'16avos · Partido 8',  date:'Mar 30 Jun', time:'20:00', venue:'Por definir', home:'1G',  home_flag:'🏳️', away:'3 AEHIJ', away_flag:'🏳️' },
    { id:208, phase:'R16', group_name:'16avos · Partido 9',  date:'Mié 1 Jul',  time:'16:00', venue:'Por definir', home:'1C',  home_flag:'🏳️', away:'2F',      away_flag:'🏳️' },
    { id:209, phase:'R16', group_name:'16avos · Partido 10', date:'Mié 1 Jul',  time:'20:00', venue:'Por definir', home:'2E',  home_flag:'🏳️', away:'2I',      away_flag:'🏳️' },
    { id:210, phase:'R16', group_name:'16avos · Partido 11', date:'Jue 2 Jul',  time:'16:00', venue:'Por definir', home:'1A',  home_flag:'🏳️', away:'3 CEFHI', away_flag:'🏳️' },
    { id:211, phase:'R16', group_name:'16avos · Partido 12', date:'Jue 2 Jul',  time:'20:00', venue:'Por definir', home:'1L',  home_flag:'🏳️', away:'3 EHIJK', away_flag:'🏳️' },
    { id:212, phase:'R16', group_name:'16avos · Partido 13', date:'Vie 3 Jul',  time:'16:00', venue:'Por definir', home:'1J',  home_flag:'🏳️', away:'2H',      away_flag:'🏳️' },
    { id:213, phase:'R16', group_name:'16avos · Partido 14', date:'Vie 3 Jul',  time:'20:00', venue:'Por definir', home:'2D',  home_flag:'🏳️', away:'2G',      away_flag:'🏳️' },
    { id:214, phase:'R16', group_name:'16avos · Partido 15', date:'Sáb 4 Jul',  time:'16:00', venue:'Por definir', home:'1B',  home_flag:'🏳️', away:'3 EFGIJ', away_flag:'🏳️' },
    { id:215, phase:'R16', group_name:'16avos · Partido 16', date:'Sáb 4 Jul',  time:'20:00', venue:'Por definir', home:'1K',  home_flag:'🏳️', away:'3 DEIJL', away_flag:'🏳️' },
  ];

  for (const m of matches) {
    await pool.query(`
      INSERT INTO prode_matches (id, phase, group_name, match_date, time, venue, home, home_flag, away, away_flag)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (id) DO NOTHING
    `, [m.id, m.phase, m.group_name, m.date, m.time, m.venue, m.home, m.home_flag, m.away, m.away_flag]);
  }

  console.log('✅ Migración completada');
  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
