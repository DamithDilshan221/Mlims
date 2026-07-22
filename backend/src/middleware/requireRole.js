// ============================================================================
// MLIMS — Role-Based Access Control Middleware
//
// App-level RBAC that checks the JWT's role_name before the route executes.
// This is the FIRST layer of authorization; the SECOND layer is PostgreSQL's
// GRANTs + RLS, enforced by routing each request through the pool matching
// the user's role.
//
// Even if this middleware has a bug, the database will still reject
// unauthorized operations because the connection uses the role's pool.
// ============================================================================

/**
 * Returns middleware that allows only the listed roles.
 * Must be used AFTER the authenticate middleware (req.user must exist).
 *
 * @param  {...string} allowedRoles — e.g. 'admin', 'doctor', 'forensic_staff'
 * @returns {Function} Express middleware
 *
 * @example
 *   router.get('/patients', authenticate, requireRole('admin', 'records_clerk', 'doctor'), handler);
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role_name)) {
      return res.status(403).json({
        error: `Access denied. Required role(s): ${allowedRoles.join(', ')}. Your role: ${req.user.role_name}.`,
      });
    }

    next();
  };
}

module.exports = requireRole;
