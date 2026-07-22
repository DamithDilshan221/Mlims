// ============================================================================
// MLIMS — Admin Routes
//
// Manages users, roles, and staff profiles.
// Only accessible by admin_role.
// ============================================================================

const express = require('express');
const bcrypt = require('bcryptjs');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const { validateBody, validateQuery, validateParams } = require('../middleware/validate');
const { paginationQuery, idParam } = require('../validators/commonSchemas');
const { createUserSchema } = require('../validators/authSchemas');
const { getPool } = require('../db/pools');
const { withTransaction, withClient } = require('../db/transaction');
const userRepo = require('../repositories/userRepository');
const staffRepo = require('../repositories/staffRepository');
const { exec } = require('child_process');
const { z } = require('zod');

const router = express.Router();
router.use(authenticate);
router.use(requireRole('admin'));

// ── Users ──────────────────────────────────────────────────────────────────

router.get('/users', validateQuery(paginationQuery), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withClient(pool, async (client) => {
      const users = await userRepo.listAll(client, req.query.limit, req.query.offset);
      res.json(users);
    });
  } catch (err) {
    next(err);
  }
});

router.post('/users', validateBody(createUserSchema), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    const { roleId, username, password } = req.body;
    
    // Hash password at the application layer using bcrypt
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);
    
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const user = await userRepo.create(client, { roleId, username, passwordHash });
      res.status(201).json(user);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /admin/users/:id
 * Soft-deletes user via sp_deactivate_user, which transactionally notifies admins.
 */
router.delete('/users/:id', validateParams(idParam), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      await userRepo.deactivateUser(client, req.params.id);
      res.json({ message: 'User deactivated successfully.' });
    });
  } catch (err) {
    next(err);
  }
});

// ── Staff ──────────────────────────────────────────────────────────────────

const staffSchema = z.object({
  userId: z.number().positive(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  designation: z.string().max(100).optional().nullable(),
  contactNo: z.string().max(20).optional().nullable(),
  slmcRegNo: z.string().max(50).optional().nullable(),
});

router.get('/staff', validateQuery(paginationQuery), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withClient(pool, async (client) => {
      const staff = await staffRepo.listAll(client, req.query.limit, req.query.offset);
      res.json(staff);
    });
  } catch (err) {
    next(err);
  }
});

router.post('/staff', validateBody(staffSchema), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const staff = await staffRepo.create(client, req.body);
      res.status(201).json(staff);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /admin/backup
 * Enqueues the backup script. (Returns 202 immediately to avoid blocking).
 */
router.post('/backup', async (req, res, next) => {
  try {
    exec('echo "Simulating backup..."', (error) => {
      if (error) {
        console.error('Backup failed:', error);
        const pool = getPool('admin');
        pool.query(
          `INSERT INTO audit_logs (user_id, table_name, action_type, new_payload) 
           VALUES ($1, 'SYSTEM_BACKUP', 'BACKUP_FAILED', '{"error": "Simulated failure"}')`,
          [req.user.user_id]
        ).catch(e => console.error(e));
        return;
      }
      
      const pool = getPool('admin');
      pool.query(
        `INSERT INTO audit_logs (user_id, table_name, action_type, new_payload) 
         VALUES ($1, 'SYSTEM_BACKUP', 'BACKUP_COMPLETED', '{"status": "Success", "size": "15MB"}')`,
        [req.user.user_id]
      ).catch(e => console.error(e));
    });

    res.status(202).json({ message: "Backup enqueued." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
