// ============================================================================
// MLIMS — Auth Integration Tests
// ============================================================================

const request = require('supertest');
const app = require('../../src/app');
const { getPool, closeAllPools } = require('../../src/db/pools');

describe('Auth & Security: Login Lockout', () => {
  let server;
  let adminPool;

  beforeAll(async () => {
    adminPool = getPool('admin');
    server = app.listen(0);
    
    // Setup: ensure we have a fresh target user to lock out
    await adminPool.query(`
      DELETE FROM users WHERE username = 'test.lockout';
      INSERT INTO users (role_id, username, password_hash, is_active)
      VALUES ((SELECT role_id FROM roles WHERE role_name = 'records_clerk'), 'test.lockout', 'fakepasswordhash', true);
    `);
  });

  afterAll(async () => {
    // Cleanup
    await adminPool.query(`DELETE FROM users WHERE username = 'test.lockout'`);
    server.close();
    await closeAllPools();
  });

  it('should lock the account after 5 failed login attempts', async () => {
    // 5 failed attempts
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'test.lockout', password: 'wrongpassword' });
      
      if (i < 4) {
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid credentials.');
      } else {
        // The 5th failure triggers the lockout
        expect(res.status).toBe(423);
        expect(res.body.error).toBe('Account locked due to too many failed attempts.');
      }
    }

    // 6th attempt should instantly return 423 without checking password
    const res6 = await request(app)
      .post('/api/auth/login')
      .send({ username: 'test.lockout', password: 'correctpassword_but_locked' });
    
    expect(res6.status).toBe(423);
    expect(res6.body.error).toBe('Account is locked or deactivated.');

    // Verify DB state
    const { rows } = await adminPool.query(`SELECT is_active FROM users WHERE username = 'test.lockout'`);
    expect(rows[0].is_active).toBe(false);

    // Verify audit log has the ACCOUNT_LOCKED event
    const { rows: auditRows } = await adminPool.query(`
      SELECT * FROM audit_logs 
      WHERE action_type = 'ACCOUNT_LOCKED' 
      AND record_id = (SELECT user_id FROM users WHERE username = 'test.lockout')
    `);
    expect(auditRows.length).toBeGreaterThan(0);
  });
});
