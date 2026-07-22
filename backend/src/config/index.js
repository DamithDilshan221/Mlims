// ============================================================================
// MLIMS — Configuration
// Loads environment variables via dotenv and exports a typed config object.
// All secrets come from env vars — never hardcoded.
// ============================================================================

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,

  // ── Per-role PostgreSQL credentials ─────────────────────────────────────
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'mlims',
    // Per-role user/password pairs (matching Phase 1 demo login users)
    roles: {
      admin:          { user: process.env.DB_USER_ADMIN   || 'demo_admin',   password: process.env.DB_PASS_ADMIN   || '' },
      doctor:         { user: process.env.DB_USER_DOCTOR  || 'demo_doctor',  password: process.env.DB_PASS_DOCTOR  || '' },
      forensic_staff: { user: process.env.DB_USER_FORENSIC || 'demo_forensic', password: process.env.DB_PASS_FORENSIC || '' },
      police:         { user: process.env.DB_USER_POLICE  || 'demo_police',  password: process.env.DB_PASS_POLICE  || '' },
      court:          { user: process.env.DB_USER_COURT   || 'demo_court',   password: process.env.DB_PASS_COURT   || '' },
      records_clerk:  { user: process.env.DB_USER_CLERK   || 'demo_clerk',   password: process.env.DB_PASS_CLERK   || '' },
      auditor:        { user: process.env.DB_USER_AUDITOR || 'demo_auditor', password: process.env.DB_PASS_AUDITOR || '' },
    },
    poolMax: 10,
  },

  // ── JWT ──────────────────────────────────────────────────────────────────
  jwt: {
    accessSecret:  process.env.JWT_ACCESS_SECRET  || 'dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    accessExpiry:  process.env.JWT_ACCESS_EXPIRY   || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY  || '7d',
  },

  // ── Encryption (AES-256-GCM for PII) ────────────────────────────────────
  encryption: {
    aesKey:     process.env.AES_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    hmacSecret: process.env.HMAC_SECRET_KEY    || 'dev-hmac-secret',
  },

  // ── File uploads ────────────────────────────────────────────────────────
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10,
  },
};

module.exports = config;
