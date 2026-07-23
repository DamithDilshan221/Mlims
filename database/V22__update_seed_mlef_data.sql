-- ============================================================================
-- MLIMS: V22 — Populate V19 columns on existing seed MLEFs with proper data
-- and add a comprehensive MLEF for case 7 (clinical, registered).
-- ============================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Update MLEF 1 (case 1: assault, registered) with V19 fields
-- ────────────────────────────────────────────────────────────────────────────
UPDATE clinical_examinations SET
    officer_name     = 'Kamal Perera',
    officer_rank     = 'SI',
    officer_badge_no = 'B-1001',
    mlef_serial_no   = 'MLEF-2026-0001',
    court_case_no    = NULL,
    referral_category = 'trauma',
    identification_marks   = 'Appendectomy scar right lower quadrant, tattoo left shoulder',
    thumb_impression_left  = '/assets/thumbs/mlef001_left.png',
    thumb_impression_right = '/assets/thumbs/mlef001_right.png',
    medical_officer_notes  = 'Victim of alleged assault. Multiple contusions on face and right arm. Patient hemodynamically stable, conscious and oriented at time of examination. Injuries consistent with blunt force trauma.',
    investigations_notes   = 'X-ray facial bones AP/lateral — no fracture detected. X-ray right forearm — no fracture detected. Blood drawn for toxicology (results pending at Government Analyst).',
    follow_up_notes        = 'Patient discharged from Ward 12, advised to return for review in 7 days or sooner if symptoms worsen. Orthopaedic referral advised for persistent arm pain.',
    has_doctor_copy           = TRUE,
    has_injury_photos         = TRUE,
    has_investigation_findings = TRUE,
    has_external_reports      = FALSE,
    has_court_summons         = TRUE,
    has_mlr_copy              = FALSE,
    has_certificate_of_receipt = FALSE
WHERE mlef_id = 1;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Update MLEF 2 (case 2: RTA, under_investigation) with V19 fields
-- ────────────────────────────────────────────────────────────────────────────
UPDATE clinical_examinations SET
    officer_name     = 'Nimal Jayasuriya',
    officer_rank     = 'PC',
    officer_badge_no = 'B-2002',
    mlef_serial_no   = 'MLEF-2026-0002',
    court_case_no    = 'MC/KAN/2026/B/0456',
    referral_category = 'trauma',
    identification_marks   = 'Tattoo "Kumari" on left forearm, pierced left ear',
    thumb_impression_left  = '/assets/thumbs/mlef002_left.png',
    thumb_impression_right = '/assets/thumbs/mlef002_right.png',
    medical_officer_notes  = 'Road traffic accident — pedestrian struck by three-wheeler. Compound fracture left tibia with moderate soft tissue swelling. Multiple abrasions left knee and lower leg. Patient conscious, oriented, reporting pain 7/10.',
    investigations_notes   = 'X-ray left tibia/fibula AP/lateral — transverse mid-shaft fracture of left tibia, fibula intact. Blood alcohol: 0.08 g/dL (positive). Toxicology screen pending. Orthopaedic review requested.',
    follow_up_notes        = 'Transferred to Orthopaedic Ward for surgical management (intramedullary nailing planned). Post-operative physiotherapy scheduled.',
    has_doctor_copy           = TRUE,
    has_injury_photos         = TRUE,
    has_investigation_findings = TRUE,
    has_external_reports      = TRUE,
    has_court_summons         = TRUE,
    has_mlr_copy              = FALSE,
    has_certificate_of_receipt = FALSE
WHERE mlef_id = 2;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Update MLEF 3 (case 3: domestic violence, completed) with V19 fields
-- ────────────────────────────────────────────────────────────────────────────
UPDATE clinical_examinations SET
    officer_name     = 'Samantha Fonseka',
    officer_rank     = 'WPC',
    officer_badge_no = 'B-3003',
    mlef_serial_no   = 'MLEF-2026-0003',
    court_case_no    = 'MC/COL/2026/B/1234',
    referral_category = 'domestic_abuse',
    identification_marks   = 'Birthmark 2 cm diameter left cheek, scar from C-section',
    thumb_impression_left  = '/assets/thumbs/mlef003_left.png',
    thumb_impression_right = '/assets/thumbs/mlef003_right.png',
    medical_officer_notes  = 'Alleged domestic violence — patient reports assault by spouse. 4 cm linear laceration on forehead with clean edges, likely from a ring or hard object. Multiple oval contusions on both upper arms consistent with grabbing/restraint. Patient tearful but cooperative. No signs of head injury (GCS 15/15).',
    investigations_notes   = 'CT head plain — no intracranial abnormality. X-ray facial bones — no fracture. Wound swab taken for culture. Photographs of injuries taken for evidence.',
    follow_up_notes        = 'Referred to Psychiatry for PTSD assessment. Social Services notified per mandatory reporting requirements. Review in 2 weeks for wound check and suture removal.',
    has_doctor_copy           = TRUE,
    has_injury_photos         = TRUE,
    has_investigation_findings = TRUE,
    has_external_reports      = TRUE,
    has_court_summons         = TRUE,
    has_mlr_copy              = TRUE,
    has_certificate_of_receipt = TRUE
WHERE mlef_id = 3;

COMMIT;