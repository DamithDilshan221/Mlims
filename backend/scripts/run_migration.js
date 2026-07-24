const { Client } = require('pg');
const fs = require('fs');
const pgPassword = process.argv[2] || process.env.PGPASSWORD || '1234';
const pgUser = process.argv[3] || process.env.PGUSER || 'demo_admin';
const migrationFile = process.argv[4];
async function main() {
  const client = new Client({ host:'localhost', port:5432, user:pgUser, password:pgPassword, database:'mlims' });
  await client.connect();
  const sql = fs.readFileSync(migrationFile, 'utf8');
  try { await client.query(sql); console.log('OK'); }
  catch (err) { console.error('FAIL:', err.message); }
  await client.end();
}
main().catch(e => { console.error(e); process.exit(1); });
