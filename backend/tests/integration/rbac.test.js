// ============================================================================
// MLIMS — RBAC Integration Tests
// ============================================================================

const request = require('supertest');
const app = require('../../src/app');
const { signAccessToken } = require('../../src/utils/jwt');

describe('RBAC Middleware Enforcement', () => {
  let policeToken;
  let adminToken;

  beforeAll(() => {
    // Mock JWTs for testing role enforcement
    policeToken = signAccessToken({ user_id: 5, role_name: 'police', staff_id: null });
    adminToken = signAccessToken({ user_id: 1, role_name: 'admin', staff_id: null });
  });

  it('should deny police role access to clinical examinations (403)', async () => {
    const res = await request(app)
      .get('/api/clinical-examinations')
      .set('Authorization', `Bearer ${policeToken}`);
    
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Access denied');
    expect(res.body.error).toContain('Required role(s): admin, doctor');
  });

  it('should allow police role to create a case', async () => {
    // We expect a 400 Validation Error or 500 DB error because we send bad data, 
    // but crucially NOT a 401 or 403.
    const res = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${policeToken}`)
      .send({});
    
    // Zod validation should catch the empty body before hitting the DB
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed.');
  });
});
