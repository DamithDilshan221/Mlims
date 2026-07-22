/**
 * MLIMS — Reset all seed user passwords to '1234'
 * Run this once from the database/ directory:
 *   node reset_passwords.js
 */
const bcrypt = require('bcryptjs');
const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'mlims',
    user: 'postgres',
    password: '1234',
  });

  await client.connect();
  console.log('Connected to mlims database.');

  const hash = await bcrypt.hash('1234', 12);
  console.log('Generated hash for password "1234"');

  const { rowCount } = await client.query(
    `UPDATE users SET password_hash = $1`,
    [hash]
  );

  console.log(`✅ Updated password for ${rowCount} users. All passwords are now "1234".`);
  await client.end();
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
