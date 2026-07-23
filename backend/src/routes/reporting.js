const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { getPool } = require('../db/pools');
const { withTransaction } = require('../db/transaction');
const pdfGen = require('../utils/pdfGenerator');

router.use(authenticate);

router.get('/daily', async (req, res, next) => {
  try {
    const pool = getPool('admin');
    const { date } = req.query;
    const reportDate = date || new Date().toISOString().slice(0, 10);

    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const [summaryRes, detailsRes, pendingLabsRes] = await Promise.all([
        client.query(`
          SELECT
            COUNT(*)::int AS total_cases,
            COUNT(*) FILTER (WHERE fc.case_type = 'clinical')::int AS clinical_count,
            COUNT(*) FILTER (WHERE fc.case_type = 'postmortem')::int AS autopsy_count
          FROM forensic_cases fc
          WHERE fc.incident_date = $1
        `, [reportDate]),
        client.query(`
          SELECT
            fc.case_number, fc.case_type, fc.status, fc.incident_date,
            fc.incident_location, fc.death_category,
            p.full_name AS patient_name,
            ps.station_name, ps.area AS station_area,
            ce.mlef_id, ce.exam_date, ce.exam_time,
            pe.pmr_id, pe.date_of_pm, pe.time_of_pm, pe.manner_of_death,
            pe.authorization_type,
            COALESCE(ce.doctor_id, pe.doctor_id) AS doctor_id,
            s.first_name || ' ' || s.last_name AS doctor_name,
            mlr.mlr_id, mlr.issue_date AS mlr_issue_date,
            cr.receipt_id AS court_receipt_id
          FROM forensic_cases fc
          JOIN patients p ON fc.patient_id = p.patient_id
          JOIN police_stations ps ON fc.station_id = ps.station_id
          LEFT JOIN clinical_examinations ce ON ce.case_id = fc.case_id
          LEFT JOIN postmortem_examinations pe ON pe.case_id = fc.case_id
          LEFT JOIN staff s ON s.staff_id = COALESCE(ce.doctor_id, pe.doctor_id)
          LEFT JOIN medico_legal_reports mlr ON mlr.mlef_id = ce.mlef_id
          LEFT JOIN court_receipts cr ON (cr.mlr_id = mlr.mlr_id OR cr.pmr_id = pe.pmr_id)
          WHERE fc.incident_date = $1
          ORDER BY COALESCE(ce.exam_time, pe.time_of_pm, '00:00:00'::time) ASC
        `, [reportDate]),
        client.query(`
          SELECT COUNT(*)::int AS count
          FROM lab_requests lr
          JOIN specimens sp ON lr.specimen_id = sp.specimen_id
          JOIN forensic_cases fc ON sp.case_id = fc.case_id
          WHERE fc.incident_date = $1 AND lr.status = 'pending'
        `, [reportDate]),
      ]);

      res.json({
        reportDate,
        summary: summaryRes.rows[0],
        details: detailsRes.rows,
        pendingLabs: pendingLabsRes.rows[0].count,
      });
    });
  } catch (err) {
    next(err);
  }
});

router.get('/monthly', async (req, res, next) => {
  try {
    const pool = getPool('admin');
    const { year, month } = req.query;
    const reportYear = year || new Date().getFullYear();
    const reportMonth = month || String(new Date().getMonth() + 1).padStart(2, '0');

    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const [kpiRes, breakdownRes, viewRes] = await Promise.all([
        client.query(`
          SELECT
            COUNT(*)::int AS total_admissions,
            COUNT(*) FILTER (WHERE fc.case_type = 'clinical')::int AS clinical_count,
            COUNT(*) FILTER (WHERE fc.case_type = 'postmortem')::int AS autopsy_count,
            COUNT(mlr.mlr_id)::int AS mlr_issued,
            COUNT(pe.pmr_id)::int AS autopsies_conducted,
            COUNT(cr.receipt_id)::int AS court_dispatches
          FROM forensic_cases fc
          LEFT JOIN clinical_examinations ce ON ce.case_id = fc.case_id
          LEFT JOIN postmortem_examinations pe ON pe.case_id = fc.case_id
          LEFT JOIN medico_legal_reports mlr ON mlr.mlef_id = ce.mlef_id
          LEFT JOIN court_receipts cr ON (cr.mlr_id = mlr.mlr_id OR cr.pmr_id = pe.pmr_id)
          WHERE EXTRACT(YEAR FROM fc.incident_date) = $1
            AND EXTRACT(MONTH FROM fc.incident_date) = $2
        `, [reportYear, reportMonth]),
        client.query(`
          SELECT
            COALESCE(ce.referral_category, 'Unclassified') AS category,
            COUNT(*) FILTER (WHERE fc.case_type = 'clinical')::int AS clinical_count,
            COUNT(*) FILTER (WHERE fc.case_type = 'postmortem')::int AS autopsy_count,
            COUNT(*)::int AS total_volume
          FROM forensic_cases fc
          LEFT JOIN clinical_examinations ce ON ce.case_id = fc.case_id
          WHERE EXTRACT(YEAR FROM fc.incident_date) = $1
            AND EXTRACT(MONTH FROM fc.incident_date) = $2
          GROUP BY ce.referral_category
          ORDER BY total_volume DESC
        `, [reportYear, reportMonth]),
        client.query(`SELECT * FROM v_report_monthly_case_counts`),
      ]);

      res.json({
        year: reportYear,
        month: reportMonth,
        kpis: kpiRes.rows[0],
        breakdown: breakdownRes.rows,
        monthlyTrend: viewRes.rows,
      });
    });
  } catch (err) {
    next(err);
  }
});

router.get('/pending', async (req, res, next) => {
  try {
    const pool = getPool('admin');
    const { bottleneck, threshold } = req.query;
    const delayThreshold = parseInt(threshold, 10) || 7;

    let bottleneckFilter = '';
    const params = [delayThreshold];

    if (bottleneck && bottleneck !== 'all') {
      params.push(bottleneck);
      bottleneckFilter = `AND $2 = 
        CASE
          WHEN ce.mlef_id IS NOT NULL AND mlr.mlr_id IS NULL THEN 'pending_mlr'
          WHEN pe.pmr_id IS NOT NULL AND cod.cod_id IS NULL THEN 'pending_cod'
          WHEN pending_lab.request_id IS NOT NULL AND pending_lab.status = 'pending' THEN 'pending_lab'
          WHEN pe.pmr_id IS NOT NULL AND pending_tox.request_id IS NOT NULL AND pending_tox.status = 'pending' THEN 'pending_toxicology'
          WHEN pe.pmr_id IS NOT NULL AND pending_histo.request_id IS NOT NULL AND pending_histo.status = 'pending' THEN 'pending_histology'
          ELSE 'other'
        END`;
    }

    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const { rows } = await client.query(`
        WITH pending_lab AS (
          SELECT DISTINCT ON (sp.case_id) lr.request_id, sp.case_id, lr.status, lr.request_type
          FROM lab_requests lr
          JOIN specimens sp ON lr.specimen_id = sp.specimen_id
          WHERE lr.status = 'pending'
          ORDER BY sp.case_id, lr.request_date DESC
        ),
        pending_tox AS (
          SELECT DISTINCT ON (sp.case_id) lr.request_id, sp.case_id, lr.status
          FROM lab_requests lr
          JOIN specimens sp ON lr.specimen_id = sp.specimen_id
          WHERE lr.status = 'pending' AND lr.request_type ILIKE '%toxicol%'
          ORDER BY sp.case_id, lr.request_date DESC
        ),
        pending_histo AS (
          SELECT DISTINCT ON (sp.case_id) lr.request_id, sp.case_id, lr.status
          FROM lab_requests lr
          JOIN specimens sp ON lr.specimen_id = sp.specimen_id
          WHERE lr.status = 'pending' AND lr.request_type ILIKE '%histolog%'
          ORDER BY sp.case_id, lr.request_date DESC
        )
        SELECT
          fc.case_id, fc.case_number, fc.case_type, fc.incident_date,
          fc.status, fc.incident_location,
          p.full_name AS patient_name,
          s.first_name || ' ' || s.last_name AS doctor_name,
          (CURRENT_DATE - fc.incident_date) AS days_pending,
          CASE
            WHEN ce.mlef_id IS NOT NULL AND mlr.mlr_id IS NULL THEN 'pending_mlr'
            WHEN pe.pmr_id IS NOT NULL AND cod.cod_id IS NULL THEN 'pending_cod'
            WHEN pending_lab.request_id IS NOT NULL THEN 'pending_lab'
            WHEN pending_tox.request_id IS NOT NULL THEN 'pending_toxicology'
            WHEN pending_histo.request_id IS NOT NULL THEN 'pending_histology'
            ELSE 'other'
          END AS bottleneck_reason,
          CASE
            WHEN (CURRENT_DATE - fc.incident_date) > 14 THEN 'high'
            WHEN (CURRENT_DATE - fc.incident_date) > 7 THEN 'medium'
            ELSE 'low'
          END AS risk_level
        FROM forensic_cases fc
        JOIN patients p ON fc.patient_id = p.patient_id
        LEFT JOIN clinical_examinations ce ON ce.case_id = fc.case_id
        LEFT JOIN postmortem_examinations pe ON pe.case_id = fc.case_id
        LEFT JOIN staff s ON s.staff_id = COALESCE(ce.doctor_id, pe.doctor_id)
        LEFT JOIN medico_legal_reports mlr ON mlr.mlef_id = ce.mlef_id
        LEFT JOIN causes_of_death cod ON cod.pmr_id = pe.pmr_id
        LEFT JOIN pending_lab ON pending_lab.case_id = fc.case_id
        LEFT JOIN pending_tox ON pending_tox.case_id = fc.case_id
        LEFT JOIN pending_histo ON pending_histo.case_id = fc.case_id
        WHERE fc.status != 'closed'
          AND (CURRENT_DATE - fc.incident_date) >= $1
          ${bottleneckFilter}
        ORDER BY days_pending DESC
      `, params);

      res.json({
        threshold: delayThreshold,
        bottleneck: bottleneck || 'all',
        total: rows.length,
        cases: rows,
      });
    });
  } catch (err) {
    next(err);
  }
});

router.get('/court', async (req, res, next) => {
  try {
    const pool = getPool('admin');
    const { courtId, status, range } = req.query;
    const dayRange = parseInt(range, 10) || 30;

    let courtFilter = '';
    const params = [dayRange];
    if (courtId) {
      params.push(courtId);
      courtFilter = `AND mlr.court_id = $2`;
    }

    let statusFilter = '';
    if (status && status !== 'all') {
      if (status === 'not_dispatched') {
        statusFilter = `AND mlr.issue_date IS NULL`;
      } else if (status === 'dispatched') {
        statusFilter = `AND mlr.issue_date IS NOT NULL`;
      }
    }

    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const { rows } = await client.query(`
        SELECT
          mlr.mlr_id, mlr.trial_date, mlr.court_case_no, mlr.serial_no,
          mlr.issue_date, mlr.final_opinion,
          c.court_id, c.court_name,
          fc.case_id, fc.case_number, fc.case_type,
          ce.mlef_id,
          pe.pmr_id,
          s.first_name || ' ' || s.last_name AS doctor_name,
          cr.receipt_id, cr.received_date AS receipt_date, cr.registrar_sign,
          cs.summons_id, cs.appearance_date AS summons_date, cs.response_status AS summons_status,
          CASE WHEN mlr.issue_date IS NOT NULL THEN 'dispatched' ELSE 'pending' END AS mlr_status,
          CASE WHEN cr.receipt_id IS NOT NULL THEN 'verified' ELSE 'pending' END AS receipt_status
        FROM medico_legal_reports mlr
        JOIN courts c ON mlr.court_id = c.court_id
        JOIN clinical_examinations ce ON mlr.mlef_id = ce.mlef_id
        JOIN forensic_cases fc ON ce.case_id = fc.case_id
        LEFT JOIN postmortem_examinations pe ON pe.case_id = fc.case_id
        LEFT JOIN staff s ON s.staff_id = COALESCE(ce.doctor_id, pe.doctor_id)
        LEFT JOIN court_receipts cr ON cr.mlr_id = mlr.mlr_id
        LEFT JOIN court_summons cs ON cs.case_id = fc.case_id
        WHERE mlr.trial_date IS NOT NULL
          AND mlr.trial_date BETWEEN CURRENT_DATE AND CURRENT_DATE + ($1::text || ' days')::interval
          ${courtFilter}
          ${statusFilter}
        ORDER BY mlr.trial_date ASC
      `, params);

      const [allCourtsRes] = await Promise.all([
        client.query(`SELECT court_id, court_name FROM courts ORDER BY court_name`),
      ]);

      res.json({
        trials: rows,
        courts: allCourtsRes.rows,
      });
    });
  } catch (err) {
    next(err);
  }
});

router.get('/statistical', async (req, res, next) => {
  try {
    const pool = getPool('admin');
    const { year } = req.query;
    const reportYear = year || new Date().getFullYear();

    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const [monthlyTrendRes, codBreakdownRes, demographicsRes, monthlyViewRes] = await Promise.all([
        client.query(`
          SELECT
            EXTRACT(MONTH FROM incident_date)::int AS month_num,
            TO_CHAR(incident_date, 'Mon') AS month_label,
            COUNT(*) FILTER (WHERE case_type = 'clinical')::int AS clinical_count,
            COUNT(*) FILTER (WHERE case_type = 'postmortem')::int AS pm_count,
            COUNT(*)::int AS total
          FROM forensic_cases
          WHERE EXTRACT(YEAR FROM incident_date) = $1
          GROUP BY month_num, month_label
          ORDER BY month_num
        `, [reportYear]),
        client.query(`
          SELECT
            COALESCE(pe.manner_of_death, 'Unknown') AS cause_group,
            COUNT(*)::int AS count
          FROM postmortem_examinations pe
          JOIN forensic_cases fc ON pe.case_id = fc.case_id
          WHERE EXTRACT(YEAR FROM fc.incident_date) = $1
          GROUP BY pe.manner_of_death
          ORDER BY count DESC
        `, [reportYear]),
        client.query(`
          SELECT
            CASE
              WHEN p.age < 13 THEN '0-12'
              WHEN p.age BETWEEN 13 AND 24 THEN '13-24'
              WHEN p.age BETWEEN 25 AND 59 THEN '25-59'
              ELSE '60+'
            END AS age_group,
            COUNT(*) FILTER (WHERE p.gender = 'M')::int AS male_cases,
            COUNT(*) FILTER (WHERE p.gender = 'F')::int AS female_cases,
            COUNT(*)::int AS total_volume
          FROM forensic_cases fc
          JOIN patients p ON fc.patient_id = p.patient_id
          WHERE EXTRACT(YEAR FROM fc.incident_date) = $1
          GROUP BY age_group
          ORDER BY age_group
        `, [reportYear]),
        client.query(`SELECT * FROM v_report_monthly_case_counts`),
      ]);

      const totalCases = demographicsRes.rows.reduce((sum, r) => sum + parseInt(r.total_volume, 10), 0);
      const demographics = demographicsRes.rows.map(r => ({
        ...r,
        total_volume: parseInt(r.total_volume, 10),
        male_cases: parseInt(r.male_cases, 10),
        female_cases: parseInt(r.female_cases, 10),
        pct: totalCases > 0 ? ((parseInt(r.total_volume, 10) / totalCases) * 100).toFixed(1) : '0',
        primary_type: 'Varied',
      }));
      const totalCod = codBreakdownRes.rows.reduce((sum, r) => sum + parseInt(r.count, 10), 0);
      const causeOfDeath = codBreakdownRes.rows.map(r => ({
        ...r,
        count: parseInt(r.count, 10),
        pct: totalCod > 0 ? ((parseInt(r.count, 10) / totalCod) * 100).toFixed(1) : '0',
      }));

      res.json({
        year: reportYear,
        monthlyTrend: monthlyTrendRes.rows,
        causeOfDeath,
        demographics,
        totalCases,
      });
    });
  } catch (err) {
    next(err);
  }
});

// ── PDF Generation Endpoints ─────────────────────────────────────────────────────

router.get('/daily/pdf', async (req, res, next) => {
  try {
    const pool = getPool('admin');
    const { date } = req.query;
    const reportDate = date || new Date().toISOString().slice(0, 10);

    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const [summaryRes, detailsRes, pendingLabsRes] = await Promise.all([
        client.query(`
          SELECT COUNT(*)::int AS total_cases,
            COUNT(*) FILTER (WHERE fc.case_type = 'clinical')::int AS clinical_count,
            COUNT(*) FILTER (WHERE fc.case_type = 'postmortem')::int AS autopsy_count
          FROM forensic_cases fc WHERE fc.incident_date = $1
        `, [reportDate]),
        client.query(`
          SELECT fc.case_number, fc.case_type, fc.status, fc.incident_date,
            p.full_name AS patient_name, ps.station_name,
            ce.exam_time, pe.time_of_pm
          FROM forensic_cases fc
          JOIN patients p ON fc.patient_id = p.patient_id
          JOIN police_stations ps ON fc.station_id = ps.station_id
          LEFT JOIN clinical_examinations ce ON ce.case_id = fc.case_id
          LEFT JOIN postmortem_examinations pe ON pe.case_id = fc.case_id
          WHERE fc.incident_date = $1
          ORDER BY COALESCE(ce.exam_time, pe.time_of_pm, '00:00:00'::time) ASC
        `, [reportDate]),
        client.query(`
          SELECT COUNT(*)::int AS count
          FROM lab_requests lr JOIN specimens sp ON lr.specimen_id = sp.specimen_id
          JOIN forensic_cases fc ON sp.case_id = fc.case_id
          WHERE fc.incident_date = $1 AND lr.status = 'pending'
        `, [reportDate]),
      ]);

      const data = {
        reportDate,
        summary: summaryRes.rows[0],
        details: detailsRes.rows,
        pendingLabs: pendingLabsRes.rows[0].count,
      };
      const staffName = `${req.user.role_name.charAt(0).toUpperCase() + req.user.role_name.slice(1)} (ID: ${req.user.user_id})`;
      pdfGen.generateDailyReport(res, data, staffName);
    });
  } catch (err) { next(err); }
});

router.get('/monthly/pdf', async (req, res, next) => {
  try {
    const pool = getPool('admin');
    const { year, month } = req.query;
    const reportYear = year || new Date().getFullYear();
    const reportMonth = month || String(new Date().getMonth() + 1).padStart(2, '0');

    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const [kpiRes, breakdownRes] = await Promise.all([
        client.query(`
          SELECT COUNT(*)::int AS total_admissions,
            COUNT(*) FILTER (WHERE fc.case_type = 'clinical')::int AS clinical_count,
            COUNT(*) FILTER (WHERE fc.case_type = 'postmortem')::int AS autopsy_count,
            COUNT(mlr.mlr_id)::int AS mlr_issued,
            COUNT(pe.pmr_id)::int AS autopsies_conducted,
            COUNT(cr.receipt_id)::int AS court_dispatches
          FROM forensic_cases fc
          LEFT JOIN clinical_examinations ce ON ce.case_id = fc.case_id
          LEFT JOIN postmortem_examinations pe ON pe.case_id = fc.case_id
          LEFT JOIN medico_legal_reports mlr ON mlr.mlef_id = ce.mlef_id
          LEFT JOIN court_receipts cr ON (cr.mlr_id = mlr.mlr_id OR cr.pmr_id = pe.pmr_id)
          WHERE EXTRACT(YEAR FROM fc.incident_date) = $1 AND EXTRACT(MONTH FROM fc.incident_date) = $2
        `, [reportYear, reportMonth]),
        client.query(`
          SELECT COALESCE(ce.referral_category, 'Unclassified') AS category,
            COUNT(*) FILTER (WHERE fc.case_type = 'clinical')::int AS clinical_count,
            COUNT(*) FILTER (WHERE fc.case_type = 'postmortem')::int AS autopsy_count,
            COUNT(*)::int AS total_volume
          FROM forensic_cases fc
          LEFT JOIN clinical_examinations ce ON ce.case_id = fc.case_id
          WHERE EXTRACT(YEAR FROM fc.incident_date) = $1 AND EXTRACT(MONTH FROM fc.incident_date) = $2
          GROUP BY ce.referral_category ORDER BY total_volume DESC
        `, [reportYear, reportMonth]),
      ]);

      const data = {
        year: reportYear,
        month: reportMonth,
        kpis: kpiRes.rows[0],
        breakdown: breakdownRes.rows,
      };
      const staffName = `${req.user.role_name.charAt(0).toUpperCase() + req.user.role_name.slice(1)} (ID: ${req.user.user_id})`;
      pdfGen.generateMonthlyReport(res, data, staffName);
    });
  } catch (err) { next(err); }
});

router.get('/pending/pdf', async (req, res, next) => {
  try {
    const pool = getPool('admin');
    const { threshold } = req.query;
    const delayThreshold = parseInt(threshold, 10) || 7;

    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const { rows } = await client.query(`
        WITH pending_lab AS (
          SELECT DISTINCT ON (sp.case_id) lr.request_id, sp.case_id, lr.status
          FROM lab_requests lr JOIN specimens sp ON lr.specimen_id = sp.specimen_id
          WHERE lr.status = 'pending' ORDER BY sp.case_id, lr.request_date DESC
        )
        SELECT fc.case_number, fc.case_type, fc.incident_date, fc.status,
          p.full_name AS patient_name,
          s.first_name || ' ' || s.last_name AS doctor_name,
          (CURRENT_DATE - fc.incident_date) AS days_pending,
          CASE
            WHEN ce.mlef_id IS NOT NULL AND mlr.mlr_id IS NULL THEN 'pending_mlr'
            WHEN pe.pmr_id IS NOT NULL AND cod.cod_id IS NULL THEN 'pending_cod'
            WHEN pending_lab.request_id IS NOT NULL THEN 'pending_lab'
            ELSE 'other'
          END AS bottleneck_reason,
          CASE
            WHEN (CURRENT_DATE - fc.incident_date) > 14 THEN 'high'
            WHEN (CURRENT_DATE - fc.incident_date) > 7 THEN 'medium'
            ELSE 'low'
          END AS risk_level
        FROM forensic_cases fc
        JOIN patients p ON fc.patient_id = p.patient_id
        LEFT JOIN clinical_examinations ce ON ce.case_id = fc.case_id
        LEFT JOIN postmortem_examinations pe ON pe.case_id = fc.case_id
        LEFT JOIN staff s ON s.staff_id = COALESCE(ce.doctor_id, pe.doctor_id)
        LEFT JOIN medico_legal_reports mlr ON mlr.mlef_id = ce.mlef_id
        LEFT JOIN causes_of_death cod ON cod.pmr_id = pe.pmr_id
        LEFT JOIN pending_lab ON pending_lab.case_id = fc.case_id
        WHERE fc.status != 'closed' AND (CURRENT_DATE - fc.incident_date) >= $1
        ORDER BY days_pending DESC
      `, [delayThreshold]);

      const data = { threshold: delayThreshold, total: rows.length, cases: rows };
      const staffName = `${req.user.role_name.charAt(0).toUpperCase() + req.user.role_name.slice(1)} (ID: ${req.user.user_id})`;
      pdfGen.generatePendingReport(res, data, staffName);
    });
  } catch (err) { next(err); }
});

router.get('/court/pdf', async (req, res, next) => {
  try {
    const pool = getPool('admin');
    const { range } = req.query;
    const dayRange = parseInt(range, 10) || 30;

    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const { rows } = await client.query(`
        SELECT mlr.mlr_id, mlr.trial_date, mlr.court_case_no,
          c.court_name,
          fc.case_number,
          CASE WHEN mlr.issue_date IS NOT NULL THEN 'dispatched' ELSE 'pending' END AS mlr_status,
          CASE WHEN cr.receipt_id IS NOT NULL THEN 'verified' ELSE 'pending' END AS receipt_status
        FROM medico_legal_reports mlr
        JOIN courts c ON mlr.court_id = c.court_id
        JOIN clinical_examinations ce ON mlr.mlef_id = ce.mlef_id
        JOIN forensic_cases fc ON ce.case_id = fc.case_id
        LEFT JOIN court_receipts cr ON cr.mlr_id = mlr.mlr_id
        WHERE mlr.trial_date IS NOT NULL
          AND mlr.trial_date BETWEEN CURRENT_DATE AND CURRENT_DATE + ($1::text || ' days')::interval
        ORDER BY mlr.trial_date ASC
      `, [dayRange]);

      const data = { trials: rows };
      const staffName = `${req.user.role_name.charAt(0).toUpperCase() + req.user.role_name.slice(1)} (ID: ${req.user.user_id})`;
      pdfGen.generateCourtReport(res, data, staffName);
    });
  } catch (err) { next(err); }
});

router.get('/statistical/pdf', async (req, res, next) => {
  try {
    const pool = getPool('admin');
    const { year } = req.query;
    const reportYear = year || new Date().getFullYear();

    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const [monthlyTrendRes, codBreakdownRes, demographicsRes] = await Promise.all([
        client.query(`
          SELECT EXTRACT(MONTH FROM incident_date)::int AS month_num,
            TO_CHAR(incident_date, 'Mon') AS month_label,
            COUNT(*) FILTER (WHERE case_type = 'clinical')::int AS clinical_count,
            COUNT(*) FILTER (WHERE case_type = 'postmortem')::int AS pm_count,
            COUNT(*)::int AS total
          FROM forensic_cases
          WHERE EXTRACT(YEAR FROM incident_date) = $1
          GROUP BY month_num, month_label ORDER BY month_num
        `, [reportYear]),
        client.query(`
          SELECT COALESCE(pe.manner_of_death, 'Unknown') AS cause_group, COUNT(*)::int AS count
          FROM postmortem_examinations pe
          JOIN forensic_cases fc ON pe.case_id = fc.case_id
          WHERE EXTRACT(YEAR FROM fc.incident_date) = $1
          GROUP BY pe.manner_of_death ORDER BY count DESC
        `, [reportYear]),
        client.query(`
          SELECT CASE
            WHEN p.age < 13 THEN '0-12' WHEN p.age BETWEEN 13 AND 24 THEN '13-24'
            WHEN p.age BETWEEN 25 AND 59 THEN '25-59' ELSE '60+'
          END AS age_group,
          COUNT(*) FILTER (WHERE p.gender = 'M')::int AS male_cases,
          COUNT(*) FILTER (WHERE p.gender = 'F')::int AS female_cases,
          COUNT(*)::int AS total_volume
          FROM forensic_cases fc JOIN patients p ON fc.patient_id = p.patient_id
          WHERE EXTRACT(YEAR FROM fc.incident_date) = $1
          GROUP BY age_group ORDER BY age_group
        `, [reportYear]),
      ]);

      const totalCases = demographicsRes.rows.reduce((s, r) => s + parseInt(r.total_volume, 10), 0);
      const totalCod = codBreakdownRes.rows.reduce((s, r) => s + parseInt(r.count, 10), 0);
      const data = {
        year: reportYear,
        monthlyTrend: monthlyTrendRes.rows,
        causeOfDeath: codBreakdownRes.rows.map(r => ({ ...r, count: parseInt(r.count, 10), pct: totalCod > 0 ? ((parseInt(r.count, 10) / totalCod) * 100).toFixed(1) : '0' })),
        demographics: demographicsRes.rows.map(r => ({
          ...r, total_volume: parseInt(r.total_volume, 10),
          male_cases: parseInt(r.male_cases, 10), female_cases: parseInt(r.female_cases, 10),
          pct: totalCases > 0 ? ((parseInt(r.total_volume, 10) / totalCases) * 100).toFixed(1) : '0',
        })),
        totalCases,
      };
      const staffName = `${req.user.role_name.charAt(0).toUpperCase() + req.user.role_name.slice(1)} (ID: ${req.user.user_id})`;
      pdfGen.generateStatisticalReport(res, data, staffName);
    });
  } catch (err) { next(err); }
});

module.exports = router;
