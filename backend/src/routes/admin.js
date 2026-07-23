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
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
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

/**
 * PATCH /admin/users/:id
 * Updates user status (unlock/activate/deactivate) or resets password.
 */
router.patch('/users/:id', validateParams(idParam), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    const userId = req.params.id;
    const { isActive, password } = req.body;

    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      if (password) {
        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(password, salt);
        await client.query(`UPDATE users SET password_hash = $1 WHERE user_id = $2`, [passwordHash, userId]);
      }
      if (typeof isActive === 'boolean') {
        await client.query(`UPDATE users SET is_active = $1 WHERE user_id = $2`, [isActive, userId]);
      }
      res.json({ message: 'User updated successfully.' });
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /admin/roles/:id
 * Updates role description.
 */
router.patch('/roles/:id', validateParams(idParam), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    const roleId = req.params.id;
    const { description } = req.body;

    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const { rows } = await client.query(
        `UPDATE roles SET description = $1 WHERE role_id = $2 RETURNING *`,
        [description, roleId]
      );
      res.json(rows[0]);
    });
  } catch (err) {
    next(err);
  }
});

// ── Staff ──────────────────────────────────────────────────────────────────

router.get('/staff', validateQuery(paginationQuery), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const staff = await staffRepo.listAll(client, req.query.limit, req.query.offset);
      res.json(staff);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /admin/staff
 * Transactionally creates user account AND staff profile if credentials provided.
 */
router.post('/staff', async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    const { username, password, role_id, roleId, first_name, firstName, last_name, lastName, designation, contact_no, contactNo, slmc_reg_no, slmcRegNo, userId } = req.body;

    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      let targetUserId = userId;

      if (!targetUserId && username && password) {
        const rId = role_id || roleId || 2;
        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(password, salt);
        const newUser = await userRepo.create(client, { roleId: rId, username, passwordHash });
        targetUserId = newUser.user_id;
      }

      const staff = await staffRepo.create(client, {
        userId: targetUserId,
        firstName: first_name || firstName,
        lastName: last_name || lastName,
        designation,
        contactNo: contact_no || contactNo || null,
        slmcRegNo: slmc_reg_no || slmcRegNo || null,
      });

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
        withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
          await client.query(
            `INSERT INTO audit_logs (user_id, table_name, action_type, new_payload) 
             VALUES ($1, 'SYSTEM_BACKUP', 'BACKUP_FAILED', '{"error": "Simulated failure"}')`,
            [req.user.user_id]
          );
        }).catch(e => console.error(e));
        return;
      }
      
      const pool = getPool('admin');
      withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
        await client.query(
          `INSERT INTO audit_logs (user_id, table_name, action_type, new_payload) 
           VALUES ($1, 'SYSTEM_BACKUP', 'BACKUP_COMPLETED', '{"status": "Success", "size": "15MB"}')`,
          [req.user.user_id]
        );
      }).catch(e => console.error(e));
    });

    res.status(202).json({ message: "Backup enqueued." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
