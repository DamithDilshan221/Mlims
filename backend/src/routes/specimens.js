// ============================================================================
// MLIMS — Specimen & Custody Routes
// ============================================================================

const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const { validateBody, validateQuery, validateParams } = require('../middleware/validate');
const { paginationQuery, idParam } = require('../validators/commonSchemas');
const { specimenSchema, specimenUpdateSchema, custodyTransferSchema } = require('../validators/specimenSchemas');
const { getPool } = require('../db/pools');
const { withTransaction, withClient } = require('../db/transaction');
const specimenRepo = require('../repositories/specimenRepository');
const custodyRepo = require('../repositories/custodyRepository');

const router = express.Router();
router.use(authenticate);

/**
 * GET /specimens
 */
router.get('/', validateQuery(paginationQuery), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withClient(pool, async (client) => {
      const specimens = await specimenRepo.listAll(client, req.query.limit, req.query.offset);
      res.json(specimens);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /specimens/:id
 */
router.get('/:id', validateParams(idParam), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withClient(pool, async (client) => {
      const sp = await specimenRepo.getById(client, req.params.id);
      if (!sp) return res.status(404).json({ error: 'Specimen not found' });
      res.json(sp);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /specimens
 */
router.post('/', requireRole('admin', 'forensic_staff'), validateBody(specimenSchema), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const sp = await specimenRepo.create(client, req.body);
      res.status(201).json(sp);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /specimens/:id
 */
router.patch('/:id', requireRole('admin', 'forensic_staff'), validateParams(idParam), validateBody(specimenUpdateSchema), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const sp = await specimenRepo.update(client, req.params.id, req.body);
      if (!sp) return res.status(404).json({ error: 'Specimen not found' });
      res.json(sp);
    });
  } catch (err) {
    next(err);
  }
});

// ── Chain of Custody ───────────────────────────────────────────────────────

/**
 * GET /specimens/:id/custody
 */
router.get('/:id/custody', validateParams(idParam), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withClient(pool, async (client) => {
      const chain = await custodyRepo.getBySpecimenId(client, req.params.id);
      res.json(chain);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /specimens/:id/custody
 * Appends a transfer via sp_add_custody_transfer.
 */
router.post('/:id/custody', requireRole('admin', 'forensic_staff'), validateParams(idParam), validateBody(custodyTransferSchema), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    const { transferredTo, purpose, receiptUri } = req.body;
    
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const result = await custodyRepo.addTransfer(
        client, 
        req.params.id, 
        req.user.staff_id, // Acting forensic staff
        transferredTo, 
        purpose, 
        receiptUri
      );
      res.status(201).json({ custody_id: result.v_custody_id });
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
