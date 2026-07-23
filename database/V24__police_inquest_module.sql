-- ============================================================================
-- MLIMS: V24 — Police & Inquest Module
--
-- Adds:
--   1. inquest_orders        — Inquest/Court order records with scanned docs
--   2. police_copy_handover  — Track police copy collection with officer badge
--   3. police_statements     — Police/witness statements & BHT records
--   4. forensic_cases        — death_category column for postmortem deaths
-- ============================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. death_category on forensic_cases (case-level, applies to postmortems)
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE forensic_cases
  ADD COLUMN IF NOT EXISTS death_category VARCHAR(30)
  CHECK (death_category IN ('hospital_death', 'outside_death', 'high_profile'));

COMMENT ON COLUMN forensic_cases.death_category IS
  'Death categorization: hospital_death, outside_death, or high_profile (magistrate escalation).';

-- ────────────────────────────────────────────────────────────────────────────
-- 2. inquest_orders
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inquest_orders (
    inquest_id      SERIAL       PRIMARY KEY,
    case_id         INT          NOT NULL
                                 REFERENCES forensic_cases(case_id)
                                 ON DELETE RESTRICT,
    inquest_no      VARCHAR(50)  NOT NULL UNIQUE,
    authority_type  VARCHAR(30)  NOT NULL
                                 CHECK (authority_type IN (
                                     'isd_inquest',
                                     'police_inquest',
                                     'magistrate_order'
                                 )),
    authority_name  VARCHAR(150) NOT NULL,
    order_date      DATE         NOT NULL DEFAULT CURRENT_DATE,
    document_uri    VARCHAR(500),
    notes           TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by      INT          REFERENCES users(user_id)
);

COMMENT ON TABLE  inquest_orders IS 'Inquest orders — ISD, police, or magistrate.';
COMMENT ON COLUMN inquest_orders.authority_type IS 'isd_inquest | police_inquest | magistrate_order';
COMMENT ON COLUMN inquest_orders.authority_name IS 'Name of ISD, police officer, or magistrate who issued the order.';

-- ────────────────────────────────────────────────────────────────────────────
-- 3. police_copy_handover
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS police_copy_handover (
    handover_id              SERIAL       PRIMARY KEY,
    case_id                  INT          NOT NULL
                                          REFERENCES forensic_cases(case_id)
                                          ON DELETE RESTRICT,
    document_type            VARCHAR(30)  NOT NULL
                                          CHECK (document_type IN (
                                              'mlef_police_copy',
                                              'cod_form',
                                              'pm_registry_entry'
                                          )),
    collecting_officer_name  VARCHAR(100) NOT NULL,
    collecting_officer_rank  VARCHAR(50),
    collecting_officer_badge VARCHAR(50)  NOT NULL,
    digital_signature_uri    VARCHAR(500),
    handover_date            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    receipt_acknowledged_by  INT          REFERENCES users(user_id),
    is_acknowledged          BOOLEAN      NOT NULL DEFAULT FALSE
);

COMMENT ON TABLE  police_copy_handover IS 'Tracks police copy collection with officer badge verification.';
COMMENT ON COLUMN police_copy_handover.document_type IS 'mlef_police_copy | cod_form | pm_registry_entry';

-- ────────────────────────────────────────────────────────────────────────────
-- 4. police_statements
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS police_statements (
    statement_id   SERIAL       PRIMARY KEY,
    case_id        INT          NOT NULL
                                REFERENCES forensic_cases(case_id)
                                ON DELETE RESTRICT,
    statement_type VARCHAR(30)  NOT NULL
                                CHECK (statement_type IN (
                                    'police_statement',
                                    'witness_statement',
                                    'scene_notes',
                                    'bht_record'
                                )),
    description    VARCHAR(300),
    document_uri   VARCHAR(500) NOT NULL,
    uploaded_by    INT          REFERENCES users(user_id),
    uploaded_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  police_statements IS 'Police statements, witness notes, scene investigations, BHT records.';
COMMENT ON COLUMN police_statements.statement_type IS 'police_statement | witness_statement | scene_notes | bht_record';

-- ────────────────────────────────────────────────────────────────────────────
-- GRANTS
-- ────────────────────────────────────────────────────────────────────────────
-- admins get full control (ownership via postgres)
GRANT ALL PRIVILEGES ON inquest_orders        TO admin_role;
GRANT ALL PRIVILEGES ON police_copy_handover   TO admin_role;
GRANT ALL PRIVILEGES ON police_statements      TO admin_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO admin_role;

-- police_role: can INSERT their own statements, view inquests & handover
GRANT SELECT, INSERT       ON inquest_orders        TO police_role;
GRANT SELECT               ON police_copy_handover  TO police_role;
GRANT SELECT, INSERT       ON police_statements     TO police_role;

-- doctor_role: view inquest orders & handover that pertain to their cases
GRANT SELECT               ON inquest_orders        TO doctor_role;
GRANT SELECT               ON police_copy_handover  TO doctor_role;
GRANT SELECT               ON police_statements     TO doctor_role;

-- court_role, records_clerk_role, auditor_role: read-only
GRANT SELECT               ON inquest_orders        TO court_role, records_clerk_role, auditor_role;
GRANT SELECT               ON police_copy_handover  TO court_role, records_clerk_role, auditor_role;
GRANT SELECT               ON police_statements     TO court_role, records_clerk_role, auditor_role;

-- forensic_staff_role: read-only
GRANT SELECT               ON inquest_orders        TO forensic_staff_role;
GRANT SELECT               ON police_copy_handover  TO forensic_staff_role;
GRANT SELECT               ON police_statements     TO forensic_staff_role;

COMMIT;
