const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT DEFAULT 'player',
      color TEXT DEFAULT '#6CACE4',
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS members (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT,
      team TEXT,
      avatar_color TEXT
    );
    CREATE TABLE IF NOT EXISTS news (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT,
      category TEXT,
      emoji TEXT,
      author TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS scores (
      id SERIAL PRIMARY KEY,
      member_id INTEGER REFERENCES members(id),
      period TEXT,
      category TEXT,
      value NUMERIC,
      weight NUMERIC
    );
    CREATE TABLE IF NOT EXISTS prode_matches (
      id SERIAL PRIMARY KEY,
      home TEXT,
      away TEXT,
      match_date TEXT,
      group_name TEXT,
      home_score INTEGER,
      away_score INTEGER
    );
    CREATE TABLE IF NOT EXISTS prode_predictions (
      id SERIAL PRIMARY KEY,
      username TEXT,
      match_id INTEGER REFERENCES prode_matches(id),
      home_score INTEGER,
      away_score INTEGER,
      submitted BOOLEAN DEFAULT false
    );
  `);

  const { rows } = await pool.query("SELECT id FROM users WHERE username = 'admin'");
  if (rows.length === 0) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync(process.env.ADMIN_DEFAULT_PASS || 'admin123', 10);
    await pool.query(
      "INSERT INTO users (username, password, display_name, role, color) VALUES ('admin', $1, 'Administrador', 'admin', '#6CACE4')",
      [hash]
    );
    console.log('✅ Admin creado');
  }
  console.log('✅ Base de datos lista');
}

initDB().catch(err => {
  console.error('❌ Error iniciando DB:', err.message);
  process.exit(1);
});

module.exports = pool;