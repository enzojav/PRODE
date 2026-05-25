// ============================================================
//  seed.js — Insertar datos iniciales en PostgreSQL
//  Correr UNA SOLA VEZ: node seed.js
// ============================================================
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function seed() {
  console.log('🌱 Iniciando seed...');

  // Miembros
  const members = [
    { name: 'Enzo Aguirre',    role: 'Desarrollo',      team: 'Equipo Supervisores',        avatar_color: '#6CACE4' },
    { name: 'Leonel Sanagua',  role: 'Coordinador',     team: 'Equipo Supervisores',        avatar_color: '#FFB81C' },
    { name: 'Pamela Ribero',   role: 'Supervisora',     team: 'Equipo Supervisores',        avatar_color: '#85bde8' },
    { name: 'Paulo',           role: 'Supervisor',      team: 'Equipo Coordinadores',       avatar_color: '#002470' },
    { name: 'Mariana Cruz',    role: 'Gerente',         team: 'Gerente',                    avatar_color: '#3ae8d0' },
    { name: 'Jesus Gimenez',   role: 'Coordinador',     team: 'Equipo Coordinadores',       avatar_color: '#ff8c42' },
    { name: 'Marcos Tornesse', role: 'Gerente Calidad', team: 'Gerente',                    avatar_color: '#a8d8ea' },
    { name: 'Belen deluca',    role: 'Supervisora',     team: 'Equipo Coordinador Calidad', avatar_color: '#43e8b0' },
  ];

  // Verificar si ya hay miembros
  const { rows: existing } = await pool.query('SELECT COUNT(*) as c FROM members');
  if (parseInt(existing[0].c) > 0) {
    console.log(`⚠️  Ya hay ${existing[0].c} miembros en la DB, saltando seed de miembros.`);
  } else {
    for (const m of members) {
      await pool.query(
        'INSERT INTO members (name, role, team, avatar_color) VALUES ($1, $2, $3, $4)',
        [m.name, m.role, m.team, m.avatar_color]
      );
    }
    console.log(`✅ ${members.length} miembros insertados`);
  }

  // Noticias iniciales
  const { rows: existingNews } = await pool.query('SELECT COUNT(*) as c FROM news');
  if (parseInt(existingNews[0].c) > 0) {
    console.log(`⚠️  Ya hay noticias, saltando.`);
  } else {
    const news = [
      { title: 'Se perdio un tupper en el 2do de Agustin Pereyra', body: 'Todos los supervisores y operadores a buscar el tupper', category: 'Calidad', emoji: '✅', author: 'Marcos Tornesse' },
      { title: 'Inscripciones a capacitación', body: 'Jueves de capacitación, hay medialunas', category: 'Capacitación', emoji: '🗣️', author: 'Enzo Aguirre' },
      { title: 'Viernes de dinamica', body: 'Dia de la empanada Australiana', category: 'Gestión', emoji: '📋', author: 'Laura Gómez' },
      { title: 'Score Balance', body: 'Venimos atrasadisimos estamos al horno', category: 'Calidad', emoji: '⭐', author: 'Ana López' },
    ];
    for (const n of news) {
      await pool.query(
        'INSERT INTO news (title, body, category, emoji, author) VALUES ($1,$2,$3,$4,$5)',
        [n.title, n.body, n.category, n.emoji, n.author]
      );
    }
    console.log(`✅ ${news.length} noticias insertadas`);
  }

  console.log('✅ Seed completado');
  await pool.end();
}

seed().catch(e => { console.error('❌ Error en seed:', e.message); process.exit(1); });
