// ============================================================================
// MLIMS — Per-Role PostgreSQL Connection Pools
//
// One pg.Pool per Phase 1 PostgreSQL role, keyed by application role_name.
// Each pool connects as the corresponding Phase 1 demo login user
// (demo_admin, demo_doctor, etc.), which inherits the group role's GRANTs
// and RLS policies.
//
// Route handlers select the pool matching the authenticated user's role_name
// from the JWT, ensuring PostgreSQL's privilege system is the REAL
// authorization layer — app-level RBAC middleware is defense-in-depth.
// ============================================================================

const { Pool } = require('pg');
const config = require('../config');

/**
 * Map of role_name → pg.Pool.
 * Example: pools['doctor'] connects as demo_doctor (doctor_role).
 */
const pools = {};

for (const [roleName, creds] of Object.entries(config.db.roles)) {
  pools[roleName] = new Pool({
    host: config.db.host,
    port: config.db.port,
    database: config.db.database,
    user: creds.user,
    password: creds.password,
    max: config.db.poolMax,
    // Return DATE columns as strings, not JS Date objects (avoids timezone shifts)
    parseInputDatesAsUTC: false,
  });
}

/**
 * Get the pool for a given role name.
 * @param {string} roleName — one of: admin, doctor, forensic_staff, police, court, records_clerk, auditor
 * @returns {Pool}
 * @throws {Error} if the role name has no configured pool
 */
function getPool(roleName) {
  const pool = pools[roleName];
  if (!pool) {
    throw new Error(`No database pool configured for role "${roleName}".`);
  }
  return pool;
}

/**
 * Gracefully close all pools (for clean shutdown).
 */
async function closeAllPools() {
  await Promise.all(Object.values(pools).map((p) => p.end()));
}

module.exports = { pools, getPool, closeAllPools };
