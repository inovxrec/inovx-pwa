-- ==============================================================================
-- INOVX OPS — TELLING DESIGN A BIRTHDAY IS COMING
-- Migration: 20260921000000_birthday_reminders.sql
-- ==============================================================================
--
-- Three reminders per birthday, to whoever owns the poster:
--
--   the day before, 08:30 IST   "tomorrow"
--   the morning of, 08:30 IST   "today"
--   the evening of, 18:00 IST   only if the poster still is not done
--
-- Why this is a scheduled job and not a trigger
-- ---------------------------------------------
-- `20260915000000_notifications.sql` closes by naming this gap: "nothing happens
-- in the database when a date arrives". A birthday is a date passing, not a row
-- changing, so there is no INSERT or UPDATE for a trigger to hang off. pg_cron
-- is already how the club answers that question — `20260918000000_unclaimed_work`
-- sweeps for unclaimed tasks the same way.
--
-- Why a ledger instead of a timestamp column
-- ------------------------------------------
-- Three different reminders fire against one occasion, and the occasion is the
-- same row every year. A `last_notified_at` could not tell the morning from the
-- evening, and would make this year's reminder look like last year's. So each
-- firing is recorded as its own line: which occasion, which of the three, and
-- the date it went out. Re-running a job — a retry, a manual call, a cron that
-- double-fires — collides with that line and does nothing, which is the point.
--
-- On time zones
-- -------------
-- The club is in IST and the database is in UTC. Every date in here is derived
-- from `now() AT TIME ZONE 'Asia/Kolkata'` rather than from `CURRENT_DATE`,
-- because for the five and a half hours after midnight UTC those two disagree
-- about what day it is — which is exactly the window the 08:30 job runs in.

-- ------------------------------------------------------------------------------
-- 1. What has already been said
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS occasion_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occasion_id UUID NOT NULL REFERENCES occasions(id) ON DELETE CASCADE,
  reminder_kind TEXT NOT NULL CHECK (reminder_kind IN ('lead', 'morning', 'evening')),
  -- The club's date, not UTC's.
  fired_on DATE NOT NULL,
  -- How many people it reached. Zero is worth recording: it means the output
  -- domain is empty or everyone has muted birthdays, which is a real answer to
  -- "why did nobody hear about it" and is not recoverable after the fact.
  recipients INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_occasion_reminder UNIQUE (occasion_id, reminder_kind, fired_on)
);

ALTER TABLE occasion_reminders ENABLE ROW LEVEL SECURITY;

-- Written only by the jobs below, which are SECURITY DEFINER. Readable by
-- whoever runs the occasion screen, so "did this actually go out" is answerable
-- from the app rather than only from psql.
CREATE POLICY "occasion_reminders_read" ON occasion_reminders
  FOR SELECT TO authenticated
  USING (effective_permission('admin.occasions'));

CREATE INDEX IF NOT EXISTS idx_occasion_reminders_recent
  ON occasion_reminders (occasion_id, fired_on DESC);

-- ------------------------------------------------------------------------------
-- 2. Who hears about a birthday
-- ------------------------------------------------------------------------------
/**
 * The active members of the domain that owns the occasion's output.
 *
 * `output_domain_id` is read rather than assumed: §9.15's screen lets a super
 * admin point an occasion at a different domain, and a job that hardcoded
 * Design would quietly ignore them. Design is only the fallback for a row that
 * has never had one set.
 */
CREATE OR REPLACE FUNCTION occasion_audience(occasion UUID)
RETURNS TABLE (user_id UUID)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT u.id
  FROM occasions o
  JOIN users u ON u.tenure_id = o.tenure_id
  WHERE o.id = occasion
    AND u.status = 'active'
    AND u.domain_id = COALESCE(
      o.output_domain_id,
      (SELECT d.id FROM domains d WHERE d.tenure_id = o.tenure_id AND d.slug = 'design')
    );
$$;

/**
 * Sends one of the three reminders, once.
 *
 * Returns TRUE when it actually went out. The ledger insert is the lock: two
 * jobs racing, or one job run twice by hand, both find the row already there
 * and the second returns FALSE without notifying anybody.
 */
CREATE OR REPLACE FUNCTION fire_occasion_reminder(
  occasion UUID,
  kind TEXT,
  club_date DATE,
  notification_title TEXT,
  notification_body TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  ledger_id UUID;
  person RECORD;
  reached INTEGER := 0;
BEGIN
  INSERT INTO occasion_reminders (occasion_id, reminder_kind, fired_on)
  VALUES (occasion, kind, club_date)
  ON CONFLICT (occasion_id, reminder_kind, fired_on) DO NOTHING
  RETURNING id INTO ledger_id;

  -- Already said today. Not an error — a job is allowed to run twice.
  IF ledger_id IS NULL THEN
    RETURN FALSE;
  END IF;

  FOR person IN SELECT * FROM occasion_audience(occasion) LOOP
    /*
      Actor NULL, because nobody did this — a date did. `queue_notification`
      drops a notification whose target is its own actor, and passing anything
      here would silently skip whichever member happened to match.
    */
    PERFORM queue_notification(
      person.user_id,
      NULL,
      'birthday',
      notification_title,
      notification_body,
      '/calendar'
    );
    reached := reached + 1;
  END LOOP;

  UPDATE occasion_reminders SET recipients = reached WHERE id = ledger_id;
  RETURN TRUE;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. The poster itself
-- ------------------------------------------------------------------------------
/**
 * Raises the poster task for an occasion, if it does not already have one.
 *
 * Why the database raises it rather than a person
 * ----------------------------------------------
 * The evening job has to answer "has the poster been made". That question needs
 * something to point at, and until now nothing in the product could create a
 * task that knows which occasion it belongs to — the Calendar has been guessing
 * the link by searching task titles for the person's first name. A job that
 * asked the same question by guessing would nag the Design team about posters
 * they had already finished, which is worse than not asking.
 *
 * So the occasion creates its own task, carrying `occasion_id`, and the evening
 * job reads that column.
 *
 * What of §9.15's fields this does and does not use
 * ------------------------------------------------
 * `output_domain_id` decides the board, and is honoured.
 *
 * `lead_days` is not. The club asked for one reminder the day before and one on
 * the morning, and those two timings are what the schedule at the bottom of this
 * file encodes; honouring a per-occasion lead of five days as well would mean
 * the task appearing on the board a working week before anyone is told about it.
 * The field stays meaningful for whatever consumes it next.
 *
 * `assignment_strategy` is not either, and the reason is worth reading — see the
 * comment above the INSERT.
 *
 * Returns the task id, whether it was just made or already existed.
 */
CREATE OR REPLACE FUNCTION ensure_occasion_task(occasion UUID, club_date DATE)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  o RECORD;
  person TEXT;
  domain_row RECORD;
  existing UUID;
  new_task UUID;
  next_number TEXT;
BEGIN
  SELECT
    oc.*,
    COALESCE(md.name, oc.name) AS person_name
  INTO o
  FROM occasions oc
  LEFT JOIN member_directory md ON md.id = oc.directory_member_id
  WHERE oc.id = occasion;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Already has one, in any state. A poster that was raised and then cancelled
  -- is a decision somebody made; raising it again would overrule them.
  SELECT id INTO existing FROM tasks WHERE occasion_id = occasion LIMIT 1;
  IF existing IS NOT NULL THEN
    RETURN existing;
  END IF;

  person := o.person_name;

  SELECT d.* INTO domain_row
  FROM domains d
  WHERE d.id = COALESCE(
    o.output_domain_id,
    (SELECT id FROM domains WHERE tenure_id = o.tenure_id AND slug = 'design')
  );

  IF NOT FOUND THEN
    -- No domain to raise it on. Nothing is invented; the reminders still go out.
    RETURN NULL;
  END IF;

  /*
    The same scheme `insertTask` uses in the client, for the same reason: the
    schema has no sequence for task_number. It is as racy here as it is there,
    and this runs once a day in a single job, which is the least racy caller the
    column has.
  */
  SELECT '#' || LPAD((COUNT(*) + 1)::TEXT, 4, '0')
  INTO next_number
  FROM tasks WHERE tenure_id = o.tenure_id;

  /*
    Raised unassigned, deliberately, and NOT according to `assignment_strategy`.

    `20260922000000_task_visibility.sql` made a task the property of the people
    on it: an assigned task is visible to its assignees and the core team, and
    an unassigned one to its whole domain. The reminders below go to the whole
    output domain, because the club asked for the Design team to be told. Handing
    the poster to the domain lead — which is what every birthday occasion's
    `assignment_strategy` currently says — would therefore notify five people
    about a task four of them could not open.

    So the poster is left for the domain to claim. Whoever picks it up assigns
    themselves, and at that moment it narrows to them, which is the same shape
    as every other piece of unclaimed work on the board.

    This means `assignment_strategy` is not consulted for auto-raised occasion
    tasks. That is a real loss and it is written down rather than hidden: if the
    club would rather the lead own every poster, the thing to change is who the
    reminders go to, not this.
  */
  /*
    `unclaimed_notified_at` is stamped as though the sweep had already run.

    It has not, and that is the point: `20260918000000_unclaimed_work.sql` looks
    for tasks nobody has picked up and announces them to the domain a few minutes
    later. This task is unassigned by design and the domain is being told about
    it right now, by name, with the birthday attached. Letting the sweep find it
    too would mean two notifications minutes apart about the same poster, which
    is how a club learns to ignore both.
  */
  INSERT INTO tasks (
    tenure_id, task_number, title, description, context_type, context_id,
    domain_id, status, priority, due_date, tags, created_by, occasion_id,
    unclaimed_notified_at
  )
  VALUES (
    o.tenure_id,
    next_number,
    person || ' — birthday poster',
    'Raised automatically from the occasion calendar. Their birthday is '
      || TO_CHAR(club_date, 'FMDD Mon') || '.',
    'domain',
    domain_row.id,
    domain_row.id,
    'todo',
    'high',
    club_date::TIMESTAMPTZ,
    ARRAY['occasion'],
    NULL,
    occasion,
    NOW()
  )
  RETURNING id INTO new_task;

  RETURN new_task;
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. The morning job — tomorrow's birthdays, and today's
-- ------------------------------------------------------------------------------
/*
  One job rather than two, because both reminders go out at 08:30 IST and
  splitting them would mean two cron entries that must stay in step.

  A 29 February birthday matches nothing in a common year. That is deliberate
  and it is left visible rather than quietly rounded to the 28th or the 1st:
  nobody on the current roster has one, and picking a substitute date on the
  club's behalf is the kind of invention this codebase does not do. If someone
  with that birthday ever joins, it becomes a decision for a person to make.
*/
CREATE OR REPLACE FUNCTION notify_birthdays()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  today DATE := (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE;
  occasion RECORD;
  sent INTEGER := 0;
BEGIN
  FOR occasion IN
    SELECT
      o.id,
      o.name,
      COALESCE(md.name, o.name) AS person,
      CASE
        WHEN o.occasion_date = TO_CHAR(today, 'MM-DD') THEN 'morning'
        ELSE 'lead'
      END AS kind
    FROM occasions o
    LEFT JOIN member_directory md ON md.id = o.directory_member_id
    WHERE o.occasion_type = 'birthday'
      AND o.is_active
      AND o.occasion_date IN (
        TO_CHAR(today, 'MM-DD'),
        TO_CHAR(today + 1, 'MM-DD')
      )
  LOOP
    /*
      The task is ensured on both paths, not only the day before. An occasion
      added this morning, or a birthday whose lead-day job did not run, would
      otherwise reach the evening with nothing for the chase to look at and nag
      about a poster nobody was ever asked for.
    */
    IF occasion.kind = 'morning' THEN
      PERFORM ensure_occasion_task(occasion.id, today);

      IF fire_occasion_reminder(
        occasion.id, 'morning', today,
        occasion.person || '''s birthday is today',
        'The poster task is on the board. If it is not done by 6pm you will hear about it again.'
      ) THEN
        sent := sent + 1;
      END IF;
    ELSE
      PERFORM ensure_occasion_task(occasion.id, today + 1);

      IF fire_occasion_reminder(
        occasion.id, 'lead', today,
        occasion.person || '''s birthday is tomorrow',
        'A poster task has been raised on your board, due tomorrow.'
      ) THEN
        sent := sent + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN sent;
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. The evening job — only where the work is not finished
-- ------------------------------------------------------------------------------
/*
  "Have they made it" is answered by a task carrying this occasion's id and
  sitting in `done`. Not by a title search: the Calendar has been matching
  generated tasks by first name, which misses a poster titled "bday banner" and
  double-counts a task that happens to mention someone. `tasks.occasion_id`,
  added in the previous migration, is the actual link.

  A task in review is not done. That is on purpose — the poster is not posted
  until somebody says it is, and 6pm is exactly when the club wants to know that
  it is still sitting in the queue.
*/
CREATE OR REPLACE FUNCTION chase_birthday_posters()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  today DATE := (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE;
  occasion RECORD;
  sent INTEGER := 0;
BEGIN
  FOR occasion IN
    SELECT o.id, COALESCE(md.name, o.name) AS person
    FROM occasions o
    LEFT JOIN member_directory md ON md.id = o.directory_member_id
    WHERE o.occasion_type = 'birthday'
      AND o.is_active
      AND o.occasion_date = TO_CHAR(today, 'MM-DD')
      AND NOT EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.occasion_id = o.id AND t.status = 'done'
      )
  LOOP
    IF fire_occasion_reminder(
      occasion.id, 'evening', today,
      occasion.person || '''s poster is still not done',
      'It is their birthday today and nothing is marked done yet.'
    ) THEN
      sent := sent + 1;
    END IF;
  END LOOP;

  RETURN sent;
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. Hearing about it at all
-- ------------------------------------------------------------------------------
-- `wants_notification` decides per event and channel, and an event it has never
-- heard of falls through to its ELSE — which is FALSE for push, so the reminder
-- would file in-app and never buzz. Birthdays are added to the same list as
-- assignments and meetings: in-app and push on, email left to the digest.
--
-- Mirrors PUSH_BY_DEFAULT in src/screens/settings/Settings.tsx. The two are one
-- decision written twice; change them together.
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
      WHEN channel = 'push' THEN
        event_id IN ('assigned', 'due', 'meeting', 'oversight', 'birthday')
      ELSE FALSE
    END;
  END IF;

  RETURN setting::boolean;
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. Saying so on the flags screen
-- ------------------------------------------------------------------------------
-- `occasion_engine_auto_spawn` — "Automatically create birthday and celebration
-- tasks from directory dates" — has existed and been FALSE since the club was
-- seeded, describing precisely what section 3 now does. Leaving it off while the
-- behaviour is live would make the flags screen lie about the product, which is
-- worse than the flag not existing.
--
-- It is a record of what is happening, not a switch the jobs read: turning it
-- off would stop the screen describing the behaviour without stopping the
-- behaviour. Wiring it up as a real kill switch is worth doing when anyone wants
-- one; until then this is at least honest.
UPDATE feature_flags SET is_enabled = TRUE WHERE key = 'occasion_engine_auto_spawn';

-- ------------------------------------------------------------------------------
-- 8. The schedule
-- ------------------------------------------------------------------------------
-- pg_cron runs on the database's clock, which is UTC. 08:30 IST is 03:00 UTC and
-- 18:00 IST is 12:30 UTC; the functions themselves convert back to the club's
-- date, so a server whose time zone is ever changed still sends on the right day.
--
-- Unscheduled first so re-running this migration replaces the entries rather
-- than failing on a duplicate job name.
SELECT cron.unschedule('birthday-morning')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'birthday-morning');

SELECT cron.unschedule('birthday-evening')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'birthday-evening');

SELECT cron.schedule('birthday-morning', '0 3 * * *', $$ SELECT notify_birthdays() $$);
SELECT cron.schedule('birthday-evening', '30 12 * * *', $$ SELECT chase_birthday_posters() $$);
