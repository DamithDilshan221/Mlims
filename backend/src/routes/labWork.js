// ============================================================================
// MLIMS — Lab Work Routes
// ============================================================================

const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const { validateBody, validateQuery, validateParams } = require('../middleware/validate');
const { idParam } = require('../validators/commonSchemas');
const {
  labRequestQuerySchema, labRequestSchema,
  labRequestStatusSchema, labResultFinalizeSchema
} = require('../validators/labSchemas');
const { getPool } = require('../db/pools');
const { withTransaction, withClient } = require('../db/transaction');
const repo = require('../repositories/labRepository');

const router = express.Router();
router.use(authenticate);

/**
 * GET /lab-requests
 */
router.get('/requests', validateQuery(labRequestQuerySchema), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withClient(pool, async (client) => {
      const requests = await repo.listRequests(client, req.query);
      res.json(requests);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /lab-requests/:id
 */
router.get('/requests/:id', validateParams(idParam), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withClient(pool, async (client) => {
      const request = await repo.getRequestById(client, req.params.id);
      if (!request) return res.status(404).json({ error: 'Request not found' });
      res.json(request);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /lab-requests
 */
router.post('/requests', requireRole('admin', 'forensic_staff'), validateBody(labRequestSchema), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const reqRecord = await repo.createRequest(client, req.body);
      res.status(201).json(reqRecord);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /lab-requests/:id/status
 */
router.patch('/requests/:id/status', requireRole('admin', 'forensic_staff'), validateParams(idParam), validateBody(labRequestStatusSchema), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const updated = await repo.updateRequestStatus(client, req.params.id, req.body.status);
      if (!updated) return res.status(404).json({ error: 'Request not found' });
      res.json(updated);
    });
  } catch (err) {
    next(err);
  }
});

// ── Lab Results ────────────────────────────────────────────────────────────

/**
 * GET /lab-requests/:id/result
 */
router.get('/requests/:id/result', validateParams(idParam), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withClient(pool, async (client) => {
      const result = await repo.getResultByRequestId(client, req.params.id);
      if (!result) return res.status(404).json({ error: 'Result not found' });
      res.json(result);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /lab-requests/:id/finalize
 * Atomically inserts result and sets request status to 'completed'.
 */
router.post('/requests/:id/finalize', requireRole('admin', 'forensic_staff'), validateParams(idParam), validateBody(labResultFinalizeSchema), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    const { findings, diagnosis, documentUri } = req.body;
    
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const result = await repo.finalizeResult(client, req.params.id, findings, diagnosis, documentUri);
      res.status(201).json({ result_id: result.v_result_id, message: 'Lab request finalized successfully.' });
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
