// ============================================================================
// MLIMS — RLS Integration Tests
// ============================================================================

const request = require('supertest');
const app = require('../../src/app');
const { signAccessToken } = require('../../src/utils/jwt');
const { getPool, closeAllPools } = require('../../src/db/pools');

describe('Database RLS Enforcement', () => {
  let adminPool;
  let drOneToken;
  let drTwoToken;
  let sharedCaseId;
  let drOneId = 1; // Assuming demo_doctor's staff_id is 1
  let drTwoId = 2; // Assuming second doctor's staff_id is 2

  beforeAll(async () => {
    adminPool = getPool('admin');
    
    // Create a shared case directly via DB
    const { rows } = await adminPool.query(`
      INSERT INTO forensic_cases (patient_id, station_id, case_number, case_type, incident_date, incident_location, status)
      VALUES (
        (SELECT MIN(patient_id) FROM patients),
        (SELECT MIN(station_id) FROM police_stations),
        'TEST-CASE-RLS', 'postmortem', '2026-01-01', 'Test Loc', 'under_investigation'
      ) RETURNING case_id;
    `);
    sharedCaseId = rows[0].case_id;

    // Doctor 1 creates a PM exam
    await adminPool.query(`
      INSERT INTO postmortem_examinations (case_id, doctor_id, date_of_pm, time_of_pm)
      VALUES ($1, $2, '2026-01-02', '10:00')
    `, [sharedCaseId, drOneId]);

    // Mock tokens
    drOneToken = signAccessToken({ user_id: 2, role_name: 'doctor', staff_id: drOneId });
    drTwoToken = signAccessToken({ user_id: 3, role_name: 'doctor', staff_id: drTwoId });
  });

  afterAll(async () => {
    await adminPool.query(`DELETE FROM forensic_cases WHERE case_number = 'TEST-CASE-RLS'`);
    await closeAllPools();
  });

  it('should allow Doctor A to see their own postmortem exam', async () => {
    const res = await request(app)
      .get('/api/postmortem-examinations')
      .set('Authorization', `Bearer ${drOneToken}`);
    
    expect(res.status).toBe(200);
    // Should find the record we created
    expect(res.body.some(exam => exam.case_id === sharedCaseId)).toBe(true);
  });

  it('should PREVENT Doctor B from seeing Doctor A\'s postmortem exam', async () => {
    const res = await request(app)
      .get('/api/postmortem-examinations')
      .set('Authorization', `Bearer ${drTwoToken}`);
    
    expect(res.status).toBe(200);
    // Should NOT find the record created by Doctor 1
    expect(res.body.some(exam => exam.case_id === sharedCaseId)).toBe(false);
  });
});
