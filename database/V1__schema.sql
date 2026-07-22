-- ============================================================================
-- MLIMS — Medico-Legal Information Management System
-- 01_schema.sql — Full DDL: tables, constraints, indexes
-- PostgreSQL 15+
--
-- This file creates 25 tables across 8 modules, following the authoritative
-- ER diagram exactly. Where the physical implementation necessarily diverges
-- from the logical ER diagram (encrypted PII columns, derived attributes,
-- workflow-aware 1:1 relationships), the divergence is documented in-line
-- as a deliberate DBLC step.
-- ============================================================================

BEGIN;

-- ============================================================================
-- MODULE 1 — System Security & Access Control
-- ============================================================================

CREATE TABLE roles (
    role_id     SERIAL       PRIMARY KEY,
    role_name   VARCHAR(50)  NOT NULL UNIQUE,
    description TEXT
);

COMMENT ON TABLE roles IS 'Application-level roles governing UI feature access and RBAC.';

-- ─────────────────────────────────────────────────────────────────────────────
-- password_hash: stores a bcrypt hash produced EXCLUSIVELY at the application
-- layer (Phase 2, e.g., via bcryptjs in Node.js). Passwords are NEVER hashed
-- or stored via SQL — the salt/cost-factor and plaintext never appear in a
-- query string, pg_stat_statements, or database log.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE users (
    user_id       SERIAL       PRIMARY KEY,
    role_id       INT          NOT NULL
                               REFERENCES roles(role_id) ON DELETE RESTRICT,
    username      VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    last_login    TIMESTAMP
);

COMMENT ON TABLE users IS 'Application user accounts. Every user has exactly one role.';

-- ─────────────────────────────────────────────────────────────────────────────
-- users ↔ staff is a 1:1 relationship (UNIQUE on user_id).
-- Not every user requires a staff profile (e.g., system admin, auditor), but
-- every staff member must have exactly one user account.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE staff (
    staff_id    SERIAL       PRIMARY KEY,
    user_id     INT          NOT NULL UNIQUE
                             REFERENCES users(user_id) ON DELETE RESTRICT,
    first_name  VARCHAR(100) NOT NULL,
    last_name   VARCHAR(100) NOT NULL,
    designation VARCHAR(100),
    contact_no  VARCHAR(20),
    slmc_reg_no VARCHAR(50)  UNIQUE
);

COMMENT ON TABLE staff IS 'Professional profile for clinical/forensic/lab staff. 1:1 with users.';

-- ─────────────────────────────────────────────────────────────────────────────
-- audit_logs: append-only by design. No role (including admin_role) receives
-- UPDATE or DELETE privileges — see 02_roles_grants_rls.sql. Only the
-- fn_audit_trigger() function writes here, making the append-only guarantee
-- a database-level invariant, not merely convention.
--
-- user_id uses ON DELETE SET NULL so audit history survives user account
-- deletion — a regulatory requirement for medico-legal record keeping.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE audit_logs (
    log_id      BIGSERIAL    PRIMARY KEY,
    user_id     INT          REFERENCES users(user_id) ON DELETE SET NULL,
    table_name  VARCHAR(63)  NOT NULL,
    record_id   INT,
    action_type VARCHAR(10)  NOT NULL
                             CHECK (action_type IN ('INSERT', 'UPDATE', 'DELETE')),
    changed_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    old_payload JSONB,
    new_payload JSONB
);

COMMENT ON TABLE audit_logs IS 'Immutable audit trail. Written only by fn_audit_trigger(); no role has UPDATE/DELETE.';

-- ─────────────────────────────────────────────────────────────────────────────
-- notifications.user_id uses ON DELETE SET NULL — notifications addressed to
-- a deleted user remain visible to admins as historical records.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE notifications (
    notification_id SERIAL       PRIMARY KEY,
    user_id         INT          REFERENCES users(user_id) ON DELETE SET NULL,
    subject         VARCHAR(255) NOT NULL,
    message         TEXT,
    due_date        DATE,
    is_read         BOOLEAN      NOT NULL DEFAULT FALSE
);

COMMENT ON TABLE notifications IS 'In-app notifications for users. Survives user deletion via SET NULL.';


-- ============================================================================
-- MODULE 2 — Master & Lookup Data
-- ============================================================================

CREATE TABLE police_stations (
    station_id   SERIAL       PRIMARY KEY,
    station_name VARCHAR(150) NOT NULL UNIQUE,
    area         VARCHAR(100),
    contact_no   VARCHAR(20)
);

CREATE TABLE courts (
    court_id   SERIAL       PRIMARY KEY,
    court_name VARCHAR(150) NOT NULL UNIQUE,
    court_type VARCHAR(50),
    location   VARCHAR(200)
);

CREATE TABLE injury_types (
    injury_type_id SERIAL       PRIMARY KEY,
    name           VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE weapon_types (
    weapon_type_id SERIAL       PRIMARY KEY,
    name           VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE specimen_types (
    specimen_type_id SERIAL       PRIMARY KEY,
    name             VARCHAR(100) NOT NULL UNIQUE
);


-- ============================================================================
-- MODULE 3 — Core Cases & Patient Demographics
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- DBLC Physical-Design Note — Sensitive Data Protection (PII Encryption):
--
-- The ER diagram's logical attribute "nic_passport" maps to TWO physical
-- columns in this implementation:
--
--   1. nic_passport_enc (BYTEA) — AES-256-GCM ciphertext produced at the
--      APPLICATION layer (Node.js, key sourced from the AES_KEY environment
--      variable). The encryption key NEVER appears in a SQL string, query
--      log, or pg_stat_statements. We deliberately avoid pgcrypto's
--      pgp_sym_encrypt() to prevent key leakage into database logs.
--
--   2. nic_search_hash (VARCHAR 64) — deterministic HMAC-SHA256 digest
--      produced at the application layer, enabling equality lookups (e.g.,
--      "find patient by NIC") without decrypting every row.
--
-- This is the physical-design hardening step below the logical ER attribute:
-- same conceptual attribute, stricter physical implementation. The UNIQUE
-- constraint migrates from the plaintext column to the search hash, because
-- the ciphertext (with GCM's random nonce) is non-deterministic and cannot
-- support uniqueness checks.
--
-- This is a deliberate DBLC step (Logical Design → Physical Design), not a
-- deviation from the ER diagram.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- DERIVED ATTRIBUTE — patients.age:
--
-- The ER diagram gives both `dob` and `age`. In ER terminology, `age` is a
-- textbook DERIVED ATTRIBUTE (drawn with a dashed oval). Storing a derived
-- value risks staleness — a classic UPDATE ANOMALY: if a patient's row is
-- not touched for a year, `age` becomes stale.
--
-- Why not a GENERATED ALWAYS AS column?
-- PostgreSQL requires GENERATED columns to use IMMUTABLE expressions only.
-- age(CURRENT_DATE, dob) depends on CURRENT_DATE, which changes daily, so
-- it is NOT immutable and cannot be used in a GENERATED column.
--
-- Solution: a BEFORE INSERT OR UPDATE OF dob trigger (fn_recalculate_age in
-- 03_triggers.sql) recalculates `age` server-side from `dob` whenever the
-- row is inserted or dob is updated. This is a pragmatic trade-off: age is
-- accurate at write time, and periodic batch updates (or a view computing
-- it on-the-fly) can be added if real-time accuracy is critical.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE patients (
    patient_id       SERIAL       PRIMARY KEY,
    full_name        VARCHAR(200) NOT NULL,
    dob              DATE,
    age              INT,
    gender           CHAR(1)      CHECK (gender IN ('M', 'F', 'X')),
    address          TEXT,
    nic_passport_enc BYTEA,
    nic_search_hash  VARCHAR(64)  UNIQUE,
    thumb_imprint    BYTEA
);

COMMENT ON TABLE patients IS 'Patient demographics. NIC/passport stored as AES-256-GCM ciphertext with HMAC search hash.';

-- ─────────────────────────────────────────────────────────────────────────────
-- forensic_cases.status and case_type use CHECK constraints restricted to
-- explicit value lists — not free-text VARCHAR — to prevent garbage data
-- and support reliable filtering on the Dashboard/Search pages.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE forensic_cases (
    case_id           SERIAL       PRIMARY KEY,
    patient_id        INT          NOT NULL
                                   REFERENCES patients(patient_id)
                                   ON DELETE RESTRICT,
    station_id        INT          NOT NULL
                                   REFERENCES police_stations(station_id)
                                   ON DELETE RESTRICT,
    case_number       VARCHAR(30)  NOT NULL UNIQUE,
    case_type         VARCHAR(20)  NOT NULL
                                   CHECK (case_type IN ('clinical', 'postmortem')),
    incident_date     DATE,
    incident_location VARCHAR(300),
    status            VARCHAR(25)  NOT NULL DEFAULT 'registered'
                                   CHECK (status IN (
                                       'registered',
                                       'under_investigation',
                                       'pending_report',
                                       'completed',
                                       'closed'
                                   ))
);

COMMENT ON TABLE forensic_cases IS 'Core case record linking a patient to a police station. case_type determines downstream branch.';

CREATE TABLE digital_assets (
    asset_id    SERIAL       PRIMARY KEY,
    case_id     INT          NOT NULL
                             REFERENCES forensic_cases(case_id)
                             ON DELETE RESTRICT,
    file_name   VARCHAR(255) NOT NULL,
    file_uri    TEXT         NOT NULL,
    file_type   VARCHAR(50),
    upload_date TIMESTAMP    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE digital_assets IS 'Photographs, scans, and documents attached to a forensic case.';


-- ============================================================================
-- MODULE 4 — Clinical Forensic Component
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- case_id is UNIQUE: a forensic case has at most one clinical examination
-- (0 or 1 cardinality from the ER diagram).
--
-- doctor_id FK references staff (not users directly) because a doctor must
-- have a staff profile with an SLMC registration number to perform exams.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE clinical_examinations (
    mlef_id           SERIAL       PRIMARY KEY,
    case_id           INT          NOT NULL UNIQUE
                                   REFERENCES forensic_cases(case_id)
                                   ON DELETE RESTRICT,
    doctor_id         INT          NOT NULL
                                   REFERENCES staff(staff_id)
                                   ON DELETE RESTRICT,
    exam_date         DATE         NOT NULL,
    exam_time         TIME,
    ward              VARCHAR(50),
    bht_no            VARCHAR(50),
    discharge_date    DATE,
    patient_consent   BOOLEAN      DEFAULT FALSE,
    brief_history     TEXT,
    alcohol_influence VARCHAR(50),
    drug_influence    VARCHAR(50),
    sexual_assault    BOOLEAN      DEFAULT FALSE
);

COMMENT ON TABLE clinical_examinations IS 'Medico-Legal Examination Form (MLEF). 0/1 per forensic case.';

CREATE TABLE medical_referrals (
    referral_id   SERIAL       PRIMARY KEY,
    mlef_id       INT          NOT NULL
                               REFERENCES clinical_examinations(mlef_id)
                               ON DELETE RESTRICT,
    specialty     VARCHAR(100),
    referral_date DATE,
    review_notes  TEXT
);

COMMENT ON TABLE medical_referrals IS 'Specialist referrals from a clinical examination. 1:N from clinical_examinations.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Workflow / Total-Participation Note:
--
-- The ER diagram shows clinical_examinations ↔ medico_legal_reports as
-- mandatory 1:1 (||--||). However, in the real clinical workflow the MLR is
-- only created AFTER the examination is complete and the doctor writes their
-- final opinion. We cannot enforce total participation at INSERT time
-- because the exam row must exist BEFORE the MLR row can be created.
--
-- Implementation:
--   • mlef_id has a UNIQUE constraint → enforces the 1:1 shape
--   • The MLR row is created later → total participation ("every exam must
--     eventually have an MLR") is enforced at the procedure/application
--     layer in Phase 2, not at INSERT time
--
-- This is a workflow/total-participation distinction, NOT a violation of the
-- ER diagram. The ER notation expresses the business RULE (every exam shall
-- have a report), while the physical schema respects the temporal REALITY
-- (the report is written after the exam).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE medico_legal_reports (
    mlr_id          SERIAL       PRIMARY KEY,
    mlef_id         INT          NOT NULL UNIQUE
                                 REFERENCES clinical_examinations(mlef_id)
                                 ON DELETE RESTRICT,
    court_id        INT          NOT NULL
                                 REFERENCES courts(court_id)
                                 ON DELETE RESTRICT,
    court_case_no   VARCHAR(50),
    serial_no       VARCHAR(50)  NOT NULL UNIQUE,
    trial_date      DATE,
    issue_date      DATE,
    final_opinion   TEXT,
    is_grievous_311 BOOLEAN      DEFAULT FALSE
);

COMMENT ON TABLE medico_legal_reports IS 'Medico-Legal Report (MLR). 1:1 with clinical_examinations (workflow-delayed).';


-- ============================================================================
-- MODULE 5 — Autopsy Component
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- case_id is UNIQUE: a forensic case has at most one postmortem examination
-- (0 or 1 cardinality from the ER diagram).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE postmortem_examinations (
    pmr_id           SERIAL       PRIMARY KEY,
    case_id          INT          NOT NULL UNIQUE
                                  REFERENCES forensic_cases(case_id)
                                  ON DELETE RESTRICT,
    doctor_id        INT          NOT NULL
                                  REFERENCES staff(staff_id)
                                  ON DELETE RESTRICT,
    inquest_no       VARCHAR(50),
    ordered_by       VARCHAR(200),
    date_of_pm       DATE,
    time_of_pm       TIME,
    date_of_death    DATE,
    place_of_death   VARCHAR(300),
    manner_of_death  VARCHAR(100),
    rigor_mortis     VARCHAR(100),
    hypostasis       VARCHAR(100),
    putrefaction     VARCHAR(100),
    anatomical_notes JSONB
);

COMMENT ON TABLE postmortem_examinations IS 'Post-mortem examination record. 0/1 per forensic case.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Workflow / Total-Participation Note:
--
-- The ER diagram shows postmortem_examinations ↔ causes_of_death as mandatory
-- 1:1 (||--||). However, the cause of death is determined only AFTER the
-- postmortem is complete (you cannot know the cause at the moment the PM
-- starts). The pmr_id UNIQUE constraint enforces the 1:1 shape; total
-- participation ("every PM must eventually have a cause of death") is
-- enforced at the procedure/application layer in Phase 2.
--
-- This is a workflow/total-participation distinction, NOT a violation of the
-- ER diagram.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE causes_of_death (
    cod_id              SERIAL  PRIMARY KEY,
    pmr_id              INT     NOT NULL UNIQUE
                                REFERENCES postmortem_examinations(pmr_id)
                                ON DELETE RESTRICT,
    immediate_cause     TEXT,
    antecedent_cause    TEXT,
    contributory        TEXT,
    under_investigation BOOLEAN NOT NULL DEFAULT FALSE
);

COMMENT ON TABLE causes_of_death IS 'WHO-format cause of death. 1:1 with postmortem_examinations (workflow-delayed).';

-- ─────────────────────────────────────────────────────────────────────────────
-- deceased_identifications: 1:N from postmortem_examinations.
--
-- nic column follows the same PII-encryption pattern as patients.nic_passport:
--   nic_enc   (BYTEA)       — AES-256-GCM ciphertext
--   nic_search_hash (VARCHAR 64) — HMAC-SHA256 for lookups
-- Not UNIQUE here because the same NIC holder can identify multiple deceased
-- persons across different postmortem cases.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE deceased_identifications (
    identification_id SERIAL       PRIMARY KEY,
    pmr_id            INT          NOT NULL
                                   REFERENCES postmortem_examinations(pmr_id)
                                   ON DELETE RESTRICT,
    identifier_name   VARCHAR(200) NOT NULL,
    identifier_address TEXT,
    relationship      VARCHAR(100),
    nic_enc           BYTEA,
    nic_search_hash   VARCHAR(64)
);

COMMENT ON TABLE deceased_identifications IS 'Persons who identified the deceased. NIC stored encrypted.';


-- ============================================================================
-- MODULE 6 — Injuries Mapping (Junction Table)
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Business-Rule CHECK Constraint — Exclusive-Or Parent:
--
-- An injury record belongs to EITHER a clinical examination (mlef_id) OR a
-- postmortem examination (pmr_id) — never both, never neither.
--
-- The ER diagram's cardinality notation can IMPLY this exclusive-or via two
-- separate 1:N relationship lines from clinical_examinations and
-- postmortem_examinations into exam_injuries, but the ER model CANNOT
-- ENFORCE it — only a CHECK constraint at the physical/relational level can.
-- This is a textbook case where the relational model must add a constraint
-- that the ER model cannot express.
--
-- weapon_type_id is nullable because not every injury involves a weapon
-- (e.g., fall injuries, drowning, asphyxiation).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE exam_injuries (
    exam_injury_id   BIGSERIAL    PRIMARY KEY,
    mlef_id          INT          REFERENCES clinical_examinations(mlef_id)
                                  ON DELETE RESTRICT,
    pmr_id           INT          REFERENCES postmortem_examinations(pmr_id)
                                  ON DELETE RESTRICT,
    injury_type_id   INT          NOT NULL
                                  REFERENCES injury_types(injury_type_id)
                                  ON DELETE RESTRICT,
    weapon_type_id   INT          REFERENCES weapon_types(weapon_type_id)
                                  ON DELETE RESTRICT,
    body_part        VARCHAR(100),
    size_and_shape   VARCHAR(200),
    category_of_hurt VARCHAR(100),
    endangers_life   BOOLEAN      DEFAULT FALSE,

    -- XOR: exactly one parent must be set
    CONSTRAINT chk_injury_exclusive_parent CHECK (
        (mlef_id IS NOT NULL AND pmr_id IS NULL)
        OR
        (mlef_id IS NULL AND pmr_id IS NOT NULL)
    )
);

COMMENT ON TABLE exam_injuries IS 'Junction table mapping injuries to exactly one clinical OR postmortem exam. XOR enforced by CHECK.';


-- ============================================================================
-- MODULE 7 — Evidence, Labs & Chain of Custody
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- The UNIQUE constraint on barcode_id creates an implicit unique B-tree
-- index, which satisfies the barcode-scan lookup requirement (Part B).
-- No additional explicit index is needed.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE specimens (
    specimen_id      SERIAL       PRIMARY KEY,
    case_id          INT          NOT NULL
                                  REFERENCES forensic_cases(case_id)
                                  ON DELETE RESTRICT,
    specimen_type_id INT          NOT NULL
                                  REFERENCES specimen_types(specimen_type_id)
                                  ON DELETE RESTRICT,
    barcode_id       VARCHAR(50)  NOT NULL UNIQUE,
    quantity         VARCHAR(50),
    collection_date  TIMESTAMP,
    current_location VARCHAR(200)
);

COMMENT ON TABLE specimens IS 'Physical specimens/evidence collected from a case. Barcode-scannable via unique barcode_id.';

-- ─────────────────────────────────────────────────────────────────────────────
-- chain_of_custody: append-only by design. Past entries are NEVER edited —
-- only new links are appended via sp_add_custody_transfer() (see
-- 04_functions_procedures.sql). This models the legal chain-of-custody
-- principle: every transfer is a new, immutable record.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE chain_of_custody (
    custody_id     BIGSERIAL    PRIMARY KEY,
    specimen_id    INT          NOT NULL
                                REFERENCES specimens(specimen_id)
                                ON DELETE RESTRICT,
    transferred_by INT          NOT NULL
                                REFERENCES staff(staff_id)
                                ON DELETE RESTRICT,
    transferred_to VARCHAR(200) NOT NULL,
    transfer_date  TIMESTAMP    NOT NULL DEFAULT NOW(),
    purpose        VARCHAR(200),
    receipt_uri    TEXT
);

COMMENT ON TABLE chain_of_custody IS 'Immutable chain-of-custody log. Append-only via sp_add_custody_transfer().';

-- ─────────────────────────────────────────────────────────────────────────────
-- lab_requests.status uses a CHECK constraint restricted to an explicit value
-- list — not free-text — to support reliable filtering on the
-- Lab/Toxicology page (pending vs. completed split).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE lab_requests (
    request_id       SERIAL       PRIMARY KEY,
    specimen_id      INT          NOT NULL
                                  REFERENCES specimens(specimen_id)
                                  ON DELETE RESTRICT,
    request_type     VARCHAR(100),
    request_date     DATE         NOT NULL,
    govt_analyst_ref VARCHAR(100),
    clinical_notes   TEXT,
    status           VARCHAR(20)  NOT NULL DEFAULT 'pending'
                                  CHECK (status IN (
                                      'pending',
                                      'in_progress',
                                      'completed',
                                      'rejected'
                                  ))
);

COMMENT ON TABLE lab_requests IS 'Lab analysis requests linked to specimens. Status constrained to defined workflow values.';

-- ─────────────────────────────────────────────────────────────────────────────
-- lab_results: 1:1 with lab_requests (request_id UNIQUE).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE lab_results (
    result_id    SERIAL PRIMARY KEY,
    request_id   INT    NOT NULL UNIQUE
                        REFERENCES lab_requests(request_id)
                        ON DELETE RESTRICT,
    findings     TEXT,
    diagnosis    TEXT,
    received_date DATE,
    document_uri TEXT
);

COMMENT ON TABLE lab_results IS 'Lab results. 1:1 with lab_requests.';


-- ============================================================================
-- MODULE 8 — Legal Acknowledgments
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- court_receipts links to EITHER a medico_legal_report (clinical branch) OR
-- a postmortem_examination (autopsy branch) — never both, never neither.
-- This mirrors the two separate report lineages in the system:
--
--   Clinical path:  case → clinical_exam → MLR → court_receipt
--   Postmortem path: case → postmortem_exam → court_receipt (directly)
--
-- Both mlr_id and pmr_id carry UNIQUE constraints: each report/examination
-- gets at most one receipt. They are individually NULLABLE to allow the
-- exclusive-or pattern.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE court_receipts (
    receipt_id     SERIAL       PRIMARY KEY,
    mlr_id         INT          UNIQUE
                                REFERENCES medico_legal_reports(mlr_id)
                                ON DELETE RESTRICT,
    pmr_id         INT          UNIQUE
                                REFERENCES postmortem_examinations(pmr_id)
                                ON DELETE RESTRICT,
    court_id       INT          NOT NULL
                                REFERENCES courts(court_id)
                                ON DELETE RESTRICT,
    trial_date     DATE,
    received_date  DATE,
    registrar_sign VARCHAR(200),

    -- XOR: exactly one report lineage must be referenced
    CONSTRAINT chk_receipt_exclusive_report CHECK (
        (mlr_id IS NOT NULL AND pmr_id IS NULL)
        OR
        (mlr_id IS NULL AND pmr_id IS NOT NULL)
    )
);

COMMENT ON TABLE court_receipts IS 'Court acknowledgment of report receipt. Links to exactly one MLR or one postmortem exam.';


-- ============================================================================
-- INDEXES
--
-- Only created where there is a real, explainable query pattern. Each index
-- has a one-line comment naming the specific UI page or workflow it serves.
-- Indexes without a clear consumer are deliberately omitted.
-- ============================================================================

-- Dashboard and Search pages filter cases by (case_type, status) together.
CREATE INDEX idx_cases_type_status
    ON forensic_cases (case_type, status);

-- Audit Log page always filters by a specific user within a date range.
CREATE INDEX idx_audit_user_date
    ON audit_logs (user_id, changed_at);

-- Statistics / Monthly Reports page sorts and filters by incident_date.
CREATE INDEX idx_cases_incident_date
    ON forensic_cases (incident_date);

-- Note: specimens.barcode_id already has an implicit unique B-tree index
-- from the UNIQUE constraint. This serves the barcode-scan lookup on the
-- Evidence & Sample page. No additional index needed — confirmed.

-- Lab / Toxicology page splits requests into pending vs. completed.
CREATE INDEX idx_lab_requests_status
    ON lab_requests (status);

-- Dashboard notification widget filters by (user_id, is_read).
CREATE INDEX idx_notifications_user_read
    ON notifications (user_id, is_read);

-- NIC/passport lookup via HMAC search hash. Do NOT index the encrypted
-- BYTEA column itself — AES-256-GCM ciphertext is non-deterministic
-- (random nonce) and not searchable.
CREATE INDEX idx_patients_nic_hash
    ON patients (nic_search_hash);

-- Deceased identifier NIC lookup via HMAC hash (same rationale as above).
CREATE INDEX idx_deceased_nic_hash
    ON deceased_identifications (nic_search_hash);

COMMIT;
