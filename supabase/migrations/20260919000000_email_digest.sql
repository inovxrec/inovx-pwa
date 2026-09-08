-- ==============================================================================
-- INOVX OPS — REMEMBERING WHAT HAS ALREADY BEEN EMAILED
-- Migration: 20260919000000_email_digest.sql
-- ==============================================================================
--
-- The digest sends one summary per person rather than one email per event, so
-- it needs to know what it has already covered. Without this column a person
-- would be sent the same five notifications every evening until they happened
-- to read them.
--
-- Set only after the mail provider accepts the message: marking first would go
-- quiet about everything that failed to send.

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;

-- The digest reads exactly this slice, and there is one row per person per
-- event, so it grows with the club's activity rather than its size.
CREATE INDEX IF NOT EXISTS idx_notifications_pending_email
  ON notifications (user_id, created_at)
  WHERE is_read = FALSE AND email_sent_at IS NULL;
