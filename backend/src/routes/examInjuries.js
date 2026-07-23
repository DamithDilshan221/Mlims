// ============================================================================
// MLIMS — Exam Injuries Routes
// ============================================================================

const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const { validateBody, validateQuery, validateParams } = require('../middleware/validate');
const { idParam } = require('../validators/commonSchemas');
const { examInjurySchema, examInjuryUpdateSchema } = require('../validators/clinicalSchemas');
const { getPool } = require('../db/pools');
const { withTransaction, withClient } = require('../db/transaction');
const repo = require('../repositories/examInjuryRepository');
const { z } = require('zod');

const router = express.Router();

router.use(authenticate);
router.use(requireRole('admin', 'doctor'));

const parentQuery = z.object({
  mlefId: z.coerce.number().positive().optional(),
  pmrId: z.coerce.number().positive().optional(),
}).refine(data => (data.mlefId && !data.pmrId) || (!data.mlefId && data.pmrId), {
  message: "Provide exactly one of mlefId or pmrId"
});

/**
 * GET /exam-injuries?mlefId=1 OR ?pmrId=1
 */
router.get('/', validateQuery(parentQuery), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const injuries = await repo.getByExamId(client, req.query);
      res.json(injuries);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /exam-injuries
 */
router.post('/', validateBody(examInjurySchema), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const injury = await repo.create(client, req.body);
      res.status(201).json(injury);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /exam-injuries/:id
 */
router.patch('/:id', validateParams(idParam), validateBody(examInjuryUpdateSchema), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const injury = await repo.update(client, req.params.id, req.body);
      if (!injury) return res.status(404).json({ error: 'Injury not found.' });
      res.json(injury);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /exam-injuries/:id
 */
router.delete('/:id', validateParams(idParam), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const success = await repo.remove(client, req.params.id);
      if (!success) return res.status(404).json({ error: 'Injury not found.' });
      res.status(204).send();
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
