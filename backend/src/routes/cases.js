// ============================================================================
// MLIMS — Case Routes
// ============================================================================

const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const { validateBody, validateQuery, validateParams } = require('../middleware/validate');
const { idParam } = require('../validators/commonSchemas');
const { caseQuerySchema, registerCaseSchema, updateCaseSchema } = require('../validators/caseSchemas');
const { getPool } = require('../db/pools');
const { withTransaction, withClient } = require('../db/transaction');
const repo = require('../repositories/caseRepository');

const router = express.Router();
router.use(authenticate);

/**
 * GET /cases
 */
router.get('/', validateQuery(caseQuerySchema), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const cases = await repo.listAll(client, req.query);
      res.json(cases);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /cases/:id
 */
router.get('/:id', validateParams(idParam), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const caseRecord = await repo.getById(client, req.params.id);
      if (!caseRecord) return res.status(404).json({ error: 'Case not found' });
      res.json(caseRecord);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /cases/:id/timeline
 * Aggregates all case data into a single response.
 */
router.get('/:id/timeline', validateParams(idParam), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const timeline = await repo.getTimeline(client, req.params.id);
      if (!timeline) return res.status(404).json({ error: 'Case not found' });
      res.json(timeline);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /cases
 * Creation calls sp_register_case.
 */
router.post('/', requireRole('admin', 'records_clerk', 'police'), validateBody(registerCaseSchema), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    const { patientId, stationId, caseType, incidentDate, incidentLocation, referralSourceId } = req.body;
    
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const result = await repo.registerCase(client, patientId, stationId, caseType, incidentDate, incidentLocation, referralSourceId);
      
      // Fetch the full case to return
      const newCase = await repo.getById(client, result.p_case_id);
      res.status(201).json(newCase);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /cases/:id
 */
router.patch('/:id', requireRole('admin', 'records_clerk', 'police'), validateParams(idParam), validateBody(updateCaseSchema), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const updated = await repo.update(client, req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Case not found' });
      res.json(updated);
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
