const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const { validateParams, validateBody } = require('../middleware/validate');
const { paginationQuery } = require('../validators/commonSchemas');
const { z } = require('zod');
const { getPool } = require('../db/pools');
const { withTransaction, withClient } = require('../db/transaction');

const router = express.Router();
router.use(authenticate);

const sanitizedString = z.string().trim().min(1).max(500);

const caseIdParam = z.object({ caseId: z.coerce.number().positive() });

// ────────────────────────────────────────────────────────────────────────────
// GET /police-hub/inquests
// Returns inquest data from postmortem_examinations + digital_assets
// Note: death_category is tracked via authorization_type on postmortem_exams
//       (police_inquest = standard, magistrate_court_order = high-profile)
// ────────────────────────────────────────────────────────────────────────────
router.get('/inquests', async (req, res, next) => {
  try {
    const pool = getPool('admin');
    await withClient(pool, async (client) => {
      const { rows } = await client.query(`
        SELECT
          pe.pmr_id, pe.case_id,
          fc.case_number, fc.case_type,
          fc.status AS case_status,
          ps.station_name, ps.area AS station_area,
          pe.inquest_no, pe.ordered_by, pe.authorization_type,
          pe.date_of_pm, pe.manner_of_death,
          CASE WHEN pe.authorization_type = 'magistrate_court_order' THEN 'high_profile'
               WHEN pe.authorization_type = 'police_inquest' THEN 'police_inquest'
               ELSE 'hospital_death' END AS death_category,
          COALESCE(da.asset_id, 0) AS has_inquest_doc,
          da.file_name AS inquest_doc_name
        FROM postmortem_examinations pe
        JOIN forensic_cases fc ON pe.case_id = fc.case_id
        JOIN police_stations ps ON fc.station_id = ps.station_id
        LEFT JOIN LATERAL (
          SELECT asset_id, file_name FROM digital_assets
          WHERE case_id = fc.case_id AND file_type = 'inquest_order'
          ORDER BY upload_date DESC LIMIT 1
        ) da ON true
        ORDER BY pe.date_of_pm DESC NULLS LAST
      `);
      res.json(rows);
    });
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /police-hub/inquests/:caseId — upload inquest order document
// ────────────────────────────────────────────────────────────────────────────
router.post('/inquests/:caseId', requireRole('admin', 'police', 'doctor'), validateParams(caseIdParam), async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const { fileName, fileUri } = req.body;
    if (!fileName || !fileUri) return res.status(400).json({ error: 'fileName and fileUri are required.' });
    const pool = getPool('admin');
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const { rows } = await client.query(
        `INSERT INTO digital_assets (case_id, file_name, file_uri, file_type)
         VALUES ($1, $2, $3, 'inquest_order')
         RETURNING *`,
        [caseId, fileName, fileUri]
      );
      res.status(201).json(rows[0]);
    });
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /police-hub/statements/:caseId — list police statements
// ────────────────────────────────────────────────────────────────────────────
router.get('/statements/:caseId', validateParams(caseIdParam), async (req, res, next) => {
  try {
    const pool = getPool('admin');
    await withClient(pool, async (client) => {
      const { rows } = await client.query(`
        SELECT da.* FROM digital_assets da
        WHERE da.case_id = $1 AND da.file_type IN ('police_statement','witness_statement','scene_notes','bht_record')
        ORDER BY da.upload_date DESC
      `, [req.params.caseId]);
      res.json(rows);
    });
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /police-hub/statements/:caseId — upload a police statement
// ────────────────────────────────────────────────────────────────────────────
const statementSchema = z.object({
  fileName: sanitizedString,
  fileUri: sanitizedString,
  statementType: z.enum(['police_statement','witness_statement','scene_notes','bht_record']),
  description: z.string().max(300).optional().nullable(),
});

router.post('/statements/:caseId', requireRole('admin', 'police'), validateParams(caseIdParam), validateBody(statementSchema), async (req, res, next) => {
  try {
    const pool = getPool('admin');
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const { rows } = await client.query(
        `INSERT INTO digital_assets (case_id, file_name, file_uri, file_type, description)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [req.params.caseId, req.body.fileName, req.body.fileUri, req.body.statementType, req.body.description || null]
      );
      res.status(201).json(rows[0]);
    });
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /police-hub/handovers — list all police copy handovers (from audit_logs)
// Note: audit_logs has new_payload (jsonb), not "details".
//       Logs are keyed by record_id = case_id (for forensic cases).
// ────────────────────────────────────────────────────────────────────────────
router.get('/handovers', async (req, res, next) => {
  try {
    const pool = getPool('admin');
    await withClient(pool, async (client) => {
      const { rows } = await client.query(`
        SELECT
          al.log_id AS handover_id,
          al.record_id AS case_id,
          fc.case_number, fc.case_type,
          ps.station_name,
          al.new_payload,
          al.changed_at AS handover_date,
          u.username AS acknowledged_by
        FROM audit_logs al
        JOIN forensic_cases fc ON al.record_id = fc.case_id AND al.table_name = 'forensic_cases'
        JOIN police_stations ps ON fc.station_id = ps.station_id
        LEFT JOIN users u ON (al.new_payload->>'acknowledged_by_user_id')::int = u.user_id
        WHERE al.action_type = 'POLICE_COPY_HANDOVER'
        ORDER BY al.changed_at DESC
      `);
      res.json(rows);
    });
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /police-hub/handovers/:caseId — log a police copy handover
// ────────────────────────────────────────────────────────────────────────────
const handoverSchema = z.object({
  documentType: z.enum(['mlef_police_copy','cod_form','pm_registry_entry']),
  officerName: sanitizedString,
  officerRank: z.string().max(50).optional().nullable(),
  officerBadge: sanitizedString,
  digitalSignatureUri: z.string().max(500).optional().nullable(),
});

router.post('/handovers/:caseId', requireRole('admin', 'doctor', 'police'), validateParams(caseIdParam), validateBody(handoverSchema), async (req, res, next) => {
  try {
    const pool = getPool('admin');
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const payload = {
        document_type: req.body.documentType,
        officer_name: req.body.officerName,
        officer_rank: req.body.officerRank || null,
        officer_badge: req.body.officerBadge,
        digital_signature_uri: req.body.digitalSignatureUri || null,
      };
      const { rows } = await client.query(
        `INSERT INTO audit_logs (table_name, action_type, record_id, user_id, new_payload)
         VALUES ('forensic_cases', 'POLICE_COPY_HANDOVER', $1, $2, $3::jsonb)
         RETURNING *`,
        [req.params.caseId, req.user.user_id, JSON.stringify(payload)]
      );
      res.status(201).json(rows[0]);
    });
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /police-hub/dashboard — police-specific statistics
// ────────────────────────────────────────────────────────────────────────────
router.get('/dashboard', async (req, res, next) => {
  try {
    const pool = getPool('admin');
    await withClient(pool, async (client) => {
      const [
        pendingStatementsRes,
        inquestOrdersRes,
        pendingMlefCopiesRes,
        uncollectedReportsRes,
        highProfileCasesRes,
        stationCountsRes,
      ] = await Promise.all([
        client.query(`SELECT COUNT(*) FROM digital_assets WHERE file_type IN ('police_statement','witness_statement','scene_notes','bht_record')`),
        client.query(`SELECT COUNT(*) FROM postmortem_examinations WHERE inquest_no IS NOT NULL`),
        client.query(`SELECT COUNT(*) FROM clinical_examinations ce WHERE NOT EXISTS (SELECT 1 FROM audit_logs al WHERE al.table_name = 'clinical_examinations' AND al.action_type = 'POLICE_COPY' AND al.record_id = ce.mlef_id)`),
        client.query(`SELECT COUNT(*) FROM audit_logs WHERE action_type = 'POLICE_COPY_HANDOVER' AND (new_payload->>'is_acknowledged')::boolean IS DISTINCT FROM true`),
        client.query(`SELECT COUNT(*) FROM postmortem_examinations WHERE authorization_type = 'magistrate_court_order'`),
        client.query(`SELECT ps.station_name, COUNT(fc.case_id) AS case_count FROM police_stations ps LEFT JOIN forensic_cases fc ON ps.station_id = fc.station_id GROUP BY ps.station_name ORDER BY case_count DESC`),
      ]);

      res.json({
        pendingStatements: parseInt(pendingStatementsRes.rows[0].count, 10),
        inquestOrdersReceived: parseInt(inquestOrdersRes.rows[0].count, 10),
        pendingMlefCopies: parseInt(pendingMlefCopiesRes.rows[0].count, 10),
        uncollectedReports: parseInt(uncollectedReportsRes.rows[0].count, 10),
        highProfileCases: parseInt(highProfileCasesRes.rows[0].count, 10),
        stationCounts: stationCountsRes.rows,
      });
    });
  } catch (err) { next(err); }
});

module.exports = router;
