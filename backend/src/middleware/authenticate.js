// ============================================================================
// MLIMS — JWT Authentication Middleware
//
// Verifies the Bearer token from the Authorization header, decodes the
// payload (user_id, role_name, staff_id), and attaches it to req.user.
// Subsequent middleware/routes can access req.user.role_name, etc.
// ============================================================================

const { verifyAccessToken } = require('../utils/jwt');

/**
 * Middleware that requires a valid JWT access token.
 * Attaches { user_id, role_name, staff_id } to req.user.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Provide a Bearer token.' });
  }

  const token = authHeader.slice(7); // Remove "Bearer "

  try {
    const decoded = verifyAccessToken(token);
    req.user = {
      user_id: decoded.user_id,
      role_name: decoded.role_name,
      staff_id: decoded.staff_id || null,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Access token expired. Use /auth/refresh to get a new one.' });
    }
    return res.status(401).json({ error: 'Invalid access token.' });
  }
}

module.exports = authenticate;
