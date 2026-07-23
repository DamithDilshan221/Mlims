// ============================================================================
// MLIMS — Lookup Routes
// ============================================================================

const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const { getPool } = require('../db/pools');
const { withTransaction, withClient } = require('../db/transaction');
const repo = require('../repositories/lookupRepository');

const router = express.Router();
router.use(authenticate);

// List of lookup tables we expose
const LOOKUP_TABLES = [
  'police_stations',
  'courts',
  'injury_types',
  'weapon_types',
  'specimen_types',
  'roles'
];

/**
 * GET /lookups/:table
 * Read-only access for all authenticated users.
 */
router.get('/:table', async (req, res, next) => {
  try {
    const table = req.params.table.replace(/-/g, '_'); // map url slug to table name
    if (!LOOKUP_TABLES.includes(table)) {
      return res.status(404).json({ error: 'Lookup table not found.' });
    }

    const pool = getPool(req.user.role_name);
    await withClient(pool, async (client) => {
      const rows = await repo.getAll(client, table);
      res.json(rows);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /lookups/:table
 * Write access restricted to admin_role.
 */
router.post('/:table', requireRole('admin'), async (req, res, next) => {
  try {
    const table = req.params.table.replace(/-/g, '_');
    if (!LOOKUP_TABLES.includes(table)) {
      return res.status(404).json({ error: 'Lookup table not found.' });
    }

    const data = req.body;
    const keys = Object.keys(data).filter(k => /^[a-z_]+$/.test(k));
    const values = keys.map(k => data[k]);
    
    if (keys.length === 0) return res.status(400).json({ error: 'No valid fields provided.' });

    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const columns = keys.join(', ');

    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const { rows } = await client.query(
        `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      res.status(201).json(rows[0]);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /lookups/:table/:id
 * Update lookup table row. Restricted to admin_role.
 */
router.patch('/:table/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const table = req.params.table.replace(/-/g, '_');
    if (!LOOKUP_TABLES.includes(table)) {
      return res.status(404).json({ error: 'Lookup table not found.' });
    }

    const primaryKeyMap = {
      police_stations: 'station_id',
      courts: 'court_id',
      injury_types: 'injury_type_id',
      weapon_types: 'weapon_type_id',
      specimen_types: 'specimen_type_id',
      roles: 'role_id',
    };
    const pkCol = primaryKeyMap[table];

    const data = req.body;
    const keys = Object.keys(data).filter(k => /^[a-z_]+$/.test(k) && k !== pkCol);
    if (keys.length === 0) return res.status(400).json({ error: 'No valid fields provided to update.' });

    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = keys.map(k => data[k]);
    values.push(req.params.id);

    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const { rows } = await client.query(
        `UPDATE ${table} SET ${setClause} WHERE ${pkCol} = $${values.length} RETURNING *`,
        values
      );
      res.json(rows[0]);
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
