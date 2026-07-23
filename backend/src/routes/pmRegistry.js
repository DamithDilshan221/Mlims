const express = require('express');
const authenticate = require('../middleware/authenticate');
const { getPool } = require('../db/pools');
const { withTransaction } = require('../db/transaction');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM v_pm_registry ORDER BY date_of_pm DESC`
      );
      res.json(rows);
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
