-- ==============================================================================
-- INOVX OPS — TELLING A DOMAIN THERE IS WORK NOBODY HAS PICKED UP
-- Migration: 20260918000000_unclaimed_work.sql
-- ==============================================================================
--
-- A task raised without an assignee belongs to its whole domain or committee,
-- so everyone in it is told and anyone can claim it.
--
-- Why this is a sweep and not a trigger
-- ------------------------------------
-- `insertTask` writes the task first and its assignees second, in two separate
-- statements. An AFTER INSERT trigger on `tasks` therefore runs at a moment
-- when *every* task looks unassigned — including one that is about to be handed
-- to a named person. Wiring it that way would blast the whole domain on every
-- task the club ever raises, which is the fastest way to teach 39 people to
-- ignore the bell.
--
-- So the question is asked a few minutes later, when the answer is settled.
-- That delay is not a compromise: "nobody has picked this up" is a state rather
-- than an event, and the pause also gives whoever raised it a moment to assign
-- someone before the whole domain is bothered.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Announced once, and never again — the column is the record of that.
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS unclaimed_notified_at TIMESTAMPTZ;

-- ------------------------------------------------------------------------------
-- Who is in a domain or a committee
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION context_members(
  context_type TEXT,
  context_id UUID,
  for_tenure UUID
)
RETURNS TABLE (user_id UUID)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT u.id
  FROM users u
  WHERE context_type = 'domain'
    AND u.domain_id = context_id
    AND u.tenure_id = for_tenure
    AND u.status = 'active'
  UNION
  SELECT cm.user_id
  FROM committee_members cm
  WHERE context_type = 'committee'
    AND cm.committee_id = context_id;
$$;

-- ------------------------------------------------------------------------------
-- The sweep
-- ------------------------------------------------------------------------------
/**
 * Announces work that has been sitting unclaimed.
 *
 * Only tasks still open: a task cancelled or finished without ever being
 * assigned is not something the domain needs chasing about.
 *
 * The person who raised it is passed as the actor, so `queue_notification`
 * leaves them out — they know, they wrote it.
 */
CREATE OR REPLACE FUNCTION announce_unclaimed_tasks(older_than INTERVAL DEFAULT '3 minutes')
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  task_row RECORD;
  person RECORD;
  context_label TEXT;
  announced INTEGER := 0;
BEGIN
  FOR task_row IN
    SELECT t.*
    FROM tasks t
    WHERE t.unclaimed_notified_at IS NULL
      AND t.created_at < NOW() - older_than
      AND t.status IN ('todo', 'proposed')
      AND NOT EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id)
  LOOP
    -- Named so the notification says where the work lives, not just that it exists.
    IF task_row.context_type = 'committee' THEN
      SELECT name INTO context_label FROM committees WHERE id = task_row.context_id;
    ELSE
      SELECT name INTO context_label FROM domains WHERE id = task_row.context_id;
    END IF;

    FOR person IN
      SELECT * FROM context_members(task_row.context_type, task_row.context_id, task_row.tenure_id)
    LOOP
      PERFORM queue_notification(
        person.user_id,
        task_row.created_by,
        'unclaimed',
        COALESCE(task_row.task_number, 'A task') || ' needs someone',
        task_row.title || COALESCE(' · ' || context_label, '') || ' — nobody has picked it up',
        '/board/all?task=' || task_row.id
      );
    END LOOP;

    UPDATE tasks SET unclaimed_notified_at = NOW() WHERE id = task_row.id;
    announced := announced + 1;
  END LOOP;

  RETURN announced;
END;
$$;

/*
  Assigning someone clears the mark, so a task that is later unassigned again
  can be announced afresh. Without this, work handed back to the pool would go
  quietly unclaimed forever.
*/
CREATE OR REPLACE FUNCTION clear_unclaimed_mark()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE tasks SET unclaimed_notified_at = NULL WHERE id = NEW.task_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clear_unclaimed_mark ON task_assignees;
CREATE TRIGGER trg_clear_unclaimed_mark
AFTER INSERT ON task_assignees
FOR EACH ROW EXECUTE FUNCTION clear_unclaimed_mark();

-- ------------------------------------------------------------------------------
-- Every five minutes
-- ------------------------------------------------------------------------------
-- Frequent enough that unclaimed work surfaces the same morning it is raised,
-- rare enough that it is not a busy loop over a table this size.
SELECT cron.unschedule('announce-unclaimed-tasks')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'announce-unclaimed-tasks');

SELECT cron.schedule(
  'announce-unclaimed-tasks',
  '*/5 * * * *',
  $$ SELECT announce_unclaimed_tasks(); $$
);
