const { Pool } = require('pg');
 
// Validar que DATABASE_URL esté seteada ANTES de intentar conectar
if (!process.env.DATABASE_URL) {
  console.error('❌ Error iniciando DB: DATABASE_URL no está definida en las variables de entorno.');
  console.error('   En Railway: agregá el plugin de PostgreSQL y linkealó a este servicio.');
  process.exit(1);
}
 
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // Timeouts para evitar que cuelgue en silencio
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});
 
async function initDB() {
  // Test de conexión explícito para ver el error real
  try {
    await pool.query('SELECT 1');
    console.log('✅ Conexión a PostgreSQL exitosa');
  } catch (e) {
    console.error('❌ No se pudo conectar a PostgreSQL:');
    console.error('   Mensaje:', e.message);
    console.error('   Código:', e.code);
    console.error('   DATABASE_URL empieza con:', (process.env.DATABASE_URL || '').substring(0, 30) + '...');
    process.exit(1);
  }
 
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id           SERIAL PRIMARY KEY,
      username     TEXT UNIQUE NOT NULL,
      password     TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role         TEXT DEFAULT 'player',
      status       TEXT DEFAULT 'pending',
      color        TEXT DEFAULT '#6CACE4',
      created_at   TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS members (
      id           SERIAL PRIMARY KEY,
      name         TEXT NOT NULL,
      role         TEXT,
      team         TEXT,
      avatar_color TEXT
    );
    CREATE TABLE IF NOT EXISTS news (
      id         SERIAL PRIMARY KEY,
      title      TEXT NOT NULL,
      body       TEXT,
      category   TEXT,
      emoji      TEXT,
      author     TEXT,
      image_url  TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS scores (
      id        SERIAL PRIMARY KEY,
      member_id INTEGER REFERENCES members(id),
      period    TEXT,
      category  TEXT,
      value     NUMERIC,
      weight    NUMERIC
    );
    CREATE TABLE IF NOT EXISTS prode_matches (
      id         SERIAL PRIMARY KEY,
      home       TEXT,
      away       TEXT,
      home_flag  TEXT DEFAULT '',
      away_flag  TEXT DEFAULT '',
      match_date TEXT,
      time       TEXT DEFAULT '',
      venue      TEXT DEFAULT '',
      group_name TEXT,
      home_score INTEGER,
      away_score INTEGER
    );
    CREATE TABLE IF NOT EXISTS prode_predictions (
      id         SERIAL PRIMARY KEY,
      username   TEXT,
      match_id   INTEGER REFERENCES prode_matches(id),
      result     TEXT,
      home_score INTEGER,
      away_score INTEGER,
      submitted  BOOLEAN DEFAULT false
    );
  `);
 
  // Migraciones para DBs ya existentes
  const alterQueries = [
    "ALTER TABLE prode_matches     ADD COLUMN IF NOT EXISTS home_flag  TEXT DEFAULT ''",
    "ALTER TABLE prode_matches     ADD COLUMN IF NOT EXISTS away_flag  TEXT DEFAULT ''",
    "ALTER TABLE prode_matches     ADD COLUMN IF NOT EXISTS time       TEXT DEFAULT ''",
    "ALTER TABLE prode_matches     ADD COLUMN IF NOT EXISTS venue      TEXT DEFAULT ''",
    "ALTER TABLE prode_predictions ADD COLUMN IF NOT EXISTS result     TEXT",
    "ALTER TABLE users             ADD COLUMN IF NOT EXISTS status     TEXT DEFAULT 'pending'",
  ];
  for (const q of alterQueries) {
    await pool.query(q).catch(() => {});
  }
 
  await pool.query("UPDATE users SET status = 'active' WHERE role = 'admin'").catch(() => {});
 
  const { rows } = await pool.query("SELECT id FROM users WHERE username = 'admin'");
  if (rows.length === 0) {
    const bcrypt = require('bcryptjs');
    const hash   = bcrypt.hashSync(process.env.ADMIN_DEFAULT_PASS || 'admin123', 10);
    await pool.query(
      "INSERT INTO users (username, password, display_name, role, status, color) VALUES ('admin', $1, 'Administrador', 'admin', 'active', '#6CACE4')",
      [hash]
    );
    console.log('✅ Admin creado');
  }
 
  console.log('✅ Base de datos lista');
}
 
initDB().catch(err => {
  console.error('❌ Error iniciando DB:', err.message || err);
  process.exit(1);
});
 
module.exports = pool;
