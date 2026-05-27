const router = require('express').Router();
const db     = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM news ORDER BY created_at DESC');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { title, body, category, emoji, author, image_url } = req.body;
  if (!title) return res.status(400).json({ error: 'El título es requerido.' });
  try {
    const { rows } = await db.query(
      'INSERT INTO news (title, body, category, emoji, author, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [title, body, category, emoji, author, image_url || null]
    );
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM news WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

router.get('/preview', requireAuth, async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL requerida.' });
  try {
    const fetch = require('node-fetch');
    const response = await fetch(url, { timeout: 5000 });
    const html = await response.text();
    
    const getTag = (prop) => {
      const match = html.match(new RegExp(`<meta[^>]*(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`, 'i'))
                 || html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`, 'i'));
      return match ? match[1] : null;
    };

    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);

    res.json({
      title:       getTag('og:title') || (titleMatch ? titleMatch[1] : null),
      description: getTag('og:description') || getTag('description'),
      image:       getTag('og:image'),
      siteName:    getTag('og:site_name'),
    });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo obtener el preview.' });
  }
});

module.exports = router;
