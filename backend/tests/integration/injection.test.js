// ============================================================================
// MLIMS — SQL Injection Prevention Tests
// ============================================================================

const request = require('supertest');
const app = require('../../src/app');

describe('SQL Injection Prevention', () => {
  it('should safely reject SQL injection in login username', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: "admin' OR '1'='1", password: "password" });
    
    expect(res.status).toBe(401); // Safe rejection, no DB syntax error
  });

  it('should safely reject SQL injection in GET path parameter', async () => {
    const res = await request(app)
      .get('/api/cases/1; DROP TABLE users;')
      // Unauthenticated is fine, we want to see if the param validation catches it
      // before it even hits the auth layer, or if it hits the DB safely.
      // In our setup, Zod params validation will catch it.
      .send();
    
    // Zod forces it to be a positive number
    expect(res.status).toBe(400); 
    expect(res.body.error).toBe('Validation failed.');
  });

  it('should safely reject SQL injection in query strings', async () => {
    // Generate a valid token just to get past auth
    const { signAccessToken } = require('../../src/utils/jwt');
    const token = signAccessToken({ user_id: 1, role_name: 'admin', staff_id: null });

    const res = await request(app)
      .get('/api/search?q=foo\'; DROP TABLE cases;--&type=case')
      .set('Authorization', `Bearer ${token}`);
    
    // It should just execute the search for the literal string "foo'; DROP TABLE cases;--"
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
