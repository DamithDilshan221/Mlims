// ============================================================================
// MLIMS — Roles & RLS Regression Tests
// ============================================================================

const request = require('supertest');
const app = require('../../src/app');
const { signAccessToken } = require('../../src/utils/jwt');
const { getPool, closeAllPools } = require('../../src/db/pools');

describe('Roles and RLS Regression Coverage', () => {
  let clerkToken;
  let doctorToken;
  let doctorTwoToken;
  
  const drOneId = 1; // Assuming demo_doctor's staff_id is 1
  const drTwoId = 2; // Another doctor

  let adminPool;
  let patientId;
  let sharedCaseId;

  beforeAll(async () => {
    adminPool = getPool('admin');
    
    // Create tokens for our test actors
    clerkToken = signAccessToken({ user_id: 4, role_name: 'records_clerk', staff_id: null });
    doctorToken = signAccessToken({ user_id: 2, role_name: 'doctor', staff_id: drOneId });
    doctorTwoToken = signAccessToken({ user_id: 5, role_name: 'doctor', staff_id: drTwoId });

    // Seed dummy data for RLS tests
    const pRes = await adminPool.query(`
      INSERT INTO patients (full_name, dob, gender, address, nic_search_hash)
      VALUES ('RLS Test Patient', '1990-01-01', 'M', 'Test Address', 'rls_test_hash_' || EXTRACT(EPOCH FROM NOW()))
      RETURNING patient_id;
    `);
    patientId = pRes.rows[0].patient_id;

    const cRes = await adminPool.query(`
      INSERT INTO forensic_cases (patient_id, station_id, case_number, case_type, incident_date, incident_location, status)
      VALUES ($1, (SELECT MIN(station_id) FROM police_stations), $2, 'clinical', '2026-01-01', 'Test Loc', 'under_investigation')
      RETURNING case_id;
    `, [patientId, 'TEST-CASE-RLS2-' + Date.now()]);
    sharedCaseId = cRes.rows[0].case_id;

    // Doctor 1 creates a clinical exam
    await adminPool.query(`
      INSERT INTO clinical_examinations (case_id, doctor_id, exam_date, exam_time)
      VALUES ($1, $2, '2026-01-02', '10:00')
    `, [sharedCaseId, drOneId]);
  });

  afterAll(async () => {
    // Cleanup
    if (sharedCaseId) {
      await adminPool.query(`DELETE FROM clinical_examinations WHERE case_id = $1`, [sharedCaseId]);
      await adminPool.query(`DELETE FROM forensic_cases WHERE case_id = $1`, [sharedCaseId]);
    }
    await adminPool.query(`DELETE FROM patients WHERE patient_id = $1`, [patientId]);
    await closeAllPools();
  });

  describe('POST /patients authorization', () => {
    const dummyPatient = {
      fullName: 'New Clerk Patient',
      dob: '2000-01-01',
      gender: 'M',
      address: '123 Test St',
      nicPassport: '901234567V'
    };

    it('should allow records_clerk to create a patient (201 Created)', async () => {
      // Modify NIC to avoid unique constraint if run multiple times
      const testPatient = { ...dummyPatient, nicPassport: 'TEST' + Date.now() };
      
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${clerkToken}`)
        .send(testPatient);
      
      expect(res.status).toBe(201);
      expect(res.body.full_name).toBe(dummyPatient.fullName);
    });

    it('should PREVENT doctor from creating a patient (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(dummyPatient);
      
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Access denied/i);
    });
  });

  describe('GET /clinical-examinations RLS', () => {
    it('should allow Doctor 1 to fetch clinical exams and see ONLY their own rows (200 OK)', async () => {
      const res = await request(app)
        .get('/api/clinical-examinations')
        .set('Authorization', `Bearer ${doctorToken}`);
      
      expect(res.status).toBe(200);
      
      // Ensure no permission error is returned
      expect(res.body).toBeInstanceOf(Array);
      
      // Ensure all rows belong to doctor_id = 1
      const allBelongToDocOne = res.body.every(exam => exam.doctor_id === drOneId);
      expect(allBelongToDocOne).toBe(true);

      // Ensure they see the record we just seeded
      const foundSeededRecord = res.body.some(exam => exam.case_id === sharedCaseId);
      expect(foundSeededRecord).toBe(true);
    });

    it('should NOT allow Doctor 2 to see Doctor 1\'s clinical exams', async () => {
      const res = await request(app)
        .get('/api/clinical-examinations')
        .set('Authorization', `Bearer ${doctorTwoToken}`);
      
      expect(res.status).toBe(200);
      
      // Ensure they don't see the record seeded by Doctor 1
      const foundSeededRecord = res.body.some(exam => exam.case_id === sharedCaseId);
      expect(foundSeededRecord).toBe(false);
      
      // Ensure all rows they do see belong to them
      const allBelongToDocTwo = res.body.every(exam => exam.doctor_id === drTwoId);
      expect(allBelongToDocTwo).toBe(true);
    });
  });
});
