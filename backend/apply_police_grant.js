const { Client } = require('pg');

async function fixGrant() {
  const client = new Client({
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'postgres',
    password: process.argv[2] || process.env.PGPASSWORD || 'shashintha',
    database: 'mlims',
  });

  try {
    await client.connect();
    await client.query('GRANT INSERT ON patients TO police_role');
    console.log('✅ Successfully granted INSERT on patients to police_role');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

fixGrant();
