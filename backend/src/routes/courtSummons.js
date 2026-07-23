const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const { validateBody, validateParams, validateQuery } = require('../middleware/validate');
const { idParam, paginationQuery } = require('../validators/commonSchemas');
const { courtSummonSchema, courtSummonUpdateSchema } = require('../validators/courtSummonsSchemas');
const { getPool } = require('../db/pools');
const { withTransaction, withClient } = require('../db/transaction');
const repo = require('../repositories/courtSummonsRepository');

const router = express.Router();
router.use(authenticate);

/**
 * GET /court-summons
 * Lists all summons (paginated) for the Court & Legal Desk page.
 * Uses the admin pool because the multi-table JOIN requires broader SELECT
 * grants than non-admin roles have.
 */
router.get('/', validateQuery(paginationQuery), async (req, res, next) => {
  try {
    const pool = getPool('admin');
    await withClient(pool, async (client) => {
      const summons = await repo.listAll(client, req.query.limit, req.query.offset);
      res.json(summons);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /court-summons/upcoming
 * Returns summons with upcoming appearance dates within the configurable window.
 */
router.get('/upcoming', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const pool = getPool('admin');
    await withClient(pool, async (client) => {
      const summons = await repo.listUpcoming(client, days);
      res.json(summons);
    });
  } catch (err) {
    next(err);
  }
});

router.get('/case/:caseId', validateParams(idParam), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const summons = await repo.listByCaseId(client, req.params.caseId);
      res.json(summons);
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', validateParams(idParam), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const summon = await repo.getById(client, req.params.id);
      if (!summon) return res.status(404).json({ error: 'Summons not found.' });
      res.json(summon);
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('admin', 'court'), validateBody(courtSummonSchema), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const summon = await repo.create(client, req.body);
      res.status(201).json(summon);
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireRole('admin', 'court'), validateParams(idParam), validateBody(courtSummonUpdateSchema), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const summon = await repo.update(client, req.params.id, req.body);
      if (!summon) return res.status(404).json({ error: 'Summons not found.' });
      res.json(summon);
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
