// ============================================================================
// MLIMS — Transaction Helper with SET LOCAL for Session Variables
//
// CRITICAL: Do NOT use pool.query() for authenticated requests.
// pool.query() can silently hand back a *different* pooled connection
// between calls, which breaks the SET app.current_user_id /
// app.current_staff_id session variables that Phase 1's audit triggers
// and RLS policies depend on. Worse, a plain SET (not SET LOCAL) would
// leak into whichever unrelated request reuses that connection next.
//
// This helper:
//   1. Acquires a dedicated client from the pool
//   2. BEGINs a transaction
//   3. SET LOCAL app.current_user_id = userId   (transaction-scoped)
//   4. SET LOCAL app.current_staff_id = staffId (if provided, for RLS)
//   5. Runs the caller's function with the client
//   6. COMMITs (or ROLLBACKs on error)
//   7. Releases the client back to the pool
//
// SET LOCAL is transaction-scoped — it can NEVER bleed into the next
// request on a reused connection.
// ============================================================================

/**
 * Execute `fn(client)` inside a transaction with Phase 1 session variables.
 *
 * @param {import('pg').Pool} pool     — the role-specific pool
 * @param {number|null}       userId   — app.current_user_id for audit trigger
 * @param {number|null}       staffId  — app.current_staff_id for RLS (doctors)
 * @param {(client: import('pg').PoolClient) => Promise<any>} fn — the work
 * @returns {Promise<any>} — whatever fn returns
 */
async function withTransaction(pool, userId, staffId, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // SET LOCAL is transaction-scoped — safe for pooled connections.
    // The audit trigger (fn_audit_trigger) reads app.current_user_id to
    // attribute every INSERT/UPDATE/DELETE to the acting user.
    if (userId != null) {
      await client.query(`SET LOCAL app.current_user_id = '${parseInt(userId, 10)}'`);
    }

    // The RLS policies on clinical_examinations and postmortem_examinations
    // check: doctor_id = current_setting('app.current_staff_id')::int
    // This restricts doctors to their own cases at the DATABASE level.
    if (staffId != null) {
      await client.query(`SET LOCAL app.current_staff_id = '${parseInt(staffId, 10)}'`);
    }

    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Execute a read-only query without session variables (for public/lookup routes).
 * Still uses a dedicated client for consistency.
 *
 * @param {import('pg').Pool} pool
 * @param {(client: import('pg').PoolClient) => Promise<any>} fn
 * @returns {Promise<any>}
 */
async function withClient(pool, fn) {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

module.exports = { withTransaction, withClient };
