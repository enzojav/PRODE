// ============================================================
//  middleware/auth.js — Verificación de JWT y roles
// ============================================================

const jwt = require('jsonwebtoken');

/**
 * requireAuth — verifica que el request tenga un JWT válido.
 * Adjunta el payload del token a req.user.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, username, role, displayName }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

/**
 * requireAdmin — solo deja pasar a usuarios con role === 'admin'.
 * Siempre usar después de requireAuth.
 */
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
