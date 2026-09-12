-- ==============================================================================
-- INOVX OPS — A TASK IS NOT EVERYONE'S BUSINESS
-- Migration: 20260922000000_task_visibility.sql
-- ==============================================================================
--
-- What changes
-- ------------
-- `20260910000000_real_rls_policies.sql` let anyone signed in read every task in
-- the tenure, and said why: "§9.7's board is the club's shared surface [...]
-- Narrowing it to your own domain is a product decision nobody has made."
--
-- It has now been made. A task is visible to the people on it, and to the people
-- who have to see everything.
--
-- Who still sees a task
-- ---------------------
--   the assignees        it is their work
--   whoever raised it    or they would lose it the instant they filed it
--   super admins         the President and Vice President run the club
--   faculty and viewers  read-only oversight is the entire point of that role
--
-- And one carve-out that is not about a person: a task with NO assignee stays
-- visible to its own domain or committee. `20260918000000_unclaimed_work.sql`
-- tells a domain there is work nobody has picked up so that somebody picks it
-- up; without this, that notification would point at a task its recipients
-- could not open. The moment anyone is assigned, the task narrows to them.
--
-- A domain lead is not on this list. If leads should see their domain's work
-- without being assigned to it, that is a `task.assign`-shaped grant in §9.17,
-- not a hole in the read policy.
--
-- The comments and the checklist matter as much as the task
-- --------------------------------------------------------
-- The child tables were all `tenure_id = current_tenure()`. Leaving them that
-- way would make this whole migration cosmetic: `task_comments` carries the
-- discussion, `task_activity` carries who did what, and either would hand back
-- rows for a task the reader is no longer allowed to see. They move to the same
-- question the parent asks.

-- ------------------------------------------------------------------------------
-- 1. The question, asked once
-- ------------------------------------------------------------------------------
/**
 * May the signed-in person read this task?
 *
 * SECURITY DEFINER so it reads `tasks` and `task_assignees` without RLS — which
 * is also why it cannot be used in the policy on `tasks` itself. A policy on a
 * table that calls a function selecting from that table recurses until the
 * stack runs out. The `tasks` policy below therefore spells the same rule out
 * inline, and this exists for the five child tables, where there is no such
 * loop.
 *
 * The two must stay in step. If you change one, change the other.
 */
CREATE OR REPLACE FUNCTION may_read_task(task UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM tasks t
    WHERE t.id = task
      AND t.tenure_id = current_tenure()
      AND (
        is_super_admin()
        OR is_faculty()
        OR t.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM task_assignees ta
          WHERE ta.task_id = t.id AND ta.user_id = auth.uid()
        )
        OR (
          NOT EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id)
          AND EXISTS (
            SELECT 1 FROM context_members(t.context_type, t.context_id, t.tenure_id) cm
            WHERE cm.user_id = auth.uid()
          )
        )
      )
  );
$$;

-- ------------------------------------------------------------------------------
-- 2. The board
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "tasks_read" ON tasks;

CREATE POLICY "tasks_read" ON tasks
  FOR SELECT TO authenticated
  USING (
    tenure_id = current_tenure()
    AND (
      is_super_admin()
      OR is_faculty()
      OR created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM task_assignees ta
        WHERE ta.task_id = tasks.id AND ta.user_id = auth.uid()
      )
      OR (
        NOT EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = tasks.id)
        AND EXISTS (
          SELECT 1 FROM context_members(tasks.context_type, tasks.context_id, tasks.tenure_id) cm
          WHERE cm.user_id = auth.uid()
        )
      )
    )
  );

-- ------------------------------------------------------------------------------
-- 3. Everything hanging off a task
-- ------------------------------------------------------------------------------
-- Read only; the write policies already go through `may_edit_task`, which is a
-- stricter question and needs no change.

DROP POLICY IF EXISTS "task_assignees_read" ON task_assignees;
CREATE POLICY "task_assignees_read" ON task_assignees
  FOR SELECT TO authenticated USING (may_read_task(task_id));

DROP POLICY IF EXISTS "task_checklist_read" ON task_checklist;
CREATE POLICY "task_checklist_read" ON task_checklist
  FOR SELECT TO authenticated USING (may_read_task(task_id));

DROP POLICY IF EXISTS "task_links_read" ON task_links;
CREATE POLICY "task_links_read" ON task_links
  FOR SELECT TO authenticated USING (may_read_task(task_id));

DROP POLICY IF EXISTS "task_comments_read" ON task_comments;
CREATE POLICY "task_comments_read" ON task_comments
  FOR SELECT TO authenticated USING (may_read_task(task_id));

DROP POLICY IF EXISTS "task_activity_read" ON task_activity;
CREATE POLICY "task_activity_read" ON task_activity
  FOR SELECT TO authenticated USING (may_read_task(task_id));

-- ------------------------------------------------------------------------------
-- 4. On the cost of this
-- ------------------------------------------------------------------------------
-- `tasks_read` now asks two things of `task_assignees` for every task on every
-- board load: is there a row for me, and is there any row at all. No new index
-- is needed for either — `idx_task_assignees_lookup` from the foundation
-- migration is on (task_id, user_id), and a leading-column lookup by task_id
-- alone uses it as a prefix scan. Noted here because the absence of an index in
-- a migration that adds two EXISTS subqueries otherwise looks like an oversight.
