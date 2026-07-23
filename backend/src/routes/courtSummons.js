const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const { validateBody, validateParams } = require('../middleware/validate');
const { idParam } = require('../validators/commonSchemas');
const { courtSummonSchema, courtSummonUpdateSchema } = require('../validators/courtSummonsSchemas');
const { getPool } = require('../db/pools');
const { withTransaction } = require('../db/transaction');
const repo = require('../repositories/courtSummonsRepository');

const router = express.Router();
router.use(authenticate);

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
