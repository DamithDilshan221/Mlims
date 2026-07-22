// ============================================================================
// MLIMS — JWT Helpers
//
// Short-lived access tokens (15 min) and longer-lived refresh tokens (7 days).
// Access tokens travel in the Authorization header; refresh tokens live in an
// httpOnly cookie that the browser sends automatically.
// ============================================================================

const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Sign a short-lived access token.
 * Payload: { user_id, role_name, staff_id }
 */
function signAccessToken(payload) {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiry,
  });
}

/**
 * Sign a longer-lived refresh token.
 * Payload: { user_id }
 */
function signRefreshToken(payload) {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiry,
  });
}

/**
 * Verify and decode an access token.
 * @returns {object} decoded payload
 * @throws {jwt.JsonWebTokenError | jwt.TokenExpiredError}
 */
function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret);
}

/**
 * Verify and decode a refresh token.
 * @returns {object} decoded payload
 * @throws {jwt.JsonWebTokenError | jwt.TokenExpiredError}
 */
function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
