// ============================================================================
// MLIMS — Clinical Examinations Routes
// ============================================================================

const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const { validateBody, validateQuery, validateParams } = require('../middleware/validate');
const { paginationQuery, idParam } = require('../validators/commonSchemas');
const { clinicalExamSchema, clinicalExamUpdateSchema, medicalReferralSchema, medicalReferralUpdateSchema } = require('../validators/clinicalSchemas');
const { getPool } = require('../db/pools');
const { withTransaction, withClient } = require('../db/transaction');
const repo = require('../repositories/clinicalExamRepository');

const router = express.Router();

// Only doctors (and admins) can manage clinical exams
router.use(authenticate);
router.use(requireRole('admin', 'doctor'));

/**
 * GET /clinical-examinations
 * For a doctor, RLS ensures they only see their own rows.
 */
router.get('/', validateQuery(paginationQuery), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const exams = await repo.listAll(client, req.query.limit, req.query.offset);
      res.json(exams);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /clinical-examinations/:id
 */
router.get('/:id', validateParams(idParam), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const exam = await repo.getById(client, req.params.id);
      if (!exam) return res.status(404).json({ error: 'Examination not found or access denied.' });
      res.json(exam);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /clinical-examinations
 */
router.post('/', validateBody(clinicalExamSchema), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    const data = { ...req.body, doctorId: req.user.staff_id }; // Enforce acting doctor
    
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const exam = await repo.create(client, data);
      res.status(201).json(exam);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /clinical-examinations/:id
 */
router.patch('/:id', validateParams(idParam), validateBody(clinicalExamUpdateSchema), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const exam = await repo.update(client, req.params.id, req.body);
      if (!exam) return res.status(404).json({ error: 'Examination not found or access denied.' });
      res.json(exam);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /clinical-examinations/:id/police-copy
 * Marks the MLEF as having its police copy issued, tracked via audit_logs.
 */
router.post('/:id/police-copy', validateParams(idParam), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      // Ensure the exam exists
      const exam = await repo.getById(client, req.params.id);
      if (!exam) return res.status(404).json({ error: 'Examination not found or access denied.' });
      
      await repo.issuePoliceCopy(client, req.params.id, req.user.user_id);
      res.json({ message: 'Police copy issued successfully.' });
    });
  } catch (err) {
    next(err);
  }
});

// ── Medical Referrals Sub-routes ───────────────────────────────────────────

router.get('/:id/referrals', validateParams(idParam), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const referrals = await repo.getReferralsByExamId(client, req.params.id);
      res.json(referrals);
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/referrals', validateParams(idParam), validateBody(medicalReferralSchema.omit({ mlefId: true })), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const referral = await repo.createReferral(client, { ...req.body, mlefId: req.params.id });
      res.status(201).json(referral);
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
