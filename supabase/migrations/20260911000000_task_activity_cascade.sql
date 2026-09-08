-- ==============================================================================
-- INOVX OPS — LET A DELETED TASK TAKE ITS ACTIVITY WITH IT
-- Migration: 20260911000000_task_activity_cascade.sql
-- ==============================================================================
--
-- The bug
-- -------
-- `task_activity.task_id` is declared ON DELETE CASCADE, but the foundation
-- migration also put a BEFORE UPDATE OR DELETE trigger on the table that raises
-- on any delete. The cascade is a delete, so it hits the trigger:
--
--   ERROR: task_activity entries are immutable and cannot be updated or deleted
--   CONTEXT: SQL statement "DELETE FROM ONLY public.task_activity WHERE ..."
--
-- The result is that **no task that has ever been touched can be deleted** — not
-- by an admin, not by a tenure cascade. Nothing in the UI surfaced it because
-- nothing in the UI deletes a task yet; it turned up while clearing test rows.
--
-- The fix
-- -------
-- Immutability is about people not being able to rewrite history, and that is
-- already enforced where it belongs: `20260910000000_real_rls_policies.sql`
-- gives task_activity a SELECT policy and an INSERT policy and nothing else, so
-- no client can UPDATE or DELETE a row through PostgREST at all.
--
-- So the trigger only needs to cover UPDATE. A cascade from a deleted task is
-- not someone editing the record of what happened — the thing the record was
-- about no longer exists.
DROP TRIGGER IF EXISTS trg_task_activity_immutable ON task_activity;

CREATE OR REPLACE FUNCTION prevent_task_activity_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'task_activity entries are immutable and cannot be edited';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_task_activity_immutable
BEFORE UPDATE ON task_activity
FOR EACH ROW EXECUTE FUNCTION prevent_task_activity_mutation();
