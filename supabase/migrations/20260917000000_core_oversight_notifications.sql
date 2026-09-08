-- ==============================================================================
-- INOVX OPS — WHAT THE CORE TEAM IS TOLD, AND MEETINGS BY DEFAULT
-- Migration: 20260917000000_core_oversight_notifications.sql
-- ==============================================================================
--
-- Three things the club asked for:
--
--   1. Meetings buzz every phone by default. A meeting is the one event that
--      needs the whole club, and it is the one nobody should have to opt into.
--   2. When an admin or super admin puts work on someone, both super admins
--      hear about it — the President and Vice President see the club's work
--      being handed out without having to go looking.
--   3. When anything is submitted for review, both super admins hear that too.
--      They are the approvers; a queue nobody is told about is a queue nobody
--      empties.
--
-- Points 2 and 3 are oversight, not "your work", so they get their own event
-- rather than being smuggled into the `assigned` and `review` switches. Those
-- say "a task is assigned to me" and "my work is approved", and a notification
-- about someone else's task arriving under them would make both labels false.

-- ------------------------------------------------------------------------------
-- 1. Meetings on by default, everywhere
-- ------------------------------------------------------------------------------
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
    RETURN CASE
      WHEN channel = 'inApp' THEN TRUE
      -- Meetings join assignments and due dates as a default push: those are the
      -- three that are worth a buzz on a phone that is face-down on a desk.
      WHEN channel = 'push' THEN event_id IN ('assigned', 'due', 'meeting', 'oversight')
      ELSE FALSE
    END;
  END IF;

  RETURN setting::boolean;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. Who the core team is
-- ------------------------------------------------------------------------------
-- Read from the roster rather than hardcoded, so handing the presidency over in
-- §9.15's archive screen moves these notifications with it.
CREATE OR REPLACE FUNCTION super_admins(for_tenure UUID)
RETURNS TABLE (user_id UUID)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT id FROM users
  WHERE tenure_id = for_tenure AND role = 'super_admin' AND status = 'active';
$$;

-- ------------------------------------------------------------------------------
-- 3. Work handed out by an admin
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_task_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  task_row RECORD;
  actor_name TEXT;
  actor_role TEXT;
  assignee_name TEXT;
  officer RECORD;
BEGIN
  SELECT task_number, title, tenure_id INTO task_row FROM tasks WHERE id = NEW.task_id;
  SELECT name, role INTO actor_name, actor_role FROM users WHERE id = auth.uid();
  SELECT name INTO assignee_name FROM users WHERE id = NEW.user_id;

  -- The person the work is now on.
  PERFORM queue_notification(
    NEW.user_id,
    auth.uid(),
    'assigned',
    COALESCE(task_row.task_number, 'A task') || ' is yours',
    COALESCE(actor_name || ' assigned you ', 'You were assigned ') || task_row.title,
    '/board/all?task=' || NEW.task_id
  );

  /*
    And the core team, when an admin or super admin did the assigning. Work a
    member picks up for themselves is not something the President needs to hear
    about; work being handed out is how the club's effort gets distributed, and
    that is theirs to see.
  */
  IF actor_role IN ('admin', 'super_admin') THEN
    FOR officer IN SELECT * FROM super_admins(task_row.tenure_id) LOOP
      -- Not the assignee: they have just been told it is theirs, and saying it
      -- twice in two different voices is noise. queue_notification drops the
      -- actor, so a president assigning work does not notify themselves.
      IF officer.user_id <> NEW.user_id THEN
        PERFORM queue_notification(
          officer.user_id,
          auth.uid(),
          'oversight',
          COALESCE(actor_name, 'Someone') || ' assigned ' || COALESCE(task_row.task_number, 'a task'),
          COALESCE(assignee_name, 'Someone') || ' is now on ' || task_row.title,
          '/board/all?task=' || NEW.task_id
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. Anything submitted for review
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_task_reviewed()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  watcher RECORD;
  officer RECORD;
  actor_name TEXT;
  headline TEXT;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT name INTO actor_name FROM users WHERE id = auth.uid();

  /*
    Submitted for review: the core team is told, because they are the ones who
    can approve it. This is the queue filling up, and §9.6's approval card is
    the screen they would otherwise have to remember to check.
  */
  IF NEW.status = 'review' AND OLD.status IS DISTINCT FROM 'review' THEN
    FOR officer IN SELECT * FROM super_admins(NEW.tenure_id) LOOP
      PERFORM queue_notification(
        officer.user_id,
        auth.uid(),
        'oversight',
        NEW.task_number || ' is waiting on you',
        COALESCE(actor_name || ' submitted ', 'Submitted: ') || NEW.title,
        '/board/all?task=' || NEW.id
      );
    END LOOP;
  END IF;

  -- And the people on the task, for the outcomes they are waiting on.
  IF NEW.status = 'done' AND OLD.status = 'review' THEN
    headline := 'approved';
  ELSIF OLD.status = 'review' AND NEW.status IN ('todo', 'progress') THEN
    headline := 'sent back';
  ELSIF NEW.status = 'blocked' THEN
    headline := 'blocked';
  ELSE
    RETURN NEW;
  END IF;

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
