-- ============================================================================
-- MLIMS: Notifications Grants (V27)
--
-- Grants access to the notifications table for all non-admin roles so they
-- can fetch and mark their own notifications as read.
-- ============================================================================

GRANT SELECT, UPDATE ON notifications TO doctor_role, forensic_staff_role, police_role, court_role, records_clerk_role, auditor_role;
