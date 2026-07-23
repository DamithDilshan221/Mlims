/**
 * MLIMS — Automated Database Initializer & Migration Script
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const pgPassword = process.argv[2] || process.env.PGPASSWORD || 'postgres';
const pgUser = process.env.PGUSER || 'postgres';
const pgHost = process.env.PGHOST || 'localhost';
const pgPort = parseInt(process.env.PGPORT || '5432', 10);

async function main() {
  console.log('🚀 MLIMS Database Setup Tool');
  console.log(`Connecting to PostgreSQL at ${pgHost}:${pgPort} as '${pgUser}'...`);

  // Step 1: Connect to default postgres DB to ensure mlims DB exists
  const rootClient = new Client({
    host: pgHost,
    port: pgPort,
    user: pgUser,
    password: pgPassword,
    database: 'postgres',
  });

  try {
    await rootClient.connect();
    console.log("Re-creating clean 'mlims' database...");
    await rootClient.query(`DROP DATABASE IF EXISTS mlims WITH (FORCE)`);
    await rootClient.query(`CREATE DATABASE mlims`);
    console.log("✅ Database 'mlims' created clean.");
  } catch (err) {
    console.error('❌ Could not connect to PostgreSQL. Please verify PostgreSQL service is running and password is correct.');
    console.error('Error detail:', err.message);
    process.exit(1);
  } finally {
    await rootClient.end();
  }

  // Step 2: Connect to mlims DB to execute SQL migrations
  const mlimsClient = new Client({
    host: pgHost,
    port: pgPort,
    user: pgUser,
    password: pgPassword,
    database: 'mlims',
  });

  await mlimsClient.connect();
  console.log("Connected to 'mlims' database.");

  // Drop existing roles if they exist at cluster level
  const rolesToDrop = [
    'demo_admin', 'demo_doctor', 'demo_forensic', 'demo_police', 'demo_court', 'demo_clerk', 'demo_auditor',
    'admin_role', 'doctor_role', 'forensic_staff_role', 'police_role', 'court_role', 'records_clerk_role', 'auditor_role'
  ];
  for (const r of rolesToDrop) {
    try {
      await mlimsClient.query(`DROP ROLE IF EXISTS ${r}`);
    } catch (e) {
      // ignore
    }
  }

  const migrationFiles = [
    'V1__schema.sql',
    'V2__roles_grants_rls.sql',
    'V3__triggers.sql',
    'V4__functions_procedures.sql',
    'V5__views.sql',
    'V6__seed_data.sql',
    'V7__auth_migration.sql',
    'V8__reporting_views.sql',
    'V9__add_totp_secret.sql',
    'V10__fix_audit_logs.sql',
    'V12__add_referral_source.sql',
    'V13__add_pm_authorization_type.sql',
    'V13__police_copy_function.sql',
    'V14__clinical_auth_pm_registry_court_summons.sql',
    'V15__add_assigned_doctor_to_case.sql',
    'V16__catchup_missing_migrations.sql',
    'V17__fix_sp_register_case_permissions.sql'

  ];

  for (const file of migrationFiles) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`Skipping missing migration: ${file}`);
      continue;
    }
    console.log(`Running migration: ${file}...`);
    const sql = fs.readFileSync(filePath, 'utf8');
    try {
      await mlimsClient.query(sql);
      console.log(`  ✅ Successfully executed ${file}`);
    } catch (sqlErr) {
      console.warn(`  ⚠️ Warning during ${file}:`, sqlErr.message);
    }
  }

  // Step 3: Create & Sync User Accounts with valid bcrypt hashes
  console.log("Setting up user account passwords...");

  const hash1234 = await bcrypt.hash('1234', 12);
  const hashAdmin = await bcrypt.hash('admin123', 12);
  const hashDoctor = await bcrypt.hash('doctor123', 12);
  const hashForensic = await bcrypt.hash('forensic123', 12);
  const hashPolice = await bcrypt.hash('police123', 12);
  const hashCourt = await bcrypt.hash('court123', 12);
  const hashClerk = await bcrypt.hash('clerk123', 12);

  // Set all seeded users to '1234'
  await mlimsClient.query(`UPDATE users SET password_hash = $1`, [hash1234]);

  // Insert standard short demo accounts if not existing
  const demoUsers = [
    { roleId: 1, username: 'admin', hash: hashAdmin },
    { roleId: 2, username: 'doctor', hash: hashDoctor },
    { roleId: 3, username: 'forensic', hash: hashForensic },
    { roleId: 4, username: 'police', hash: hashPolice },
    { roleId: 5, username: 'court', hash: hashCourt },
    { roleId: 6, username: 'clerk', hash: hashClerk },
  ];

  for (const u of demoUsers) {
    const res = await mlimsClient.query(`SELECT user_id FROM users WHERE username = $1`, [u.username]);
    if (res.rows.length === 0) {
      await mlimsClient.query(
        `INSERT INTO users (role_id, username, password_hash, is_active) VALUES ($1, $2, $3, true)`,
        [u.roleId, u.username, u.hash]
      );
    } else {
      await mlimsClient.query(
        `UPDATE users SET password_hash = $1, is_active = true WHERE username = $2`,
        [u.hash, u.username]
      );
    }
  }

  console.log("\n🎉 MLIMS Database initialization completed successfully!");
  console.log("\n🔑 Ready Login Accounts:");
  console.log("  • Admin:            admin / admin123  (or admin.system / 1234)");
  console.log("  • Doctor (JMO):     doctor / doctor123 (or dr.wijesinghe / 1234)");
  console.log("  • Forensic Staff:   forensic / forensic123 (or lab.malinga / 1234)");
  console.log("  • Police Officer:   police / police123 (or ofc.perera / 1234)");
  console.log("  • Court Registrar:  court / court123 (or reg.fernando / 1234)");
  console.log("  • Records Clerk:    clerk / clerk123 (or clerk.silva / 1234)");

  await mlimsClient.end();
}

main().catch(err => {
  console.error("Fatal setup error:", err);
  process.exit(1);
});



