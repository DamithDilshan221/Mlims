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
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
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
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
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
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
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
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
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

// ── Convenience & Workflow Routes ──────────────────────────────────────────

/**
 * GET /reports/all
 * Returns unified report listing for both clinical and postmortem cases.
 */
router.get('/all', async (req, res, next) => {
  try {
    const pool = getPool('admin');
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const { rows } = await client.query(`SELECT * FROM v_report_open_cases ORDER BY case_id DESC`);
      res.json(rows);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /reports/clinical/:mlefId/draft
 * Upserts a draft MLR for a clinical examination.
 */
router.patch('/clinical/:mlefId/draft', requireRole('admin', 'doctor'), async (req, res, next) => {
  try {
    const mlefId = parseInt(req.params.mlefId, 10);
    const { court_id, court_case_no, serial_no, final_opinion, is_grievous_311 } = req.body;
    const pool = getPool(req.user.role_name);

    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const existing = await repo.getMLRByExamId(client, mlefId);
      let mlr;
      if (existing) {
        mlr = await repo.updateMLR(client, existing.mlr_id, {
          courtId: court_id ? parseInt(court_id, 10) : undefined,
          courtCaseNo: court_case_no,
          finalOpinion: final_opinion,
          isGrievous311: is_grievous_311,
        });
      } else {
        const generatedSerial = serial_no || `MLR-${mlefId}-${Date.now()}`;
        const courtIdNum = court_id ? parseInt(court_id, 10) : 1;
        mlr = await repo.createMLR(client, {
          mlefId,
          courtId: courtIdNum,
          courtCaseNo: court_case_no || 'PENDING',
          serialNo: generatedSerial,
          finalOpinion: final_opinion || '',
          isGrievous311: !!is_grievous_311,
        });
      }
      res.json(mlr);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /reports/clinical/:mlefId/issue
 * Marks the MLR as issued by setting issue_date = NOW().
 */
router.post('/clinical/:mlefId/issue', requireRole('admin', 'doctor'), async (req, res, next) => {
  try {
    const mlefId = parseInt(req.params.mlefId, 10);
    const pool = getPool(req.user.role_name);

    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      let existing = await repo.getMLRByExamId(client, mlefId);
      if (!existing) {
        existing = await repo.createMLR(client, {
          mlefId,
          courtId: 1,
          courtCaseNo: 'ISSUED',
          serialNo: `MLR-${mlefId}-${Date.now()}`,
          finalOpinion: 'Finalized',
          issueDate: new Date().toISOString().split('T')[0],
        });
      } else {
        existing = await repo.updateMLR(client, existing.mlr_id, {
          issueDate: new Date().toISOString().split('T')[0],
        });
      }
      res.json(existing);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /reports/:type/:id/acknowledge
 * Issues court receipt for a given report (clinical mlef_id or postmortem pmr_id).
 */
router.post('/:type/:id/acknowledge', requireRole('admin', 'court'), async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const pool = getPool(req.user.role_name);
    const numericId = parseInt(id, 10);

    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      let mlrId = null;
      let pmrId = null;

      if (type === 'clinical') {
        const mlr = await repo.getMLRByExamId(client, numericId);
        if (mlr) mlrId = mlr.mlr_id;
        else {
          const newMlr = await repo.createMLR(client, {
            mlefId: numericId,
            courtId: 1,
            courtCaseNo: 'COURT-ACK',
            serialNo: `MLR-${numericId}-${Date.now()}`,
            issueDate: new Date().toISOString().split('T')[0],
          });
          mlrId = newMlr.mlr_id;
        }
      } else {
        pmrId = numericId;
      }

      const result = await repo.issueCourtReceipt(
        client,
        1, // Default court ID
        mlrId,
        pmrId,
        new Date().toISOString().split('T')[0],
        req.user.username || 'Court Registrar'
      );

      res.json({ message: 'Receipt issued successfully', receipt_id: result.v_receipt_id });
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
