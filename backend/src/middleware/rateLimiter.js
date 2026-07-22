// ============================================================================
// MLIMS — Rate Limiting
//
// Global rate limit (100 req/min per IP) and a stricter limit on /auth/login
// (5 req/min per IP) to slow brute-force attempts alongside the DB-level
// lockout logic (5 failed attempts in 15 min → account locked).
// ============================================================================

const rateLimit = require('express-rate-limit');

/**
 * Global rate limiter — 100 requests per minute per IP.
 */
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

/**
 * Strict rate limiter for /auth/login — 5 requests per minute per IP.
 * Combined with the DB-level lockout (5 failures in 15 min), this provides
 * defense-in-depth against brute-force attacks.
 */
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});

module.exports = { globalLimiter, loginLimiter };
