// ============================================================================
// MLIMS — Lookup Repository
//
// Generic repository for master/lookup tables (police_stations, courts,
// injury_types, weapon_types, specimen_types).
// Admin writes; all authenticated roles read.
// ============================================================================

// Allowlist of tables to prevent SQL injection in dynamic table names
const ALLOWED_TABLES = [
  'police_stations',
  'courts',
  'injury_types',
  'weapon_types',
  'specimen_types',
  'roles',
  'referral_sources'
];

function checkTable(tableName) {
  if (!ALLOWED_TABLES.includes(tableName)) {
    throw new Error(`Invalid lookup table name: ${tableName}`);
  }
}

async function getAll(client, tableName) {
  checkTable(tableName);
  // Using string interpolation for table name is safe here because of checkTable()
  const { rows } = await client.query(`SELECT * FROM ${tableName} ORDER BY 1`);
  return rows;
}

async function getById(client, tableName, idColumn, id) {
  checkTable(tableName);
  // Basic validation that idColumn matches the expected pattern
  if (!/^[a-z_]+_id$/.test(idColumn)) throw new Error('Invalid ID column format');
  
  const { rows } = await client.query(`SELECT * FROM ${tableName} WHERE ${idColumn} = $1`, [id]);
  return rows[0] || null;
}

module.exports = { getAll, getById };
