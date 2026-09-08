-- ==============================================================================
-- INOVX OPS — DELETING A TASK IS A SUPER ADMIN KEY
-- Migration: 20260912000000_task_delete_permission.sql
-- ==============================================================================
--
-- `20260910000000_real_rls_policies.sql` let any admin delete a task. Deleting
-- one takes its comments and its activity log with it — the record of what the
-- club decided, not just the card — so it becomes its own permission held by the
-- President and Vice President, and it is revocable from them like any other.
--
-- This mirrors `task.delete` in `src/lib/permissions.ts`. The two files are one
-- decision written twice; change them together.

CREATE OR REPLACE FUNCTION role_default_permissions(role_name TEXT)
RETURNS TEXT[] LANGUAGE SQL IMMUTABLE SET search_path = public, pg_temp
AS $$
  SELECT CASE role_name
    WHEN 'member' THEN
      ARRAY['board.view', 'meetings.view']
    WHEN 'admin' THEN
      ARRAY['board.view', 'meetings.view', 'task.assign', 'approvals.review',
            'analytics.view', 'leaderboard.view', 'admin.approvals',
            'admin.occasions', 'admin.recurring']
    WHEN 'super_admin' THEN
      ARRAY['board.view', 'meetings.view', 'task.assign', 'task.delete',
            'approvals.review', 'analytics.view', 'leaderboard.view',
            'admin.approvals', 'admin.occasions', 'admin.recurring',
            'admin.members', 'admin.permissions', 'admin.integrations',
            'admin.archive', 'admin.audit', 'export.csv']
    WHEN 'faculty' THEN
      ARRAY['board.view', 'meetings.view', 'analytics.view', 'leaderboard.view',
            'export.csv']
    ELSE ARRAY[]::TEXT[]
  END;
$$;

DROP POLICY IF EXISTS "tasks_delete" ON tasks;

CREATE POLICY "tasks_delete" ON tasks
  FOR DELETE TO authenticated
  USING (tenure_id = current_tenure() AND effective_permission('task.delete'));
