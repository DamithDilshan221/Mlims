// ============================================================================
// MLIMS — Postmortem Examination Routes
// ============================================================================

const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const { validateBody, validateQuery, validateParams } = require('../middleware/validate');
const { paginationQuery, idParam } = require('../validators/commonSchemas');
const {
  postmortemExamSchema, postmortemExamUpdateSchema,
  causeOfDeathSchema, causeOfDeathUpdateSchema,
  deceasedIdentificationSchema
} = require('../validators/postmortemSchemas');
const { getPool } = require('../db/pools');
const { withTransaction, withClient } = require('../db/transaction');
const repo = require('../repositories/postmortemRepository');
const { encrypt, computeSearchHash } = require('../utils/encryption');
const { z } = require('zod');

const router = express.Router();

router.use(authenticate);
router.use(requireRole('admin', 'doctor'));

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

router.post('/', validateBody(postmortemExamSchema), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    const data = { ...req.body, doctorId: req.user.staff_id };
    
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const exam = await repo.create(client, data);
      res.status(201).json(exam);
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', validateParams(idParam), validateBody(postmortemExamUpdateSchema), async (req, res, next) => {
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

// ── Causes of Death ────────────────────────────────────────────────────────

router.get('/:id/cause-of-death', validateParams(idParam), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const cod = await repo.getCauseOfDeath(client, req.params.id);
      res.json(cod || {});
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/cause-of-death', validateParams(idParam), validateBody(causeOfDeathSchema.omit({ pmrId: true })), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const cod = await repo.createCauseOfDeath(client, { ...req.body, pmrId: req.params.id });
      res.status(201).json(cod);
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/cause-of-death/:codId', validateParams(z.object({ id: z.coerce.number(), codId: z.coerce.number() })), validateBody(causeOfDeathUpdateSchema), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const cod = await repo.updateCauseOfDeath(client, req.params.codId, req.body);
      if (!cod) return res.status(404).json({ error: 'Record not found.' });
      res.json(cod);
    });
  } catch (err) {
    next(err);
  }
});

// ── Deceased Identifications ───────────────────────────────────────────────

router.get('/:id/identifications', validateParams(idParam), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const ids = await repo.getDeceasedIdentifications(client, req.params.id);
      res.json(ids); // Note: NIC ciphertext isn't decrypted here usually, depends on UI needs
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/identifications', validateParams(idParam), validateBody(deceasedIdentificationSchema.omit({ pmrId: true })), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    const data = req.body;
    
    const nicEnc = data.nic ? encrypt(data.nic) : null;
    const nicSearchHash = data.nic ? computeSearchHash(data.nic) : null;
    
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const identification = await repo.createDeceasedIdentification(client, {
        pmrId: req.params.id,
        identifierName: data.identifierName,
        identifierAddress: data.identifierAddress,
        relationship: data.relationship,
        nicEnc,
        nicSearchHash,
      });
      res.status(201).json(identification);
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
