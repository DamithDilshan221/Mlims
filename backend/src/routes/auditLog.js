// ============================================================================
// MLIMS — Audit Log & Notifications Routes
// ============================================================================

const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const { validateQuery, validateParams } = require('../middleware/validate');
const { paginationQuery, idParam } = require('../validators/commonSchemas');
const { getPool } = require('../db/pools');
const { withTransaction, withClient } = require('../db/transaction');
const auditRepo = require('../repositories/auditRepository');
const { z } = require('zod');

const router = express.Router();
router.use(authenticate);

// ── Audit Log ──────────────────────────────────────────────────────────────

const auditQuerySchema = paginationQuery.extend({
  userId: z.coerce.number().positive().optional(),
  table: z.string().optional(),
  action: z.string().optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
});

/**
 * GET /audit-log or GET /audit-logs
 * Only auditor and admin roles can view the audit trail.
 */
router.get(['/audit-log', '/audit-logs'], requireRole('admin', 'auditor'), validateQuery(auditQuerySchema), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withClient(pool, async (client) => {
      const logs = await auditRepo.listPaginated(client, req.query);
      res.json(logs);
    });
  } catch (err) {
    next(err);
  }
});

// ── Notifications ──────────────────────────────────────────────────────────

/**
 * GET /notifications
 * Users can only see their own notifications.
 */
router.get('/notifications', async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withClient(pool, async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM notifications WHERE user_id = $1 ORDER BY notification_id DESC`,
        [req.user.user_id]
      );
      res.json(rows);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /notifications/:id/read
 * Mark a notification as read. Validates it belongs to the user.
 */
router.patch('/notifications/:id/read', validateParams(idParam), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const { rows } = await client.query(
        `UPDATE notifications SET is_read = TRUE WHERE notification_id = $1 AND user_id = $2 RETURNING *`,
        [req.params.id, req.user.user_id]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Notification not found or access denied.' });
      }
      res.json(rows[0]);
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
