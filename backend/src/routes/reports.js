// ============================================================================
// MLIMS — Report Routes
// ============================================================================

const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const { validateBody, validateQuery, validateParams } = require('../middleware/validate');
const { paginationQuery, idParam } = require('../validators/commonSchemas');
const { mlrSchema, mlrUpdateSchema, courtReceiptSchema } = require('../validators/reportSchemas');
const { getPool } = require('../db/pools');
const { withTransaction, withClient } = require('../db/transaction');
const repo = require('../repositories/reportRepository');

const router = express.Router();
router.use(authenticate);

// ── Medico-Legal Reports (MLR) ─────────────────────────────────────────────

router.get('/mlr', validateQuery(paginationQuery), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withClient(pool, async (client) => {
      const mlrs = await repo.listMLRs(client, req.query.limit, req.query.offset);
      res.json(mlrs);
    });
  } catch (err) {
    next(err);
  }
});

router.get('/mlr/:id', validateParams(idParam), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withClient(pool, async (client) => {
      const mlr = await repo.getMLRById(client, req.params.id);
      if (!mlr) return res.status(404).json({ error: 'MLR not found' });
      res.json(mlr);
    });
  } catch (err) {
    next(err);
  }
});

router.post('/mlr', requireRole('admin', 'doctor'), validateBody(mlrSchema), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const mlr = await repo.createMLR(client, req.body);
      res.status(201).json(mlr);
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/mlr/:id', requireRole('admin', 'doctor'), validateParams(idParam), validateBody(mlrUpdateSchema), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const mlr = await repo.updateMLR(client, req.params.id, req.body);
      if (!mlr) return res.status(404).json({ error: 'MLR not found' });
      res.json(mlr);
    });
  } catch (err) {
    next(err);
  }
});

// ── Court Receipts ─────────────────────────────────────────────────────────

router.get('/court-receipts', validateQuery(paginationQuery), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withClient(pool, async (client) => {
      const receipts = await repo.listReceipts(client, req.query.limit, req.query.offset);
      res.json(receipts);
    });
  } catch (err) {
    next(err);
  }
});

router.get('/court-receipts/:id', validateParams(idParam), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withClient(pool, async (client) => {
      const receipt = await repo.getReceiptById(client, req.params.id);
      if (!receipt) return res.status(404).json({ error: 'Receipt not found' });
      res.json(receipt);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /reports/court-receipts
 * Issues a receipt via sp_issue_court_receipt (XOR validation).
 */
router.post('/court-receipts', requireRole('admin', 'court'), validateBody(courtReceiptSchema), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    const { courtId, mlrId, pmrId, trialDate, registrarSign } = req.body;
    
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const result = await repo.issueCourtReceipt(client, courtId, mlrId, pmrId, trialDate, registrarSign);
      res.status(201).json({ receipt_id: result.v_receipt_id });
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
