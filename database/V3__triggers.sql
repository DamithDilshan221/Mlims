-- ============================================================================
-- MLIMS — Medico-Legal Information Management System
-- 03_triggers.sql — Trigger Functions & Trigger Bindings
-- PostgreSQL 15+
--
-- Triggers are IMPLICIT REACTIONS — they fire automatically in response to
-- data changes, without the calling code needing to invoke them explicitly.
-- This contrasts with the EXPLICIT ACTIONS in 04_functions_procedures.sql
-- (stored procedures that must be called deliberately).
--
-- See THEORY_NOTES.md §5 for the full "implicit vs. explicit" discussion.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. GENERIC AUDIT TRIGGER — fn_audit_trigger()
--
-- A single, reusable trigger function attached AFTER INSERT/UPDATE/DELETE
-- to multiple tables. Uses PostgreSQL introspection variables:
--   • TG_TABLE_NAME — the table that fired the trigger
--   • TG_OP        — 'INSERT', 'UPDATE', or 'DELETE'
--   • TG_RELID     — OID of the trigger's table (for PK column lookup)
--   • row_to_json(OLD/NEW)::JSONB — full row snapshots
--
-- The application layer MUST set a session variable at the start of each
-- request/transaction so the trigger can attribute the change correctly:
--
--     SET app.current_user_id = '<user_id>';
--
-- If the variable is not set, user_id is recorded as NULL (anonymous/system).
--
-- SECURITY DEFINER: the function runs with the privileges of its owner
-- (typically the schema owner), which has INSERT on audit_logs. This is
-- necessary because individual roles do NOT have direct INSERT on audit_logs.
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id   INT;
    v_old       JSONB := NULL;
    v_new       JSONB := NULL;
    v_record_id INT;
    v_pk_col    TEXT;
BEGIN
    -- Read the session variable set by the application layer.
    -- current_setting(..., true) returns NULL instead of raising an error
    -- if the variable is not set.
    v_user_id := NULLIF(current_setting('app.current_user_id', true), '')::INT;

    -- Dynamically resolve the primary key column name for the triggering table
    -- using pg_index + pg_attribute. This makes the function truly reusable
    -- across all tables without hardcoding PK column names.
    SELECT a.attname INTO v_pk_col
    FROM   pg_attribute a
    JOIN   pg_index i ON a.attrelid = i.indrelid
                     AND a.attnum = ANY(i.indkey)
    WHERE  i.indrelid = TG_RELID
      AND  i.indisprimary
    LIMIT  1;

    -- Capture old/new row snapshots based on the operation
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        v_old := row_to_json(OLD)::JSONB;
    END IF;

    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        v_new := row_to_json(NEW)::JSONB;
    END IF;

    -- Extract the primary key value from whichever row is available
    v_record_id := (COALESCE(v_new, v_old) ->> v_pk_col)::INT;

    -- Write the immutable audit log entry
    INSERT INTO audit_logs (
        user_id, table_name, record_id, action_type,
        changed_at, old_payload, new_payload
    ) VALUES (
        v_user_id, TG_TABLE_NAME, v_record_id, TG_OP,
        NOW(), v_old, v_new
    );

    -- AFTER triggers must return NULL (the return value is ignored,
    -- but PostgreSQL requires a return statement)
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION fn_audit_trigger() IS
    'Generic audit trigger. Attached AFTER INSERT/UPDATE/DELETE to audited tables. SECURITY DEFINER.';

-- ────────────────────────────────────────────────────────────────────────────
-- Attach the audit trigger to the 9 specified tables.
-- Each trigger fires AFTER the operation so the row data reflects the
-- final committed state (not a pre-image that might be rolled back).
-- ────────────────────────────────────────────────────────────────────────────

CREATE TRIGGER trg_audit_patients
    AFTER INSERT OR UPDATE OR DELETE ON patients
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_staff
    AFTER INSERT OR UPDATE OR DELETE ON staff
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_users
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_clinical_examinations
    AFTER INSERT OR UPDATE OR DELETE ON clinical_examinations
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_postmortem_examinations
    AFTER INSERT OR UPDATE OR DELETE ON postmortem_examinations
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_medico_legal_reports
    AFTER INSERT OR UPDATE OR DELETE ON medico_legal_reports
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_specimens
    AFTER INSERT OR UPDATE OR DELETE ON specimens
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_chain_of_custody
    AFTER INSERT OR UPDATE OR DELETE ON chain_of_custody
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_lab_results
    AFTER INSERT OR UPDATE OR DELETE ON lab_results
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();


-- ============================================================================
-- 2. DERIVED ATTRIBUTE TRIGGER — fn_recalculate_age()
--
-- patients.age is a textbook DERIVED ATTRIBUTE (ER: dashed oval). Storing
-- it risks staleness (a classic update anomaly). We recalculate it from
-- dob on every INSERT or UPDATE OF dob.
--
-- Why not a GENERATED ALWAYS AS column?
-- PostgreSQL GENERATED columns require IMMUTABLE expressions. The expression
-- age(CURRENT_DATE, dob) depends on CURRENT_DATE, which changes daily,
-- making it non-immutable. A trigger is the correct mechanism.
--
-- Trade-off: age is accurate at write time. For real-time accuracy between
-- writes, a view computing EXTRACT(YEAR FROM age(CURRENT_DATE, dob)) can
-- supplement this, or a nightly batch job can touch all rows.
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_recalculate_age()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.dob IS NOT NULL THEN
        NEW.age := EXTRACT(YEAR FROM age(CURRENT_DATE, NEW.dob))::INT;
    ELSE
        NEW.age := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_recalculate_age() IS
    'Recalculates patients.age from dob. Fires BEFORE INSERT or UPDATE OF dob.';

CREATE TRIGGER trg_patients_recalculate_age
    BEFORE INSERT OR UPDATE OF dob ON patients
    FOR EACH ROW
    EXECUTE FUNCTION fn_recalculate_age();


-- ============================================================================
-- 3. CROSS-TABLE VALIDATION TRIGGER — fn_validate_lab_result_date()
--
-- Business rule: a lab result's received_date cannot be earlier than its
-- corresponding lab_request's request_date. This is a cross-table constraint
-- that CANNOT be expressed as a CHECK constraint (CHECK can only reference
-- columns of its own row/table). A BEFORE INSERT trigger is the correct
-- mechanism.
--
-- SQLSTATE 'check_violation' (23514) is used to signal the error in a way
-- consistent with PostgreSQL's built-in constraint violations.
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_validate_lab_result_date()
RETURNS TRIGGER AS $$
DECLARE
    v_request_date DATE;
BEGIN
    SELECT request_date INTO v_request_date
    FROM   lab_requests
    WHERE  request_id = NEW.request_id;

    IF v_request_date IS NULL THEN
        RAISE EXCEPTION 'Lab request ID % does not exist', NEW.request_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF NEW.received_date IS NOT NULL
       AND NEW.received_date < v_request_date THEN
        RAISE EXCEPTION
            'Lab result received_date (%) cannot be earlier than lab request date (%). '
            'A result cannot be received before the request was made.',
            NEW.received_date, v_request_date
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_validate_lab_result_date() IS
    'Cross-table validation: lab_results.received_date >= lab_requests.request_date.';

CREATE TRIGGER trg_lab_results_validate_date
    BEFORE INSERT ON lab_results
    FOR EACH ROW
    EXECUTE FUNCTION fn_validate_lab_result_date();

COMMIT;
