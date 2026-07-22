-- ============================================================================
-- MLIMS — Medico-Legal Information Management System
-- 04_functions_procedures.sql — Stored Procedures (Explicit Actions)
-- PostgreSQL 15+
--
-- Stored procedures are EXPLICIT ACTIONS — they must be called deliberately
-- by the application, unlike triggers which fire implicitly. This separation
-- is a key database-theory distinction:
--
--   • Triggers (03_triggers.sql) = implicit reactions to data events
--   • Procedures (this file)     = explicit operations invoked by name
--
-- Each procedure wraps a business operation that spans multiple tables or
-- requires validation logic beyond what a simple INSERT can express.
-- GRANT EXECUTE is given to relevant roles INSTEAD of raw table writes
-- where it matters, so business rules cannot be bypassed by privilege alone.
--
-- See THEORY_NOTES.md §5 for the full "implicit vs. explicit" discussion.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. sp_register_case — Atomic case registration
--
-- Validates the patient exists, generates a structured case_number
-- (CASE-YYYYMMDD-NNNN), and inserts the forensic_cases row atomically.
-- Returns the generated case_id via an OUT parameter.
-- ============================================================================

CREATE OR REPLACE FUNCTION sp_register_case(
    p_patient_id        INT,
    p_station_id        INT,
    p_case_type         VARCHAR,
    p_incident_date     DATE,
    p_incident_location VARCHAR,
    OUT p_case_id       INT
)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    v_case_number VARCHAR(30);
    v_date_part   VARCHAR(8);
    v_seq         INT;
BEGIN
    -- ── Validation ──────────────────────────────────────────────────────
    IF NOT EXISTS (SELECT 1 FROM patients WHERE patient_id = p_patient_id) THEN
        RAISE EXCEPTION 'Patient ID % does not exist.', p_patient_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM police_stations WHERE station_id = p_station_id) THEN
        RAISE EXCEPTION 'Police station ID % does not exist.', p_station_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF p_case_type NOT IN ('clinical', 'postmortem') THEN
        RAISE EXCEPTION 'Invalid case_type "%". Must be "clinical" or "postmortem".', p_case_type
            USING ERRCODE = 'check_violation';
    END IF;

    -- ── Case number generation ──────────────────────────────────────────
    -- Format: CASE-YYYYMMDD-NNNN (daily sequence, zero-padded to 4 digits)
    v_date_part := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

    SELECT COALESCE(MAX(
        SUBSTRING(case_number FROM 'CASE-' || v_date_part || '-(\d+)')::INT
    ), 0) + 1
    INTO v_seq
    FROM forensic_cases
    WHERE case_number LIKE 'CASE-' || v_date_part || '-%';

    v_case_number := 'CASE-' || v_date_part || '-' || LPAD(v_seq::TEXT, 4, '0');

    -- ── Insert ──────────────────────────────────────────────────────────
    INSERT INTO forensic_cases (
        patient_id, station_id, case_number, case_type,
        incident_date, incident_location, status
    ) VALUES (
        p_patient_id, p_station_id, v_case_number, p_case_type,
        p_incident_date, p_incident_location, 'registered'
    )
    RETURNING case_id INTO p_case_id;
END;
$$;

COMMENT ON FUNCTION sp_register_case(INT, INT, VARCHAR, DATE, VARCHAR) IS
    'Atomic case registration: validates patient/station, generates case_number, inserts row.';


-- ============================================================================
-- 2. sp_add_custody_transfer — Append-only chain of custody
--
-- Appends a new link to the chain_of_custody and atomically updates the
-- specimen's current_location. NEVER allows editing a past custody entry —
-- only inserting the next link.
--
-- forensic_staff_role gets EXECUTE on this function INSTEAD of raw INSERT
-- on chain_of_custody, so the append-only rule cannot be bypassed by
-- privilege alone.
-- ============================================================================

CREATE OR REPLACE FUNCTION sp_add_custody_transfer(
    p_specimen_id    INT,
    p_transferred_by INT,
    p_transferred_to VARCHAR,
    p_purpose        VARCHAR,
    p_receipt_uri    TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_custody_id BIGINT;
BEGIN
    -- ── Validation ──────────────────────────────────────────────────────
    IF NOT EXISTS (SELECT 1 FROM specimens WHERE specimen_id = p_specimen_id) THEN
        RAISE EXCEPTION 'Specimen ID % does not exist.', p_specimen_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM staff WHERE staff_id = p_transferred_by) THEN
        RAISE EXCEPTION 'Staff ID % does not exist.', p_transferred_by
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    -- ── Append the next link in the chain (never edits past entries) ────
    INSERT INTO chain_of_custody (
        specimen_id, transferred_by, transferred_to,
        transfer_date, purpose, receipt_uri
    ) VALUES (
        p_specimen_id, p_transferred_by, p_transferred_to,
        NOW(), p_purpose, p_receipt_uri
    )
    RETURNING custody_id INTO v_custody_id;

    -- ── Atomically update the specimen's current location ───────────────
    UPDATE specimens
    SET    current_location = p_transferred_to
    WHERE  specimen_id = p_specimen_id;

    RETURN v_custody_id;
END;
$$;

COMMENT ON FUNCTION sp_add_custody_transfer(INT, INT, VARCHAR, VARCHAR, TEXT) IS
    'Append-only custody transfer: inserts chain link + updates specimen location atomically.';


-- ============================================================================
-- 3. sp_finalize_lab_result — Insert result & flip request status
--
-- Inserts the lab_results row and updates lab_requests.status to 'completed'
-- in a single transaction. This ensures the two tables stay consistent:
-- a request cannot be marked complete without a corresponding result.
-- ============================================================================

CREATE OR REPLACE FUNCTION sp_finalize_lab_result(
    p_request_id   INT,
    p_findings     TEXT,
    p_diagnosis    TEXT,
    p_document_uri TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    v_result_id INT;
    v_status    VARCHAR;
BEGIN
    -- ── Validation ──────────────────────────────────────────────────────
    SELECT status INTO v_status
    FROM   lab_requests
    WHERE  request_id = p_request_id;

    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Lab request ID % does not exist.', p_request_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF v_status = 'completed' THEN
        RAISE EXCEPTION 'Lab request ID % is already completed. Cannot finalize twice.', p_request_id
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    IF v_status = 'rejected' THEN
        RAISE EXCEPTION 'Lab request ID % has been rejected. Cannot finalize.', p_request_id
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    -- ── Insert result ───────────────────────────────────────────────────
    INSERT INTO lab_results (
        request_id, findings, diagnosis,
        received_date, document_uri
    ) VALUES (
        p_request_id, p_findings, p_diagnosis,
        CURRENT_DATE, p_document_uri
    )
    RETURNING result_id INTO v_result_id;

    -- ── Flip request status ─────────────────────────────────────────────
    UPDATE lab_requests
    SET    status = 'completed'
    WHERE  request_id = p_request_id;

    RETURN v_result_id;
END;
$$;

COMMENT ON FUNCTION sp_finalize_lab_result(INT, TEXT, TEXT, TEXT) IS
    'Inserts lab result + flips request status to completed in one transaction.';


-- ============================================================================
-- 4. sp_deactivate_user — Soft-delete with admin notification
--
-- Sets is_active = FALSE and inserts a notification to every admin-role user,
-- wrapped in a single transaction so the status change and the notification
-- either both succeed or both roll back.
--
-- This is a soft-delete: the user row is preserved for FK integrity
-- (audit_logs, notifications reference it) but can no longer authenticate.
-- ============================================================================

CREATE OR REPLACE FUNCTION sp_deactivate_user(
    p_user_id INT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_username VARCHAR;
BEGIN
    -- ── Validation ──────────────────────────────────────────────────────
    SELECT username INTO v_username
    FROM   users
    WHERE  user_id = p_user_id;

    IF v_username IS NULL THEN
        RAISE EXCEPTION 'User ID % does not exist.', p_user_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    -- ── Deactivate ──────────────────────────────────────────────────────
    UPDATE users
    SET    is_active = FALSE
    WHERE  user_id = p_user_id;

    -- ── Notify all admin users ──────────────────────────────────────────
    -- Transaction ensures both the deactivation and all notifications
    -- either commit together or roll back together.
    INSERT INTO notifications (user_id, subject, message, due_date, is_read)
    SELECT u.user_id,
           'User Account Deactivated',
           FORMAT('User "%s" (ID: %s) has been deactivated by an administrator. '
                  'Review this action in the Audit Log if needed.',
                  v_username, p_user_id),
           CURRENT_DATE,
           FALSE
    FROM   users u
    JOIN   roles r ON u.role_id = r.role_id
    WHERE  r.role_name = 'admin'
      AND  u.is_active = TRUE;
END;
$$;

COMMENT ON FUNCTION sp_deactivate_user(INT) IS
    'Soft-deactivates a user and notifies all active admin users, transactionally.';


-- ============================================================================
-- 5. sp_issue_court_receipt — Validated receipt issuance
--
-- Validates exactly one of mlr_id/pmr_id is provided (matching the XOR
-- CHECK constraint on court_receipts), validates the referenced entities
-- exist, then inserts the receipt.
-- ============================================================================

CREATE OR REPLACE FUNCTION sp_issue_court_receipt(
    p_court_id       INT,
    p_mlr_id         INT DEFAULT NULL,
    p_pmr_id         INT DEFAULT NULL,
    p_trial_date     DATE DEFAULT NULL,
    p_registrar_sign VARCHAR DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    v_receipt_id INT;
BEGIN
    -- ── XOR Validation ──────────────────────────────────────────────────
    IF (p_mlr_id IS NOT NULL AND p_pmr_id IS NOT NULL) THEN
        RAISE EXCEPTION 'Exactly one of mlr_id or pmr_id must be provided, not both.'
            USING ERRCODE = 'check_violation';
    END IF;

    IF (p_mlr_id IS NULL AND p_pmr_id IS NULL) THEN
        RAISE EXCEPTION 'Exactly one of mlr_id or pmr_id must be provided.'
            USING ERRCODE = 'check_violation';
    END IF;

    -- ── Entity existence checks ─────────────────────────────────────────
    IF NOT EXISTS (SELECT 1 FROM courts WHERE court_id = p_court_id) THEN
        RAISE EXCEPTION 'Court ID % does not exist.', p_court_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF p_mlr_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM medico_legal_reports WHERE mlr_id = p_mlr_id) THEN
        RAISE EXCEPTION 'Medico-Legal Report ID % does not exist.', p_mlr_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF p_pmr_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM postmortem_examinations WHERE pmr_id = p_pmr_id) THEN
        RAISE EXCEPTION 'Postmortem Examination ID % does not exist.', p_pmr_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    -- ── Insert receipt ──────────────────────────────────────────────────
    INSERT INTO court_receipts (
        mlr_id, pmr_id, court_id,
        trial_date, received_date, registrar_sign
    ) VALUES (
        p_mlr_id, p_pmr_id, p_court_id,
        p_trial_date, CURRENT_DATE, p_registrar_sign
    )
    RETURNING receipt_id INTO v_receipt_id;

    RETURN v_receipt_id;
END;
$$;

COMMENT ON FUNCTION sp_issue_court_receipt(INT, INT, INT, DATE, VARCHAR) IS
    'Issues a court receipt for exactly one MLR or one postmortem exam.';


-- ============================================================================
-- 6. GRANT EXECUTE — Procedure-Gated Access
--
-- Where business rules must be enforced (e.g., append-only custody chain),
-- roles get EXECUTE on the procedure rather than raw INSERT/UPDATE on the
-- underlying table. This way, the business logic in the procedure is the
-- ONLY path to modify data, and it cannot be bypassed by privilege alone.
-- ============================================================================

-- admin_role: can call everything
GRANT EXECUTE ON FUNCTION sp_register_case(INT, INT, VARCHAR, DATE, VARCHAR)    TO admin_role;
GRANT EXECUTE ON FUNCTION sp_add_custody_transfer(INT, INT, VARCHAR, VARCHAR, TEXT) TO admin_role;
GRANT EXECUTE ON FUNCTION sp_finalize_lab_result(INT, TEXT, TEXT, TEXT)          TO admin_role;
GRANT EXECUTE ON FUNCTION sp_deactivate_user(INT)                               TO admin_role;
GRANT EXECUTE ON FUNCTION sp_issue_court_receipt(INT, INT, INT, DATE, VARCHAR)  TO admin_role;

-- records_clerk_role: registers cases
GRANT EXECUTE ON FUNCTION sp_register_case(INT, INT, VARCHAR, DATE, VARCHAR)    TO records_clerk_role;

-- forensic_staff_role: custody transfers and lab finalization
GRANT EXECUTE ON FUNCTION sp_add_custody_transfer(INT, INT, VARCHAR, VARCHAR, TEXT) TO forensic_staff_role;
GRANT EXECUTE ON FUNCTION sp_finalize_lab_result(INT, TEXT, TEXT, TEXT)              TO forensic_staff_role;

-- court_role: issues court receipts
GRANT EXECUTE ON FUNCTION sp_issue_court_receipt(INT, INT, INT, DATE, VARCHAR)  TO court_role;

-- police_role: registers cases
GRANT EXECUTE ON FUNCTION sp_register_case(INT, INT, VARCHAR, DATE, VARCHAR)    TO police_role;

COMMIT;
