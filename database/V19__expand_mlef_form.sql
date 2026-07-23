-- ============================================================================
-- MLIMS: V19 — Expand MLEF form with full spec fields
-- Adds columns to clinical_examinations for comprehensive MLEF form.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Police & Reference Info (Section 1: Header & Administrative Metadata)
-- ============================================================================

ALTER TABLE clinical_examinations
  ADD COLUMN IF NOT EXISTS officer_name     VARCHAR(100),
  ADD COLUMN IF NOT EXISTS officer_rank     VARCHAR(50),
  ADD COLUMN IF NOT EXISTS officer_badge_no VARCHAR(50),
  ADD COLUMN IF NOT EXISTS mlef_serial_no   VARCHAR(50),
  ADD COLUMN IF NOT EXISTS court_case_no    VARCHAR(50);

COMMENT ON COLUMN clinical_examinations.officer_name     IS 'Police officer name accompanying the form';
COMMENT ON COLUMN clinical_examinations.officer_rank     IS 'Police officer rank';
COMMENT ON COLUMN clinical_examinations.officer_badge_no IS 'Police officer badge number';
COMMENT ON COLUMN clinical_examinations.mlef_serial_no   IS 'MLEF serial/reference number';
COMMENT ON COLUMN clinical_examinations.court_case_no    IS 'Court case/code number';

-- ============================================================================
-- 2. Referral Context (Section 2: Referral & Legal Context)
-- ============================================================================

ALTER TABLE clinical_examinations
  ADD COLUMN IF NOT EXISTS referral_category VARCHAR(50)
  CHECK (referral_category IN (
    'trauma', 'domestic_abuse', 'sexual_abuse', 'child_abuse',
    'detainee', 'drug_addiction', 'age_estimation', 'dna_sample',
    'other'
  ));

COMMENT ON COLUMN clinical_examinations.referral_category IS 'Category of referral (in-ward or outpatient)';

-- ============================================================================
-- 3. Physical Exam Fields (Section 3: Physical Examination & Injury Mapping)
-- ============================================================================

ALTER TABLE clinical_examinations
  ADD COLUMN IF NOT EXISTS identification_marks   TEXT,
  ADD COLUMN IF NOT EXISTS thumb_impression_left  TEXT,
  ADD COLUMN IF NOT EXISTS thumb_impression_right TEXT,
  ADD COLUMN IF NOT EXISTS medical_officer_notes  TEXT;

COMMENT ON COLUMN clinical_examinations.identification_marks   IS 'Distinct visual markers (tattoos, scars)';
COMMENT ON COLUMN clinical_examinations.thumb_impression_left  IS 'Left thumb impression (URI)';
COMMENT ON COLUMN clinical_examinations.thumb_impression_right IS 'Right thumb impression (URI)';
COMMENT ON COLUMN clinical_examinations.medical_officer_notes  IS 'Clinical observations recorded at time of exam';

-- ============================================================================
-- 4. Investigations & Follow-up (Section 4: Investigations & Referrals)
-- ============================================================================

ALTER TABLE clinical_examinations
  ADD COLUMN IF NOT EXISTS investigations_notes TEXT,
  ADD COLUMN IF NOT EXISTS follow_up_notes       TEXT;

COMMENT ON COLUMN clinical_examinations.investigations_notes IS 'X-ray/CT findings, toxicology, swab test results';
COMMENT ON COLUMN clinical_examinations.follow_up_notes      IS 'Inward or outpatient review progress notes';

-- ============================================================================
-- 5. Storage Data Checklist (Section 5: Required Storage Data)
-- ============================================================================

ALTER TABLE clinical_examinations
  ADD COLUMN IF NOT EXISTS has_doctor_copy           BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_injury_photos          BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_investigation_findings BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_external_reports       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_court_summons          BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_mlr_copy               BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_certificate_of_receipt  BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN clinical_examinations.has_doctor_copy           IS 'Doctor''s copy of completed MLEF';
COMMENT ON COLUMN clinical_examinations.has_injury_photos          IS 'Clinical injury photographs';
COMMENT ON COLUMN clinical_examinations.has_investigation_findings IS 'Investigation findings and imaging';
COMMENT ON COLUMN clinical_examinations.has_external_reports       IS 'External referral reports';
COMMENT ON COLUMN clinical_examinations.has_court_summons          IS 'Court summons or request forms';
COMMENT ON COLUMN clinical_examinations.has_mlr_copy               IS 'Copy of generated Medico-Legal Report';
COMMENT ON COLUMN clinical_examinations.has_certificate_of_receipt  IS 'Certificate of Receipt (signed/sealed)';

-- ============================================================================
-- 6. Grants
-- ============================================================================

GRANT INSERT, UPDATE ON clinical_examinations TO doctor_role, admin_role;

COMMIT;
