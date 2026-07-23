// ============================================================================
// MLIMS — AES-256-GCM Encryption & HMAC-SHA256 Search Hashing
//
// This module implements the PII protection strategy described in Phase 1's
// schema comments (01_schema.sql, patients table):
//
//   • patients.nic_passport_enc  — AES-256-GCM ciphertext (BYTEA)
//   • patients.nic_search_hash   — deterministic HMAC-SHA256 (VARCHAR 64)
//   • deceased_identifications.nic_enc / nic_search_hash — same pattern
//
// The encryption key comes from process.env.AES_ENCRYPTION_KEY — a 32-byte
// key as 64 hex characters. It NEVER appears in a SQL string, query log,
// or pg_stat_statements. We deliberately avoid pgcrypto to prevent the key
// from leaking into database-level logs.
//
// AES-256-GCM provides authenticated encryption (confidentiality +
// integrity). Each encryption produces a random 12-byte IV, so the same
// plaintext encrypts to different ciphertexts each time — which is why the
// UNIQUE constraint is on the HMAC hash, not the ciphertext.
// ============================================================================

const crypto = require('crypto');
const config = require('../config');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;        // GCM recommended IV length
const AUTH_TAG_LENGTH = 16;  // GCM auth tag length

/**
 * Get the AES key as a Buffer (32 bytes from 64 hex chars).
 */
function getAesKey() {
  return Buffer.from(config.encryption.aesKey, 'hex');
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a Buffer: [12-byte IV] + [ciphertext] + [16-byte auth tag]
 *
 * @param {string} plaintext
 * @returns {Buffer} — suitable for storing in a BYTEA column
 */
function encrypt(plaintext) {
  if (!plaintext) return null;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getAesKey(), iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Pack: IV + ciphertext + authTag
  return Buffer.concat([iv, encrypted, authTag]);
}

/**
 * Decrypt a Buffer produced by encrypt().
 *
 * @param {Buffer} cipherBuf — [12-byte IV] + [ciphertext] + [16-byte auth tag]
 * @returns {string} — the original plaintext
 */
function decrypt(cipherBuf) {
  if (!cipherBuf) return null;

  try {
    // Ensure we have a Buffer (pg may return it as a Buffer already)
    const buf = Buffer.isBuffer(cipherBuf) ? cipherBuf : Buffer.from(cipherBuf);

    // A valid AES-256-GCM buffer must at least contain IV and Auth Tag
    if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      return '[INVALID ENCRYPTION DATA]';
    }

    const iv = buf.subarray(0, IV_LENGTH);
    const authTag = buf.subarray(buf.length - AUTH_TAG_LENGTH);
    const encrypted = buf.subarray(IV_LENGTH, buf.length - AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, getAesKey(), iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    return decipher.update(encrypted, undefined, 'utf8') + decipher.final('utf8');
  } catch (err) {
    console.error('Decryption error:', err.message);
    return '[DECRYPTION FAILED]';
  }
}

/**
 * Compute a deterministic HMAC-SHA256 hex digest for equality lookups.
 * This allows finding a patient by NIC without decrypting every row.
 *
 * @param {string} plaintext — the NIC/passport value
 * @returns {string} — 64-char lowercase hex string
 */
function computeSearchHash(plaintext) {
  if (!plaintext) return null;

  return crypto
    .createHmac('sha256', config.encryption.hmacSecret)
    .update(plaintext)
    .digest('hex');
}

module.exports = { encrypt, decrypt, computeSearchHash };
