-- ==============================================================================
-- INOVX OPS — NOTIFICATIONS THAT ACTUALLY GET WRITTEN
-- Migration: 20260915000000_notifications.sql
-- ==============================================================================
--
-- The gap
-- -------
-- `notifications` was read by the Alerts screen and the unread badge, and
-- nothing anywhere ever inserted a row. The screen was real, the table was
-- real, and it was guaranteed to be empty forever. `notification_prefs` and
-- `push_subscriptions` had never been touched by any code at all.
--
-- Why triggers rather than the client
-- ----------------------------------
-- A notification must not depend on the sender's browser. If the app inserted
-- them, closing the tab between assigning a task and the insert landing would
-- lose it, and every future writer — the occasion engine, a recurring rule, an
-- import — would have to remember to do the same thing again. It also cannot be
-- the client for a plainer reason: RLS stops a member inserting rows for other
-- people, which is correct and which the client would have to be given a hole
-- to work around.
--
-- So the database notices. One helper decides whether a person wants to hear
-- about a thing, and the triggers call it.

-- ------------------------------------------------------------------------------
-- 1. Preferences the UI can actually express
-- ------------------------------------------------------------------------------
-- §9.14's Settings screen is a matrix of five events × three channels. The flat
-- booleans on `notification_prefs` predate it and cannot represent it — there is
-- no `comment` column, and no way to say "in-app yes, email no" per event. So
-- the matrix lands as JSONB, shaped exactly like the screen:
--
--   {"assigned": {"inApp": true, "push": true, "email": false}, ...}
--
-- The older columns are left alone rather than dropped: Stream B and C may be
-- reading them, and a column nobody writes is harmless where a broken one is
-- not. This is the source of truth; they are superseded.
ALTER TABLE notification_prefs
  ADD COLUMN IF NOT EXISTS matrix JSONB NOT NULL DEFAULT '{}'::jsonb;

/**
 * Does this person want this event on this channel?
 *
 * Absent preferences mean the defaults, not silence — someone who has never
 * opened Settings still gets told when work is assigned to them. Only an
 * explicit `false` turns something off.
 */
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

  IF setting IS NULL THEN
    -- The same defaults the Settings screen shows before anyone touches it.
    RETURN CASE
      WHEN channel = 'inApp' THEN TRUE
      WHEN channel = 'push' THEN event_id IN ('assigned', 'due')
      ELSE FALSE
    END;
  END IF;

  RETURN setting::boolean;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. One way in
-- ------------------------------------------------------------------------------
/**
 * Files a notification, unless the person asked not to hear it or is the one
 * who caused it.
 *
 * Nobody is told about their own action. Being notified that you commented on
 * a task you are watching is noise, and noise is how people learn to ignore the
 * bell entirely.
 */
CREATE OR REPLACE FUNCTION queue_notification(
  target_user UUID,
  actor UUID,
  event_id TEXT,
  notification_title TEXT,
  notification_body TEXT,
  notification_link TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  target_tenure UUID;
BEGIN
  IF target_user IS NULL OR target_user = actor THEN
    RETURN;
  END IF;

  IF NOT wants_notification(target_user, event_id, 'inApp') THEN
    RETURN;
  END IF;

  SELECT tenure_id INTO target_tenure FROM users WHERE id = target_user;
  IF target_tenure IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO notifications (tenure_id, user_id, title, body, link, type)
  VALUES (target_tenure, target_user, notification_title, notification_body,
          notification_link, event_id);
END;
$$;

/** Everyone with a stake in a task: whoever is on it, plus whoever raised it. */
CREATE OR REPLACE FUNCTION task_watchers(task UUID)
RETURNS TABLE (user_id UUID)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT ta.user_id FROM task_assignees ta WHERE ta.task_id = task
  UNION
  SELECT t.created_by FROM tasks t WHERE t.id = task AND t.created_by IS NOT NULL;
$$;

-- ------------------------------------------------------------------------------
-- 3. Work assigned to you
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_task_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  task_row RECORD;
  actor_name TEXT;
BEGIN
  SELECT task_number, title INTO task_row FROM tasks WHERE id = NEW.task_id;
  SELECT name INTO actor_name FROM users WHERE id = auth.uid();

  PERFORM queue_notification(
    NEW.user_id,
    auth.uid(),
    'assigned',
    COALESCE(task_row.task_number, 'A task') || ' is yours',
    COALESCE(actor_name || ' assigned you ', 'You were assigned ') || task_row.title,
    '/board/all?task=' || NEW.task_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_task_assigned ON task_assignees;
CREATE TRIGGER trg_notify_task_assigned
AFTER INSERT ON task_assignees
FOR EACH ROW EXECUTE FUNCTION notify_task_assigned();

-- ------------------------------------------------------------------------------
-- 4. Your work approved, or sent back
-- ------------------------------------------------------------------------------
-- Only the states a person is waiting on. A task moving todo → in progress is
-- someone getting on with it, and does not need to interrupt anyone.
CREATE OR REPLACE FUNCTION notify_task_reviewed()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  watcher RECORD;
  actor_name TEXT;
  headline TEXT;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'done' AND OLD.status = 'review' THEN
    headline := 'approved';
  ELSIF OLD.status = 'review' AND NEW.status IN ('todo', 'progress') THEN
    headline := 'sent back';
  ELSIF NEW.status = 'blocked' THEN
    headline := 'blocked';
  ELSE
    RETURN NEW;
  END IF;

  SELECT name INTO actor_name FROM users WHERE id = auth.uid();

  FOR watcher IN SELECT * FROM task_watchers(NEW.id) LOOP
    PERFORM queue_notification(
      watcher.user_id,
      auth.uid(),
      'review',
      NEW.task_number || ' was ' || headline,
      COALESCE(actor_name || ' ' || headline || ' ', '') || NEW.title,
      '/board/all?task=' || NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_task_reviewed ON tasks;
CREATE TRIGGER trg_notify_task_reviewed
AFTER UPDATE OF status ON tasks
FOR EACH ROW EXECUTE FUNCTION notify_task_reviewed();

-- ------------------------------------------------------------------------------
-- 5. Someone commented on your task
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_task_comment()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  watcher RECORD;
  task_row RECORD;
  actor_name TEXT;
BEGIN
  SELECT task_number, title INTO task_row FROM tasks WHERE id = NEW.task_id;
  SELECT name INTO actor_name FROM users WHERE id = NEW.user_id;

  FOR watcher IN SELECT * FROM task_watchers(NEW.task_id) LOOP
    PERFORM queue_notification(
      watcher.user_id,
      NEW.user_id,
      'comment',
      COALESCE(actor_name, 'Someone') || ' commented on ' || COALESCE(task_row.task_number, 'a task'),
      -- Enough to decide whether to open it, not the whole thread.
      LEFT(NEW.content, 140),
      '/board/all?task=' || NEW.task_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_task_comment ON task_comments;
CREATE TRIGGER trg_notify_task_comment
AFTER INSERT ON task_comments
FOR EACH ROW EXECUTE FUNCTION notify_task_comment();

-- ------------------------------------------------------------------------------
-- 6. A meeting was scheduled
-- ------------------------------------------------------------------------------
-- Everyone on the tenure, because a meeting is the one thing that needs the
-- whole club to know. `queue_notification` drops the person who scheduled it.
CREATE OR REPLACE FUNCTION notify_meeting_scheduled()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  person RECORD;
BEGIN
  FOR person IN
    SELECT id FROM users WHERE tenure_id = NEW.tenure_id AND status = 'active'
  LOOP
    PERFORM queue_notification(
      person.id,
      NEW.created_by,
      'meeting',
      NEW.title,
      'Scheduled for ' || TO_CHAR(NEW.scheduled_at, 'FMDay DD Mon at HH24:MI')
        || COALESCE(' · ' || NEW.location, ''),
      '/meetings'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_meeting_scheduled ON meetings;
CREATE TRIGGER trg_notify_meeting_scheduled
AFTER INSERT ON meetings
FOR EACH ROW EXECUTE FUNCTION notify_meeting_scheduled();

-- ------------------------------------------------------------------------------
-- 7. Reading and writing your own preferences
-- ------------------------------------------------------------------------------
-- The foundation migration's own-rows policy already covers this table; this
-- only adds the grant the Settings screen needs to upsert its row.
GRANT SELECT, INSERT, UPDATE ON notification_prefs TO authenticated;

-- ------------------------------------------------------------------------------
-- NOT DONE HERE, AND DEFERRED ON PURPOSE
-- ------------------------------------------------------------------------------
--   · "Something I own falls due" cannot be a trigger — nothing happens in the
--     database when a date arrives. It needs a scheduled job (pg_cron) that
--     wakes each morning and files one notification per task due that day.
--   · Email and push send nothing yet. The `matrix` already records who wants
--     them, so when a sender exists it has the answer waiting; until then those
--     switches record a preference and change nothing, which the Settings
--     screen now says out loud.
