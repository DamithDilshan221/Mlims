-- ============================================================================
-- MLIMS Phase 6: Reporting Views (V8)
--
-- Formalizes the aggregate/reporting logic used by the statistics dashboard
-- into reusable database views.
-- ============================================================================

-- 1. Open/Under-Investigation Case Report
CREATE OR REPLACE VIEW v_report_open_cases AS
SELECT 
    c.case_id,
    c.case_number,
    c.case_type,
    c.incident_date,
    c.status,
    ps.station_name,
    p.full_name AS patient_name
FROM forensic_cases c
JOIN police_stations ps ON c.station_id = ps.station_id
JOIN patients p ON c.patient_id = p.patient_id
WHERE c.status IN ('open', 'under_investigation');

GRANT SELECT ON v_report_open_cases TO admin_role, auditor_role, doctor_role;

-- 2. Monthly Case Counts by Type
CREATE OR REPLACE VIEW v_report_monthly_case_counts AS
SELECT 
    TO_CHAR(DATE_TRUNC('month', incident_date), 'YYYY-MM') AS month,
    case_type,
    COUNT(*) AS count
FROM forensic_cases
GROUP BY DATE_TRUNC('month', incident_date), case_type
ORDER BY month DESC;

GRANT SELECT ON v_report_monthly_case_counts TO admin_role, auditor_role;

-- 3. Specimen Custody Gap Check (No transfer in last N days)
-- Can be parameterized in the application (e.g. interval '7 days')
CREATE OR REPLACE VIEW v_report_specimen_custody_gaps AS
SELECT 
    s.specimen_id,
    s.barcode_id,
    st.name AS specimen_type,
    s.collection_date,
    c.case_number
FROM specimens s
JOIN specimen_types st ON s.specimen_type_id = st.specimen_type_id
JOIN forensic_cases c ON s.case_id = c.case_id
WHERE NOT EXISTS (
    SELECT 1 
    FROM chain_of_custody coc
    WHERE coc.specimen_id = s.specimen_id
      AND coc.transfer_date > NOW() - INTERVAL '7 days'
);

GRANT SELECT ON v_report_specimen_custody_gaps TO admin_role, auditor_role, forensic_staff_role;

-- 4. Doctor Caseload
CREATE OR REPLACE VIEW v_report_doctor_caseload AS
SELECT 
    s.staff_id,
    s.first_name || ' ' || s.last_name AS doctor_name,
    s.slmc_reg_no,
    (SELECT COUNT(*) FROM clinical_examinations ce WHERE ce.doctor_id = s.staff_id) AS clinical_cases,
    (SELECT COUNT(*) FROM postmortem_examinations pm WHERE pm.doctor_id = s.staff_id) AS postmortem_cases
FROM staff s
JOIN users u ON s.user_id = u.user_id
JOIN roles r ON u.role_id = r.role_id
WHERE r.role_name = 'doctor_role';

GRANT SELECT ON v_report_doctor_caseload TO admin_role, auditor_role;

-- 5. Lab Turnaround Time (TAT)
CREATE OR REPLACE VIEW v_report_lab_tat AS
SELECT 
    TO_CHAR(DATE_TRUNC('month', req.request_date), 'YYYY-MM') AS month,
    AVG(res.received_date - req.request_date)::NUMERIC(10,2) AS avg_days
FROM lab_requests req
JOIN lab_results res ON req.request_id = res.request_id
WHERE res.received_date IS NOT NULL
GROUP BY DATE_TRUNC('month', req.request_date)
ORDER BY month DESC;

GRANT SELECT ON v_report_lab_tat TO admin_role, auditor_role;

-- 6. Court-Receipt Pending Queue
-- Replaces duplicate frontend logic for identifying reports awaiting court acknowledgment
CREATE OR REPLACE VIEW v_report_court_pending_queue AS
-- Clinical
SELECT 
    'clinical' AS report_type,
    ce.mlef_id AS record_id,
    c.case_number,
    mlr.issue_date AS ready_date
FROM clinical_examinations ce
JOIN forensic_cases c ON ce.case_id = c.case_id
JOIN medico_legal_reports mlr ON ce.mlef_id = mlr.mlef_id
LEFT JOIN court_receipts cr ON cr.mlr_id = mlr.mlr_id
WHERE mlr.issue_date IS NOT NULL 
  AND cr.receipt_id IS NULL
UNION ALL
-- Postmortem
SELECT 
    'postmortem' AS report_type,
    pm.pmr_id AS record_id,
    c.case_number,
    pm.date_of_pm AS ready_date
FROM postmortem_examinations pm
JOIN forensic_cases c ON pm.case_id = c.case_id
JOIN causes_of_death cod ON pm.pmr_id = cod.pmr_id
LEFT JOIN court_receipts cr ON cr.pmr_id = pm.pmr_id
WHERE cr.receipt_id IS NULL;

GRANT SELECT ON v_report_court_pending_queue TO admin_role, auditor_role, court_role;
