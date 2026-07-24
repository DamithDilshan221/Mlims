BEGIN;

CREATE OR REPLACE FUNCTION fn_has_police_copy(p_mlef_id INT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM audit_logs
        WHERE table_name = 'clinical_examinations'
          AND action_type = 'POLICE_COPY'
          AND record_id = p_mlef_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION fn_has_police_copy(INT) TO doctor_role, admin_role, records_clerk_role, auditor_role;

COMMIT;
