-- ==============================================================================
-- INOVX OPS — DELIVERING A NOTIFICATION TO A DEVICE
-- Migration: 20260916000000_push_delivery.sql
-- ==============================================================================
--
-- `20260915000000_notifications.sql` files a notification. This hands it to the
-- devices that asked for it.
--
-- How it gets out
-- ---------------
-- `pg_net` makes the HTTP call asynchronously, so the request to the push
-- service never sits inside the transaction that caused it. That matters: a
-- push service being slow must not slow down moving a card, and it must never
-- be able to fail a task update by failing itself.
--
-- What is deliberately NOT here: any third party. Web Push is a browser
-- standard, so the edge function signs with our own VAPID key and posts
-- straight to whichever endpoint the browser gave us — Google's, Mozilla's or
-- Apple's. There is no account, no SDK, and no per-message cost.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ------------------------------------------------------------------------------
-- 1. Where to reach ourselves
-- ------------------------------------------------------------------------------
-- The function's URL and the key to call it with. Kept in a table rather than
-- hardcoded because they differ between local and hosted, and a migration that
-- baked in one would be wrong on the other.
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Nobody reads this from the browser. It holds a service key; the only reader
-- is a SECURITY DEFINER function running inside the database.
CREATE POLICY "app_config_no_client_access" ON app_config
  FOR ALL TO authenticated USING (FALSE) WITH CHECK (FALSE);

-- ------------------------------------------------------------------------------
-- 2. Hand each new notification to the sender
-- ------------------------------------------------------------------------------
-- Rows are marked rather than deleted, so a push that failed can be told apart
-- from one that was never attempted.
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS push_sent_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION deliver_push()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  function_url TEXT;
  service_key TEXT;
BEGIN
  -- Wants it on this channel? The same matrix the Settings screen writes.
  IF NOT wants_notification(NEW.user_id, NEW.type, 'push') THEN
    RETURN NEW;
  END IF;

  -- No device has ever subscribed for this person; nothing to send to.
  IF NOT EXISTS (SELECT 1 FROM push_subscriptions WHERE user_id = NEW.user_id) THEN
    RETURN NEW;
  END IF;

  SELECT value INTO function_url FROM app_config WHERE key = 'push_function_url';
  SELECT value INTO service_key FROM app_config WHERE key = 'service_role_key';

  /*
    Unconfigured is a normal state, not an error. The in-app notification has
    already been filed and is what the person will see; push is the extra that
    arrives once someone sets the keys up. Failing here would roll back the
    task move that caused it, which would be a far worse outcome than a missing
    buzz.
  */
  IF function_url IS NULL OR service_key IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object('notification_id', NEW.id),
    timeout_milliseconds := 5000
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deliver_push ON notifications;
CREATE TRIGGER trg_deliver_push
AFTER INSERT ON notifications
FOR EACH ROW EXECUTE FUNCTION deliver_push();

-- ------------------------------------------------------------------------------
-- 3. Clearing out dead devices
-- ------------------------------------------------------------------------------
-- A push service replies 404 or 410 when a subscription is gone — the browser
-- was reinstalled, the person revoked permission, the endpoint expired. The
-- edge function calls this so we stop pushing into nothing.
CREATE OR REPLACE FUNCTION drop_push_subscription(dead_endpoint TEXT)
RETURNS VOID
LANGUAGE SQL SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  DELETE FROM push_subscriptions WHERE endpoint = dead_endpoint;
$$;
