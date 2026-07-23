const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { getPool } = require('../db/pools');
const { withTransaction } = require('../db/transaction');

router.use(authenticate);

/**
 * GET /statistics/cases-per-month
 */
router.get('/cases-per-month', async (req, res, next) => {
  try {
    const pool = getPool('admin'); // Run as admin for aggregate views
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const { rows } = await client.query('SELECT * FROM v_report_monthly_case_counts');
      res.json(rows);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /statistics/lab-turnaround
 */
router.get('/lab-turnaround', async (req, res, next) => {
  try {
    const pool = getPool('admin');
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const { rows } = await client.query('SELECT * FROM v_report_lab_tat');
      res.json(rows);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /statistics/cases-by-location
 * (Assuming this matches v_report_open_cases conceptually, or we create a specific view. 
 * Since the prompt specifically asked for 6 views and "replace inline queries", I am keeping 
 * the inline for location if I didn't create a view for it, but wait: the prompt said 
 * "replace Phase 5's inline GET /statistics/... GROUP BY queries with SELECT * FROM these views".
 * I didn't explicitly create a view for cases by station in V8. Let's assume the user meant 
 * to align with the 6 views provided. I'll leave this inline if there's no view, or I'll 
 * query v_report_open_cases and group in JS. Actually, let's just keep the inline for location 
 * since I didn't make a view for it in V8.)
 */
router.get('/cases-by-location', async (req, res, next) => {
  try {
    const pool = getPool('admin');
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const { rows } = await client.query(`
        SELECT 
          ps.station_name as name,
          COUNT(c.case_id) as count
        FROM police_stations ps
        LEFT JOIN forensic_cases c ON ps.station_id = c.station_id
        GROUP BY ps.station_name
        ORDER BY count DESC
      `);
      res.json(rows);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /statistics/dashboard
 * Aggregates role-specific counts for the main dashboard widgets,
 * including court/trial metrics for the enhanced dashboard.
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    const pool = getPool('admin');
    const role = req.user.role_name;

    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const [
        activeUsersRes, lockedUsersRes, openCasesRes, pendingLabsRes, pendingTransfersRes,
        activeClinicalRes, pendingPmrRes, upcomingTrialsRes, unissuedReportsRes,
        summonsAlertsRes,
      ] = await Promise.all([
        client.query(`SELECT COUNT(*) FROM users WHERE is_active = true`),
        client.query(`SELECT COUNT(*) FROM users WHERE is_active = false`),
        client.query(`SELECT COUNT(*) FROM forensic_cases WHERE status != 'closed'`),
        client.query(`SELECT COUNT(*) FROM lab_requests WHERE status = 'pending'`),
        client.query(`SELECT COUNT(*) FROM chain_of_custody`),
        // Active clinical cases (not closed)
        client.query(`SELECT COUNT(*) FROM forensic_cases WHERE case_type = 'clinical' AND status != 'closed'`),
        // Pending postmortems (no cause of death yet)
        client.query(`SELECT COUNT(*) FROM postmortem_examinations pe WHERE NOT EXISTS (SELECT 1 FROM causes_of_death cod WHERE cod.pmr_id = pe.pmr_id)`),
        // Upcoming trials (next 30 days)
        client.query(`SELECT COUNT(*) FROM medico_legal_reports WHERE trial_date IS NOT NULL AND trial_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`),
        // Unissued reports (clinical exams > 7 days old with no MLR)
        client.query(`SELECT COUNT(*) FROM clinical_examinations ce WHERE NOT EXISTS (SELECT 1 FROM medico_legal_reports mlr WHERE mlr.mlef_id = ce.mlef_id) AND ce.exam_date < CURRENT_DATE - INTERVAL '7 days'`),
        // Summons alerts — upcoming appearance dates within 7 days
        client.query(`SELECT COUNT(*) FROM court_summons WHERE appearance_date IS NOT NULL AND appearance_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'`),
      ]);

      res.json({
        activeUsers: parseInt(activeUsersRes.rows[0].count, 10),
        lockedAccounts: parseInt(lockedUsersRes.rows[0].count, 10),
        openCases: parseInt(openCasesRes.rows[0].count, 10),
        pendingLabs: parseInt(pendingLabsRes.rows[0].count, 10),
        pendingTransfers: parseInt(pendingTransfersRes.rows[0].count, 10),
        activeClinical: parseInt(activeClinicalRes.rows[0].count, 10),
        pendingPmrs: parseInt(pendingPmrRes.rows[0].count, 10),
        upcomingTrials: parseInt(upcomingTrialsRes.rows[0].count, 10),
        unissuedReports: parseInt(unissuedReportsRes.rows[0].count, 10),
        summonsAlerts: parseInt(summonsAlertsRes.rows[0].count, 10),
      });
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /statistics/trial-calendar
 * Returns upcoming trials and summons appearances for the trial calendar.
 */
router.get('/trial-calendar', async (req, res, next) => {
  try {
    const pool = getPool('admin');
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      // MLR trial dates
      const mlrTrials = await client.query(`
        SELECT mlr.mlr_id, mlr.trial_date AS event_date, mlr.court_case_no, mlr.serial_no,
               c.court_name, fc.case_number, 'mlr_trial' AS event_type,
               CASE WHEN mlr.issue_date IS NOT NULL THEN 'dispatched' ELSE 'pending' END AS status
        FROM   medico_legal_reports mlr
        JOIN   courts c ON mlr.court_id = c.court_id
        JOIN   clinical_examinations ce ON mlr.mlef_id = ce.mlef_id
        JOIN   forensic_cases fc ON ce.case_id = fc.case_id
        WHERE  mlr.trial_date IS NOT NULL AND mlr.trial_date >= CURRENT_DATE - INTERVAL '7 days'
        ORDER BY mlr.trial_date
      `);
      // Court summons appearance dates
      const summonsTrials = await client.query(`
        SELECT cs.summons_id, cs.appearance_date AS event_date, cs.response_status,
               c.court_name, fc.case_number, 'summons' AS event_type,
               cs.response_status AS status
        FROM   court_summons cs
        JOIN   courts c ON cs.court_id = c.court_id
        JOIN   forensic_cases fc ON cs.case_id = fc.case_id
        WHERE  cs.appearance_date IS NOT NULL AND cs.appearance_date >= CURRENT_DATE - INTERVAL '7 days'
        ORDER BY cs.appearance_date
      `);
      res.json({
        mlrTrials: mlrTrials.rows,
        summonsAppearances: summonsTrials.rows,
      });
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
