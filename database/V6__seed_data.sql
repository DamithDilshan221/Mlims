-- ============================================================================
-- MLIMS — Medico-Legal Information Management System
-- 06_seed_data.sql — Realistic Sample Data
-- PostgreSQL 15+
--
-- This seed file populates the database with realistic Sri Lankan medico-legal
-- data for development and demonstration. It includes:
--   • 7 application roles, 8 users, 4 staff (doctor, doctor, lab tech, clerk)
--   • 5 police stations, 4 courts, 8 injury types, 6 weapon types, 5 specimen types
--   • 6 patients, 6 forensic cases (3 clinical, 3 postmortem)
--   • One FULL clinical chain:
--       case → clinical_exam → exam_injuries → medico_legal_report → court_receipt
--   • One FULL postmortem chain:
--       case → postmortem_exam → causes_of_death → deceased_identification →
--       exam_injuries → specimen → chain_of_custody → lab_request → lab_result →
--       court_receipt
--
-- IMPORTANT — Encrypted PII columns:
-- In production, nic_passport_enc and nic_enc contain AES-256-GCM ciphertext
-- produced at the application layer. For seed data, we use placeholder BYTEA
-- values (hex-encoded strings) to simulate encrypted data. The nic_search_hash
-- columns contain placeholder HMAC-SHA256 hex digests.
-- ============================================================================
-- MLIMS Phase 1: Seed Data
--
-- WARNING: This script contains ONLY fabricated, anonymized test data designed 
-- for development and testing purposes. Do not run this script in a production 
-- environment. No real PII or clinical data exists in this file.
-- ============================================================================

BEGIN;

-- Set session variable for audit trigger attribution
SET app.current_user_id = '1';

-- ============================================================================
-- MODULE 1 — Roles & Users
-- ============================================================================

INSERT INTO roles (role_id, role_name, description) VALUES
    (1, 'admin',          'System Administrator — full system access'),
    (2, 'doctor',         'Medical Doctor / Judicial Medical Officer'),
    (3, 'forensic_staff', 'Forensic Laboratory Staff — evidence & lab workflow'),
    (4, 'police',         'Police Officer — case registration & uploads'),
    (5, 'court',          'Court Official — read-only report access'),
    (6, 'records_clerk',  'Records Management Clerk — patient & case admin'),
    (7, 'auditor',        'System Auditor — read-only audit trail access');

-- Reset the sequence to continue after our explicit IDs
SELECT setval('roles_role_id_seq', (SELECT MAX(role_id) FROM roles));

-- ─────────────────────────────────────────────────────────────────────────────
-- password_hash: these are placeholder bcrypt hashes representing the
-- password "Password@123". In production, the application layer (Phase 2)
-- generates bcrypt hashes at registration time. Passwords are NEVER hashed
-- or stored via SQL.
--
-- Example bcrypt hash: $2b$12$LJ3m4ys3Lk.YhMqCf1sKjO... (60 chars)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO users (user_id, role_id, username, password_hash, is_active, last_login) VALUES
    (1, 1, 'admin.system',    '$2b$12$PLACEHOLDER_HASH_admin_system_0000000000000000', TRUE,  '2026-07-20 08:00:00'),
    (2, 2, 'dr.wijesinghe',   '$2b$12$PLACEHOLDER_HASH_dr_wijesinghe_000000000000000', TRUE,  '2026-07-22 09:15:00'),
    (3, 2, 'dr.herath',       '$2b$12$PLACEHOLDER_HASH_dr_herath_00000000000000000000', TRUE,  '2026-07-21 14:30:00'),
    (4, 3, 'lab.malinga',     '$2b$12$PLACEHOLDER_HASH_lab_malinga_0000000000000000000', TRUE,  '2026-07-22 07:45:00'),
    (5, 4, 'ofc.perera',      '$2b$12$PLACEHOLDER_HASH_ofc_perera_00000000000000000000', TRUE,  '2026-07-19 16:00:00'),
    (6, 5, 'reg.fernando',    '$2b$12$PLACEHOLDER_HASH_reg_fernando_000000000000000000', TRUE,  '2026-07-18 10:00:00'),
    (7, 6, 'clerk.silva',     '$2b$12$PLACEHOLDER_HASH_clerk_silva_0000000000000000000', TRUE,  '2026-07-22 08:30:00'),
    (8, 7, 'audit.jayasuriya','$2b$12$PLACEHOLDER_HASH_audit_jayasuriya_00000000000000', TRUE,  '2026-07-20 11:00:00');

SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM users));

-- Staff profiles (only for users who need clinical/lab/admin profiles)
INSERT INTO staff (staff_id, user_id, first_name, last_name, designation, contact_no, slmc_reg_no) VALUES
    (1, 2, 'Samantha',  'Wijesinghe', 'Judicial Medical Officer',        '0771234567', 'SLMC-2015-12345'),
    (2, 3, 'Priyanka',  'Herath',     'Consultant Forensic Pathologist', '0779876543', 'SLMC-2010-67890'),
    (3, 4, 'Lasith',    'Malinga',    'Senior Lab Technician',           '0761112233', 'SLMC-2018-11223'),
    (4, 7, 'Kamal',     'Silva',      'Records Clerk',                   '0754445566', 'SLMC-2020-44556');

SELECT setval('staff_staff_id_seq', (SELECT MAX(staff_id) FROM staff));


-- ============================================================================
-- MODULE 2 — Master & Lookup Data
-- ============================================================================

INSERT INTO police_stations (station_id, station_name, area, contact_no) VALUES
    (1, 'Colombo Fort Police Station',    'Colombo',                '011-2433333'),
    (2, 'Kandy Police Station',           'Kandy',                  '081-2222222'),
    (3, 'Galle Police Station',           'Galle',                  '091-2222222'),
    (4, 'Nugegoda Police Station',        'Nugegoda',               '011-2850222'),
    (5, 'Mount Lavinia Police Station',   'Dehiwala-Mount Lavinia', '011-2713222');

SELECT setval('police_stations_station_id_seq', (SELECT MAX(station_id) FROM police_stations));

INSERT INTO courts (court_id, court_name, court_type, location) VALUES
    (1, 'Colombo Magistrate''s Court',  'magistrate', 'Colombo'),
    (2, 'Kandy High Court',             'high',       'Kandy'),
    (3, 'Galle Magistrate''s Court',    'magistrate', 'Galle'),
    (4, 'Colombo High Court',           'high',       'Colombo');

SELECT setval('courts_court_id_seq', (SELECT MAX(court_id) FROM courts));

INSERT INTO injury_types (injury_type_id, name) VALUES
    (1, 'Laceration'),
    (2, 'Contusion'),
    (3, 'Abrasion'),
    (4, 'Fracture'),
    (5, 'Incised Wound'),
    (6, 'Stab Wound'),
    (7, 'Burn'),
    (8, 'Gunshot Wound');

SELECT setval('injury_types_injury_type_id_seq', (SELECT MAX(injury_type_id) FROM injury_types));

INSERT INTO weapon_types (weapon_type_id, name) VALUES
    (1, 'Knife'),
    (2, 'Blunt Object'),
    (3, 'Firearm'),
    (4, 'Sharp Weapon'),
    (5, 'Ligature'),
    (6, 'Hands/Fists');

SELECT setval('weapon_types_weapon_type_id_seq', (SELECT MAX(weapon_type_id) FROM weapon_types));

INSERT INTO specimen_types (specimen_type_id, name) VALUES
    (1, 'Blood'),
    (2, 'Urine'),
    (3, 'Hair'),
    (4, 'Tissue Sample'),
    (5, 'Swab');

SELECT setval('specimen_types_specimen_type_id_seq', (SELECT MAX(specimen_type_id) FROM specimen_types));


-- ============================================================================
-- MODULE 3 — Patients & Forensic Cases
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Encrypted PII columns: In production, the application layer (Node.js)
-- encrypts NIC/passport values with AES-256-GCM (key from env variable)
-- and computes the HMAC-SHA256 search hash. Here, we use placeholder
-- hex values to simulate encrypted data.
--
-- The age column is auto-calculated by the fn_recalculate_age() trigger
-- from the dob value, so we do NOT set it explicitly.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO patients (patient_id, full_name, dob, gender, address, nic_passport_enc, nic_search_hash) VALUES
    (1, 'Amal Perera',         '1985-03-15', 'M', '42 Galle Road, Colombo 03',
        E'\\xA1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4', 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2'),
    (2, 'Kumari Silva',        '1990-07-22', 'F', '15 Temple Street, Kandy',
        E'\\xB2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5', 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3'),
    (3, 'Nimal Fernando',      '1978-11-08', 'M', '88 Beach Road, Galle',
        E'\\xC3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6', 'c3d4e5f6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4'),
    (4, 'Dilani Jayawardena',  '2000-01-30', 'F', '7 High Level Road, Nugegoda',
        E'\\xD4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1', 'd4e5f6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5'),
    (5, 'Ruwan Bandara',       '1965-09-12', 'M', '33 Station Road, Mount Lavinia',
        E'\\xE5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2', 'e5f6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6'),
    (6, 'Chaminda Vaas',       '1972-04-05', 'M', '21 Flower Road, Colombo 07',
        E'\\xF6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3', 'f6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7');

SELECT setval('patients_patient_id_seq', (SELECT MAX(patient_id) FROM patients));

-- 6 forensic cases: 3 clinical, 3 postmortem
INSERT INTO forensic_cases (case_id, patient_id, station_id, case_number, case_type, incident_date, incident_location, status) VALUES
    -- Clinical cases
    (1, 1, 1, 'CASE-20260101-0001', 'clinical',   '2026-01-01', 'Colombo Fort, near Main Street',      'registered'),
    (2, 2, 2, 'CASE-20260115-0001', 'clinical',   '2026-01-14', 'Kandy, Peradeniya Road junction',     'under_investigation'),
    (3, 4, 4, 'CASE-20260201-0001', 'clinical',   '2026-01-31', 'Nugegoda, High Level Road',           'completed'),
    -- Postmortem cases
    (4, 3, 3, 'CASE-20260110-0001', 'postmortem', '2026-01-09', 'Galle, Unawatuna Beach',              'under_investigation'),
    (5, 5, 5, 'CASE-20260205-0001', 'postmortem', '2026-02-04', 'Mount Lavinia, Hotel Road',           'pending_report'),
    (6, 6, 1, 'CASE-20260301-0001', 'postmortem', '2026-02-28', 'Colombo 07, Flower Road residence',   'completed');

SELECT setval('forensic_cases_case_id_seq', (SELECT MAX(case_id) FROM forensic_cases));

-- Digital assets for a few cases
INSERT INTO digital_assets (asset_id, case_id, file_name, file_uri, file_type, upload_date) VALUES
    (1, 1, 'scene_photo_001.jpg',   '/uploads/cases/1/scene_photo_001.jpg',   'image/jpeg', '2026-01-01 10:30:00'),
    (2, 1, 'police_report.pdf',     '/uploads/cases/1/police_report.pdf',     'application/pdf', '2026-01-01 11:00:00'),
    (3, 3, 'injury_photo_001.jpg',  '/uploads/cases/3/injury_photo_001.jpg',  'image/jpeg', '2026-02-01 09:15:00'),
    (4, 6, 'scene_photo_pm_001.jpg','/uploads/cases/6/scene_photo_pm_001.jpg','image/jpeg', '2026-03-01 08:00:00'),
    (5, 6, 'autopsy_report_draft.pdf','/uploads/cases/6/autopsy_report_draft.pdf','application/pdf', '2026-03-02 14:00:00');

SELECT setval('digital_assets_asset_id_seq', (SELECT MAX(asset_id) FROM digital_assets));


-- ============================================================================
-- MODULE 4 — Clinical Examinations (cases 1, 2, 3)
-- ============================================================================

INSERT INTO clinical_examinations (mlef_id, case_id, doctor_id, exam_date, exam_time, ward, bht_no, discharge_date, patient_consent, brief_history, alcohol_influence, drug_influence, sexual_assault) VALUES
    (1, 1, 1, '2026-01-01', '14:30:00', 'Ward 12',  'BHT-2026-0451', NULL,          TRUE,
        'Patient brought by police following an assault near Main Street. Sustained injuries to the face and right arm.',
        'None detected', 'None detected', FALSE),
    (2, 2, 1, '2026-01-15', '10:00:00', 'Ward 08',  'BHT-2026-0789', '2026-01-17',  TRUE,
        'Road traffic accident victim. Multiple abrasions and a fractured left tibia.',
        'Mild smell of alcohol', 'None detected', FALSE),
    (3, 3, 1, '2026-02-01', '09:00:00', 'Ward 05',  'BHT-2026-1102', '2026-02-03',  TRUE,
        'Domestic violence victim with multiple contusions and a laceration on the forehead. Patient reports being struck with a blunt object.',
        'None detected', 'None detected', FALSE);

SELECT setval('clinical_examinations_mlef_id_seq', (SELECT MAX(mlef_id) FROM clinical_examinations));

-- Medical referrals for case 2 (RTA — needs orthopaedic follow-up)
INSERT INTO medical_referrals (referral_id, mlef_id, specialty, referral_date, review_notes) VALUES
    (1, 2, 'Orthopaedics', '2026-01-16', 'Referred for tibial fracture assessment. X-ray confirms transverse fracture of the left tibia. Needs casting and follow-up in 6 weeks.'),
    (2, 2, 'Physiotherapy', '2026-01-17', 'Post-discharge physiotherapy recommended for mobility recovery.');

SELECT setval('medical_referrals_referral_id_seq', (SELECT MAX(referral_id) FROM medical_referrals));

-- ─────────────────────────────────────────────────────────────────────────────
-- Medico-Legal Report for case 3 (completed clinical chain)
-- This completes the clinical chain:
--   case 3 → clinical_exam (mlef_id=3) → medico_legal_report → court_receipt
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO medico_legal_reports (mlr_id, mlef_id, court_id, court_case_no, serial_no, trial_date, issue_date, final_opinion, is_grievous_311) VALUES
    (1, 3, 1, 'MC/COL/2026/B/1234', 'MLR-2026-001', '2026-04-15', '2026-02-10',
     'The injuries sustained by the patient are consistent with being struck by a blunt object. '
     'The laceration on the forehead (4 cm, requiring sutures) and multiple contusions on the '
     'upper arms and back are classified as non-grievous hurt under Section 310 of the Penal Code. '
     'The injuries do not endanger life but are significant enough to require medical treatment.',
     FALSE);

SELECT setval('medico_legal_reports_mlr_id_seq', (SELECT MAX(mlr_id) FROM medico_legal_reports));


-- ============================================================================
-- MODULE 5 — Postmortem Examinations (cases 4, 5, 6)
-- ============================================================================

INSERT INTO postmortem_examinations (pmr_id, case_id, doctor_id, inquest_no, ordered_by, date_of_pm, time_of_pm, date_of_death, place_of_death, manner_of_death, rigor_mortis, hypostasis, putrefaction, anatomical_notes) VALUES
    (1, 4, 2, 'INQ-2026-0078', 'Magistrate, Galle', '2026-01-11', '10:00:00', '2026-01-09',
        'Unawatuna Beach, Galle', 'Homicide',
        'Present in all limbs — consistent with 12-24 hours post-mortem',
        'Fixed, posterior, consistent with supine position',
        'Absent',
        '{"external": "Multiple sharp-force injuries on the chest and abdomen", "internal": "Left lung punctured, massive hemothorax (1500 mL blood)"}'),
    (2, 5, 2, 'INQ-2026-0112', 'Magistrate, Mount Lavinia', '2026-02-06', '09:30:00', '2026-02-04',
        'Mount Lavinia, Hotel Road (private residence)', 'Under investigation',
        'Fully developed — estimated 24-36 hours post-mortem',
        'Fixed, anterior, consistent with prone position',
        'Early signs of decomposition',
        '{"external": "No visible injuries. Cyanosis of lips and nail beds.", "internal": "Cerebral edema, pulmonary congestion. No evidence of trauma."}'),
    (3, 6, 2, 'INQ-2026-0156', 'Magistrate, Colombo Fort', '2026-03-02', '08:00:00', '2026-02-28',
        'Colombo 07, Flower Road residence', 'Homicide',
        'Passing off in upper limbs, present in lower — consistent with 18-24 hours',
        'Fixed, posterior',
        'Absent',
        '{"external": "Single stab wound to the left thorax, 3 cm in length, between 5th and 6th ribs. Defense wounds on both forearms.", "internal": "Penetrating wound to the left ventricle. Massive hemopericardium (800 mL). Both lungs congested."}');

SELECT setval('postmortem_examinations_pmr_id_seq', (SELECT MAX(pmr_id) FROM postmortem_examinations));

-- ─────────────────────────────────────────────────────────────────────────────
-- Causes of death for postmortem cases 4 and 6 (completed)
-- Case 5 is "under investigation" — cause of death not yet determined,
-- demonstrating the workflow-delayed total participation.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO causes_of_death (cod_id, pmr_id, immediate_cause, antecedent_cause, contributory, under_investigation) VALUES
    (1, 1, 'Hemorrhagic shock due to massive hemothorax',
           'Penetrating sharp-force injury to the left lung',
           NULL, FALSE),
    (2, 3, 'Cardiac tamponade due to hemopericardium',
           'Penetrating stab wound to the left ventricle',
           'No contributory factors identified', FALSE);

SELECT setval('causes_of_death_cod_id_seq', (SELECT MAX(cod_id) FROM causes_of_death));

-- Deceased identifications (persons who identified the body)
INSERT INTO deceased_identifications (identification_id, pmr_id, identifier_name, identifier_address, relationship, nic_enc, nic_search_hash) VALUES
    (1, 1, 'Sanduni Fernando', '88 Beach Road, Galle', 'Spouse',
        E'\\xAA11BB22CC33DD44EE55FF66AA11BB22', 'aa11bb22cc33dd44ee55ff66aa11bb22cc33dd44ee55ff66aa11bb22cc33dd44'),
    (2, 3, 'Tharanga Vaas',    '21 Flower Road, Colombo 07', 'Brother',
        E'\\xBB22CC33DD44EE55FF66AA11BB22CC33', 'bb22cc33dd44ee55ff66aa11bb22cc33dd44ee55ff66aa11bb22cc33dd44ee55'),
    (3, 3, 'Nilmini Perera',   '45 Park Avenue, Colombo 05', 'Colleague',
        E'\\xCC33DD44EE55FF66AA11BB22CC33DD44', 'cc33dd44ee55ff66aa11bb22cc33dd44ee55ff66aa11bb22cc33dd44ee55ff66');

SELECT setval('deceased_identifications_identification_id_seq', (SELECT MAX(identification_id) FROM deceased_identifications));


-- ============================================================================
-- MODULE 6 — Exam Injuries
-- ============================================================================

-- Clinical exam injuries (mlef_id set, pmr_id NULL)
INSERT INTO exam_injuries (exam_injury_id, mlef_id, pmr_id, injury_type_id, weapon_type_id, body_part, size_and_shape, category_of_hurt, endangers_life) VALUES
    -- Case 1, mlef_id=1: assault injuries
    (1, 1, NULL, 2, 6, 'Right cheek',    '3x2 cm oval contusion',       'Non-grievous', FALSE),
    (2, 1, NULL, 3, 6, 'Right forearm',  '5x1 cm linear abrasion',      'Non-grievous', FALSE),
    -- Case 2, mlef_id=2: RTA injuries
    (3, 2, NULL, 3, NULL, 'Left knee',      '8x4 cm irregular abrasion',   'Non-grievous', FALSE),
    (4, 2, NULL, 4, NULL, 'Left tibia',     'Transverse fracture, mid-shaft', 'Grievous',  FALSE),
    -- Case 3, mlef_id=3: domestic violence (FULL CLINICAL CHAIN)
    (5, 3, NULL, 1, 2, 'Forehead',       '4 cm laceration, irregular edges', 'Non-grievous', FALSE),
    (6, 3, NULL, 2, 2, 'Right upper arm','6x3 cm oval contusion',       'Non-grievous', FALSE),
    (7, 3, NULL, 2, 2, 'Left upper arm', '5x3 cm oval contusion',       'Non-grievous', FALSE);

-- Postmortem exam injuries (pmr_id set, mlef_id NULL)
INSERT INTO exam_injuries (exam_injury_id, mlef_id, pmr_id, injury_type_id, weapon_type_id, body_part, size_and_shape, category_of_hurt, endangers_life) VALUES
    -- Case 4, pmr_id=1: homicide (sharp-force)
    (8,  NULL, 1, 6, 1, 'Left anterior chest',   '3 cm stab wound, between 4th-5th ribs', 'Fatal', TRUE),
    (9,  NULL, 1, 5, 1, 'Right anterior chest',  '5 cm incised wound, superficial',         'Grievous', FALSE),
    (10, NULL, 1, 5, 1, 'Left abdomen',           '4 cm incised wound, 2 cm deep',           'Grievous', TRUE),
    -- Case 6, pmr_id=3: homicide — stab wound (FULL POSTMORTEM CHAIN)
    (11, NULL, 3, 6, 1, 'Left thorax',            '3 cm stab wound between 5th-6th ribs',    'Fatal', TRUE),
    (12, NULL, 3, 5, 4, 'Right forearm',           '7 cm incised wound — defense wound',      'Grievous', FALSE),
    (13, NULL, 3, 5, 4, 'Left forearm',            '5 cm incised wound — defense wound',      'Grievous', FALSE);

SELECT setval('exam_injuries_exam_injury_id_seq', (SELECT MAX(exam_injury_id) FROM exam_injuries));


-- ============================================================================
-- MODULE 7 — Evidence, Specimens, Lab Work (for postmortem chain, case 6)
-- ============================================================================

INSERT INTO specimens (specimen_id, case_id, specimen_type_id, barcode_id, quantity, collection_date, current_location) VALUES
    (1, 6, 1, 'SPEC-2026-0001', '10 mL',      '2026-03-02 09:00:00', 'Government Analyst Department'),
    (2, 6, 2, 'SPEC-2026-0002', '15 mL',      '2026-03-02 09:05:00', 'MLIMS Specimen Store'),
    (3, 6, 4, 'SPEC-2026-0003', '5 g',        '2026-03-02 09:10:00', 'Government Analyst Department'),
    -- Specimens for case 4 (postmortem — Galle homicide)
    (4, 4, 1, 'SPEC-2026-0004', '10 mL',      '2026-01-11 11:00:00', 'MLIMS Specimen Store'),
    (5, 4, 3, 'SPEC-2026-0005', '5 strands',  '2026-01-11 11:05:00', 'MLIMS Specimen Store');

SELECT setval('specimens_specimen_id_seq', (SELECT MAX(specimen_id) FROM specimens));

-- Chain of custody for specimen 1 (case 6 — full postmortem chain)
INSERT INTO chain_of_custody (custody_id, specimen_id, transferred_by, transferred_to, transfer_date, purpose, receipt_uri) VALUES
    (1, 1, 3, 'MLIMS Specimen Store',              '2026-03-02 09:30:00', 'Initial collection and storage',    '/receipts/custody/COC-2026-001.pdf'),
    (2, 1, 3, 'Government Analyst Department',      '2026-03-05 10:00:00', 'Toxicology analysis',               '/receipts/custody/COC-2026-002.pdf'),
    -- Chain for specimen 3 (tissue, case 6)
    (3, 3, 3, 'MLIMS Specimen Store',              '2026-03-02 09:35:00', 'Initial collection and storage',    '/receipts/custody/COC-2026-003.pdf'),
    (4, 3, 3, 'Government Analyst Department',      '2026-03-06 08:00:00', 'Histopathology analysis',           '/receipts/custody/COC-2026-004.pdf');

SELECT setval('chain_of_custody_custody_id_seq', (SELECT MAX(custody_id) FROM chain_of_custody));

-- Lab requests
INSERT INTO lab_requests (request_id, specimen_id, request_type, request_date, govt_analyst_ref, clinical_notes, status) VALUES
    (1, 1, 'Toxicology',       '2026-03-05', 'GA-REF-2026-0451',
        'Blood sample from deceased (case 6). Check for ethanol, common poisons, and drugs of abuse.',
        'completed'),
    (2, 3, 'Histopathology',   '2026-03-06', 'GA-REF-2026-0452',
        'Tissue sample from stab wound margins. Confirm vital reaction and wound age estimation.',
        'completed'),
    (3, 4, 'Toxicology',       '2026-01-12', 'GA-REF-2026-0098',
        'Blood sample from deceased (case 4). Full toxicology screen.',
        'pending');

SELECT setval('lab_requests_request_id_seq', (SELECT MAX(request_id) FROM lab_requests));

-- Lab results (for completed requests only — demonstrates the 1:1 relationship)
INSERT INTO lab_results (result_id, request_id, findings, diagnosis, received_date, document_uri) VALUES
    (1, 1,
        'Blood alcohol level: 0.15 g/dL (above legal limit). '
        'No common poisons detected. Cannabis metabolites (THC-COOH) detected at 45 ng/mL.',
        'Positive for ethanol and cannabis. No evidence of acute poisoning.',
        '2026-03-20', '/reports/lab/LAB-2026-0451.pdf'),
    (2, 2,
        'Histological examination of wound margins shows vital reaction (inflammatory cell infiltration, '
        'hemorrhage within tissue planes). Wound edges show clean incision consistent with a sharp instrument. '
        'Estimated wound age: 6-12 hours ante-mortem.',
        'Vital wound, inflicted ante-mortem. Consistent with sharp-force injury.',
        '2026-03-25', '/reports/lab/LAB-2026-0452.pdf');

SELECT setval('lab_results_result_id_seq', (SELECT MAX(result_id) FROM lab_results));


-- ============================================================================
-- MODULE 8 — Court Receipts
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- FULL CLINICAL CHAIN COMPLETION:
--   Case 3 → clinical_exam (mlef_id=3) → MLR (mlr_id=1) → court_receipt
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO court_receipts (receipt_id, mlr_id, pmr_id, court_id, trial_date, received_date, registrar_sign) VALUES
    (1, 1, NULL, 1, '2026-04-15', '2026-02-15', 'R. K. Dissanayake — Registrar');

-- ─────────────────────────────────────────────────────────────────────────────
-- FULL POSTMORTEM CHAIN COMPLETION:
--   Case 6 → postmortem_exam (pmr_id=3) → court_receipt (directly)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO court_receipts (receipt_id, mlr_id, pmr_id, court_id, trial_date, received_date, registrar_sign) VALUES
    (2, NULL, 3, 4, '2026-05-20', '2026-03-30', 'S. M. Jayasinghe — Registrar');

SELECT setval('court_receipts_receipt_id_seq', (SELECT MAX(receipt_id) FROM court_receipts));


-- ============================================================================
-- Notifications (sample)
-- ============================================================================

INSERT INTO notifications (notification_id, user_id, subject, message, due_date, is_read) VALUES
    (1, 2, 'Pending MLR — Case CASE-20260101-0001',
        'Clinical examination for case CASE-20260101-0001 is complete but the Medico-Legal Report has not been issued yet. Please complete the MLR at your earliest convenience.',
        '2026-02-01', FALSE),
    (2, 2, 'Pending MLR — Case CASE-20260115-0001',
        'Clinical examination for case CASE-20260115-0001 is complete. MLR pending.',
        '2026-02-15', FALSE),
    (3, 4, 'Lab Result Pending — Specimen SPEC-2026-0004',
        'Toxicology results for specimen SPEC-2026-0004 (case 4) are still pending. Follow up with the Government Analyst Department.',
        '2026-02-12', TRUE),
    (4, 1, 'System Maintenance Notice',
        'Scheduled database maintenance window: 2026-08-01 02:00-04:00 UTC. Expect brief downtime.',
        '2026-08-01', FALSE);

SELECT setval('notifications_notification_id_seq', (SELECT MAX(notification_id) FROM notifications));


-- Reset the session variable
RESET app.current_user_id;

COMMIT;
