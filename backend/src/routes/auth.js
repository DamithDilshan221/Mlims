// ============================================================================
// MLIMS — Auth Routes
// ============================================================================

const express = require('express');
const bcrypt = require('bcryptjs');
const { loginLimiter } = require('../middleware/rateLimiter');
const { validateBody } = require('../middleware/validate');
const { loginSchema } = require('../validators/authSchemas');
const { getPool } = require('../db/pools');
const { withClient } = require('../db/transaction');
const userRepo = require('../repositories/userRepository');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const config = require('../config');

const router = express.Router();

const REFRESH_COOKIE_NAME = 'mlims_refresh';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.env === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * POST /auth/login
 * Validates credentials, checks for lockout, issues JWT and refresh cookie.
 */
router.post('/login', loginLimiter, validateBody(loginSchema), async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const adminPool = getPool('admin'); // Auth always runs against admin pool

    await withClient(adminPool, async (client) => {
      const user = await userRepo.getByUsername(client, username);
      
      if (!user) {
        // Obscure whether username or password was wrong
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      if (!user.is_active) {
        return res.status(423).json({ error: 'Account is locked or deactivated.' });
      }

      // Check DB-level brute force lockout (5 failures in 15 min)
      const failCount = await userRepo.countRecentFailures(client, user.user_id);
      if (failCount >= 5) {
        await userRepo.lockAccount(client, user.user_id);
        await userRepo.logAuthEvent(client, user.user_id, 'ACCOUNT_LOCKED', {
          reason: 'Exceeded 5 failed login attempts in 15 minutes.'
        });
        return res.status(423).json({ error: 'Account locked due to too many failed attempts.' });
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      
      if (!isValid) {
        await userRepo.logAuthEvent(client, user.user_id, 'LOGIN_FAILED', { username });
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      // Success
      await userRepo.updateLastLogin(client, user.user_id);
      await userRepo.logAuthEvent(client, user.user_id, 'LOGIN_SUCCESS', { username });

      const payload = {
        user_id: user.user_id,
        role_name: user.role_name,
        staff_id: user.staff_id, // null if not staff
      };

      const accessToken = signAccessToken(payload);
      const refreshToken = signRefreshToken({ user_id: user.user_id });

      res.cookie(REFRESH_COOKIE_NAME, refreshToken, COOKIE_OPTIONS);
      
      res.json({
        message: 'Login successful',
        accessToken,
        user: {
          id: user.user_id,
          username: user.username,
          role: user.role_name,
          staffId: user.staff_id,
        }
      });
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/refresh
 * Rotates the access token using a valid refresh token cookie.
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token provided.' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const adminPool = getPool('admin');

    await withClient(adminPool, async (client) => {
      const user = await userRepo.getById(client, decoded.user_id);
      
      if (!user || !user.is_active) {
        res.clearCookie(REFRESH_COOKIE_NAME);
        return res.status(401).json({ error: 'User not found or inactive.' });
      }

      const payload = {
        user_id: user.user_id,
        role_name: user.role_name,
        staff_id: user.staff_id,
      };

      const accessToken = signAccessToken(payload);
      res.json({ accessToken });
    });
  } catch (err) {
    res.clearCookie(REFRESH_COOKIE_NAME);
    return res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }
});

/**
 * POST /auth/logout
 * Clears the refresh token cookie.
 */
router.post('/logout', (req, res) => {
  res.clearCookie(REFRESH_COOKIE_NAME);
  res.json({ message: 'Logged out successfully.' });
});

module.exports = router;
