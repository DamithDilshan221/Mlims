-- ============================================================================
-- MLIMS Phase 6: TOTP Secret Addition (V9)
--
-- Adds the TOTP secret column for Multi-Factor Authentication (2FA) 
-- enforcement for Admin and Doctor roles as recommended in the Security Review.
-- The secret is expected to be encrypted using the same AES-256-GCM scheme 
-- as the NIC/Passport data before insertion.
-- ============================================================================

ALTER TABLE users 
ADD COLUMN totp_secret BYTEA NULL;

COMMENT ON COLUMN users.totp_secret IS 'Encrypted TOTP secret for 2FA. NULL if 2FA is not yet configured.';

-- Ensure only the application's trusted roles can access this column
GRANT SELECT (totp_secret), UPDATE (totp_secret) ON users TO admin_role;
GRANT SELECT (totp_secret), UPDATE (totp_secret) ON users TO doctor_role;
