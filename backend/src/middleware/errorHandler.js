// ============================================================================
// MLIMS — Global Error Handler
//
// Catches unhandled errors from route handlers and returns clean JSON
// responses. Translates PostgreSQL error codes into meaningful HTTP statuses
// so the client never sees raw database errors.
// ============================================================================

/**
 * Express error-handling middleware (4-arg signature).
 */
function errorHandler(err, req, res, _next) {
  // Log the full error server-side for debugging
  console.error(`[${new Date().toISOString()}] ERROR:`, err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // ── PostgreSQL error code translation ──────────────────────────────
  // See: https://www.postgresql.org/docs/current/errcodes-appendix.html
  if (err.code) {
    switch (err.code) {
      // 23505 — unique_violation
      case '23505':
        return res.status(409).json({
          error: 'A record with this value already exists.',
          detail: err.detail || undefined,
        });

      // 23503 — foreign_key_violation
      case '23503':
        return res.status(400).json({
          error: 'Referenced record does not exist.',
          detail: err.detail || undefined,
        });

      // 23514 — check_violation
      case '23514':
        return res.status(400).json({
          error: 'Data constraint violation.',
          detail: err.message || undefined,
        });

      // 42501 — insufficient_privilege (PostgreSQL GRANT denied)
      case '42501':
        return res.status(403).json({
          error: 'Database permission denied for this operation.',
        });

      // P0001 — raise_exception (from stored procedures)
      case 'P0001':
        return res.status(400).json({
          error: err.message,
        });

      default:
        // Fall through to generic handler
        break;
    }
  }

  // ── HTTP status from err.status or default 500 ─────────────────────
  const status = err.status || err.statusCode || 500;
  const message =
    status === 500 && process.env.NODE_ENV === 'production'
      ? 'Internal server error.'
      : err.message || 'Internal server error.';

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
