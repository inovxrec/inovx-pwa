-- ==============================================================================
-- INOVX OPS — EVERY CHANNEL ON, FOR EVERYONE, UNLESS THEY SAY OTHERWISE
-- Migration: 20260924000000_notifications_on_by_default.sql
-- ==============================================================================
--
-- The club's decision: in-app, push and email all default to on, for every
-- event, for every person. Previously in-app was on, push was on for five of
-- the seven events, and email was off everywhere.
--
-- What a default can and cannot do
-- --------------------------------
-- Two of the three channels are ours to switch on. The third is not, and it is
-- worth being exact about why so nobody later reads this file and believes push
-- is now universal.
--
--   in-app   ours. A row in `notifications`. On for everything.
--   email    ours. The digest reads this matrix. On for everything.
--   push     NOT ours to enable. A browser only delivers push to a device whose
--            owner has clicked through a permission prompt on that device, and
--            no server-side setting can grant it. Chrome, Safari and Firefox
--            all refuse; on iOS the app must additionally be installed to the
--            home screen first.
--
-- So what this changes for push is the SECOND question, not the first: once a
-- person has turned on a device, that device now receives every event rather
-- than the five that used to be on. `push_subscriptions` still decides whether
-- there is any device to send to, and that table is only ever written from a
-- click.
--
-- One caveat on email
-- -------------------
-- `send-digest` is deployed and has no sender configured — the club's domain
-- publishes DMARC p=reject and authorises only Google, which the function's
-- Brevo transport cannot satisfy. So email preferences now say yes and no mail
-- leaves. The Settings screen says exactly that, out loud, and must keep saying
-- it until a sender exists.

-- ------------------------------------------------------------------------------
-- 1. The defaults
-- ------------------------------------------------------------------------------
-- Mirrors DEFAULT_MATRIX in src/screens/settings/Settings.tsx. These two are one
-- decision written twice; change them together or the screen will show a
-- default the database does not honour.
CREATE OR REPLACE FUNCTION wants_notification(
  target_user UUID,
  event_id TEXT,
  channel TEXT DEFAULT 'inApp'
)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  setting JSONB;
BEGIN
  SELECT matrix -> event_id -> channel INTO setting
  FROM notification_prefs
  WHERE user_id = target_user;

  -- Never opened Settings, or opened it and left this cell alone. Everything is
  -- on until somebody says otherwise — which is what an explicit false below is.
  IF setting IS NULL THEN
    RETURN TRUE;
  END IF;

  RETURN setting::boolean;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. The people who already have a saved row
-- ------------------------------------------------------------------------------
-- A default only answers for a cell nobody has written. Anyone who has opened
-- §9.14 and pressed save holds an explicit matrix, and every one of those
-- carries `email: false` for all seven events, because that is what the screen
-- offered at the time. Left alone, those people would be the only ones the new
-- default does not reach — and they are the club's most engaged members, which
-- is the wrong group to leave out.
--
-- This overwrites an explicit preference, so it is worth being honest that it
-- does: anyone who deliberately turned a channel off has it turned back on
-- once, and can turn it off again. That is defensible for a one-time change of
-- club policy and would not be if it ran on a schedule. It does not.
UPDATE notification_prefs
SET matrix = (
  SELECT COALESCE(jsonb_object_agg(event_key, jsonb_build_object(
    'inApp', TRUE, 'push', TRUE, 'email', TRUE
  )), '{}'::jsonb)
  FROM unnest(ARRAY[
    'assigned', 'due', 'review', 'comment', 'meeting', 'unclaimed',
    'oversight', 'birthday'
  ]) AS event_key
)
WHERE matrix IS DISTINCT FROM (
  SELECT COALESCE(jsonb_object_agg(event_key, jsonb_build_object(
    'inApp', TRUE, 'push', TRUE, 'email', TRUE
  )), '{}'::jsonb)
  FROM unnest(ARRAY[
    'assigned', 'due', 'review', 'comment', 'meeting', 'unclaimed',
    'oversight', 'birthday'
  ]) AS event_key
);

-- ------------------------------------------------------------------------------
-- 3. The flat booleans nobody reads
-- ------------------------------------------------------------------------------
-- `notification_prefs` still carries the pre-matrix columns from the foundation
-- schema. `20260915000000_notifications.sql` superseded them and deliberately
-- left them in place rather than dropping them. They are moved to match so a
-- reader of the table is not told two different things.
UPDATE notification_prefs
SET channel_email = TRUE,
    channel_inapp = TRUE,
    channel_push = TRUE,
    task_assigned = TRUE,
    task_status_changed = TRUE,
    meeting_reminder = TRUE,
    announcements = TRUE;

ALTER TABLE notification_prefs
  ALTER COLUMN channel_email SET DEFAULT TRUE,
  ALTER COLUMN channel_push SET DEFAULT TRUE;
