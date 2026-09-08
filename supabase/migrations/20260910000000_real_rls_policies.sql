-- ==============================================================================
-- INOVX OPS — REAL ROW LEVEL SECURITY
-- Migration: 20260910000000_real_rls_policies.sql
-- Description: Replaces the foundation migration's placeholder policies with
--              ones that let people actually do their jobs.
-- ==============================================================================
--
-- What was wrong
-- --------------
-- The foundation migration enabled RLS everywhere and then gave most tables a
-- SELECT-only policy, plus an explicit `FOR ALL USING (FALSE)` on tasks. Under
-- default-deny that made the entire application read-only: creating a task,
-- moving a card, saving permissions, marking attendance, saving minutes,
-- confirming a lunar date — every write in the UI failed, for everyone,
-- including a super admin.
--
-- The model
-- ---------
-- §12: the UI hiding a control is a courtesy; this file is what actually
-- decides. It mirrors `src/lib/permissions.ts` so the two cannot disagree about
-- what a role means — if you change the defaults there, change them here.
--
--   member       reads the club, works on their own tasks
--   admin        + assigns, approves, runs occasions and recurring rules
--   super_admin  + members, permissions, integrations, archive, audit
--   faculty      reads everything, writes nothing (§9.6)
--
-- Per-person grants and revokes in `user_permissions` layer on top, which is
-- what §9.17's screen edits.

-- ------------------------------------------------------------------------------
-- 1. Who is asking
-- ------------------------------------------------------------------------------
-- All SECURITY DEFINER, because they read `users` — a policy on `users` that
-- called a non-definer function selecting from `users` would recurse forever.
-- STABLE so the planner calls them once per statement rather than per row.

CREATE OR REPLACE FUNCTION current_role_name()
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$ SELECT role FROM users WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION current_tenure()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$ SELECT tenure_id FROM users WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$ SELECT current_role_name() IN ('admin', 'super_admin') $$;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$ SELECT current_role_name() = 'super_admin' $$;

-- Faculty are read-only by design (§9.6), so every write policy excludes them
-- rather than relying on their permission list happening to be empty.
CREATE OR REPLACE FUNCTION is_faculty()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$ SELECT current_role_name() = 'faculty' $$;

/*
  The role defaults, kept in the same order as `src/lib/permissions.ts`.
*/
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
      ARRAY['board.view', 'meetings.view', 'task.assign', 'approvals.review',
            'analytics.view', 'leaderboard.view', 'admin.approvals',
            'admin.occasions', 'admin.recurring', 'admin.members',
            'admin.permissions', 'admin.integrations', 'admin.archive',
            'admin.audit', 'export.csv']
    WHEN 'faculty' THEN
      ARRAY['board.view', 'meetings.view', 'analytics.view', 'leaderboard.view',
            'export.csv']
    ELSE ARRAY[]::TEXT[]
  END;
$$;

/**
 * The one question every policy below asks.
 *
 * A per-person override wins over the role default in both directions — a
 * revoke takes a permission away from a super admin, which is the point of
 * §9.17 being able to say so.
 */
CREATE OR REPLACE FUNCTION effective_permission(permission_key TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  override TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT effect INTO override
  FROM user_permissions
  WHERE user_id = auth.uid()
    AND user_permissions.permission_key = effective_permission.permission_key
    AND effect <> 'inherit'
  LIMIT 1;

  IF override = 'grant' THEN RETURN TRUE; END IF;
  IF override = 'revoke' THEN RETURN FALSE; END IF;

  RETURN permission_key = ANY (role_default_permissions(current_role_name()));
END;
$$;

/** True when the task belongs to the reader's tenure. */
CREATE OR REPLACE FUNCTION task_in_tenure(task UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$ SELECT EXISTS (SELECT 1 FROM tasks WHERE id = task AND tenure_id = current_tenure()) $$;

/** True when the reader is on the task, or may act on anyone's. */
CREATE OR REPLACE FUNCTION may_edit_task(task UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT NOT is_faculty()
     AND task_in_tenure(task)
     AND (
       effective_permission('task.assign')
       OR EXISTS (SELECT 1 FROM task_assignees WHERE task_id = task AND user_id = auth.uid())
       OR EXISTS (SELECT 1 FROM tasks WHERE id = task AND created_by = auth.uid())
     );
$$;

-- ------------------------------------------------------------------------------
-- 2. Out with the placeholders
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "placeholder_tenures_read" ON tenures;
DROP POLICY IF EXISTS "placeholder_domains_read" ON domains;
DROP POLICY IF EXISTS "placeholder_users_read" ON users;
DROP POLICY IF EXISTS "placeholder_user_permissions_read" ON user_permissions;
DROP POLICY IF EXISTS "placeholder_committees_read" ON committees;
DROP POLICY IF EXISTS "placeholder_committee_members_read" ON committee_members;
DROP POLICY IF EXISTS "placeholder_tasks_read" ON tasks;
DROP POLICY IF EXISTS "placeholder_tasks_modify" ON tasks;
DROP POLICY IF EXISTS "placeholder_task_assignees_read" ON task_assignees;
DROP POLICY IF EXISTS "placeholder_task_activity_read" ON task_activity;
DROP POLICY IF EXISTS "placeholder_task_comments_read" ON task_comments;
DROP POLICY IF EXISTS "placeholder_task_links_read" ON task_links;
DROP POLICY IF EXISTS "placeholder_task_checklist_read" ON task_checklist;
DROP POLICY IF EXISTS "placeholder_recurring_rules_read" ON recurring_rules;
DROP POLICY IF EXISTS "placeholder_member_directory_read" ON member_directory;
DROP POLICY IF EXISTS "placeholder_meetings_read" ON meetings;
DROP POLICY IF EXISTS "placeholder_attendance_read" ON attendance;
DROP POLICY IF EXISTS "placeholder_announcements_read" ON announcements;
DROP POLICY IF EXISTS "placeholder_audit_log_deny_all" ON audit_log;
DROP POLICY IF EXISTS "placeholder_feature_flags_read" ON feature_flags;
DROP POLICY IF EXISTS "placeholder_pending_imports_admin" ON pending_imports;
DROP POLICY IF EXISTS "placeholder_occasions_read" ON occasions;
DROP POLICY IF EXISTS "placeholder_integrations_read" ON integrations;
DROP POLICY IF EXISTS "placeholder_integration_conflicts_read" ON integration_conflicts;

-- The notification, prefs and push policies from the foundation migration are
-- already right — a person's own rows, read and write — and are left alone.

-- ------------------------------------------------------------------------------
-- 3. The club itself
-- ------------------------------------------------------------------------------
-- Tenures are readable by everyone signed in: the archive screen lists past
-- years, and a person's own tenure has to be resolvable before anything else
-- can be scoped to it.
CREATE POLICY "tenures_read" ON tenures
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "tenures_write" ON tenures
  FOR ALL TO authenticated
  USING (effective_permission('admin.archive'))
  WITH CHECK (effective_permission('admin.archive'));

CREATE POLICY "domains_read" ON domains
  FOR SELECT TO authenticated USING (tenure_id = current_tenure());

CREATE POLICY "domains_write" ON domains
  FOR ALL TO authenticated
  USING (tenure_id = current_tenure() AND is_super_admin())
  WITH CHECK (tenure_id = current_tenure() AND is_super_admin());

-- Everyone can see who is in the club — the board shows assignees, the people
-- screen is the directory. `guard_user_self_update` decides what a person may
-- change about their own row; this decides who may change anyone else's.
CREATE POLICY "users_read" ON users
  FOR SELECT TO authenticated
  USING (tenure_id = current_tenure() OR id = auth.uid());

CREATE POLICY "users_admin_write" ON users
  FOR ALL TO authenticated
  USING (tenure_id = current_tenure() AND effective_permission('admin.members'))
  WITH CHECK (tenure_id = current_tenure() AND effective_permission('admin.members'));

-- A person may see their own overrides; changing anyone's needs the screen's key.
CREATE POLICY "user_permissions_read" ON user_permissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR effective_permission('admin.permissions'));

CREATE POLICY "user_permissions_write" ON user_permissions
  FOR ALL TO authenticated
  USING (tenure_id = current_tenure() AND effective_permission('admin.permissions'))
  WITH CHECK (tenure_id = current_tenure() AND effective_permission('admin.permissions'));

CREATE POLICY "committees_read" ON committees
  FOR SELECT TO authenticated USING (tenure_id = current_tenure());

CREATE POLICY "committees_write" ON committees
  FOR ALL TO authenticated
  USING (tenure_id = current_tenure() AND is_admin() AND NOT is_faculty())
  WITH CHECK (tenure_id = current_tenure() AND is_admin() AND NOT is_faculty());

CREATE POLICY "committee_members_read" ON committee_members
  FOR SELECT TO authenticated USING (tenure_id = current_tenure());

CREATE POLICY "committee_members_write" ON committee_members
  FOR ALL TO authenticated
  USING (tenure_id = current_tenure() AND is_admin())
  WITH CHECK (tenure_id = current_tenure() AND is_admin());

-- ------------------------------------------------------------------------------
-- 4. Tasks
-- ------------------------------------------------------------------------------
-- Reading the whole tenure's board is deliberate: §9.7's board is the club's
-- shared surface, and `board.view` is a member default. Narrowing it to your own
-- domain is a product decision nobody has made.
CREATE POLICY "tasks_read" ON tasks
  FOR SELECT TO authenticated USING (tenure_id = current_tenure());

-- Anyone who is not faculty may raise work. §9.8 lets a member propose a task;
-- what a proposal is allowed to become is a status question, not an access one.
CREATE POLICY "tasks_insert" ON tasks
  FOR INSERT TO authenticated
  WITH CHECK (tenure_id = current_tenure() AND NOT is_faculty());

CREATE POLICY "tasks_update" ON tasks
  FOR UPDATE TO authenticated
  USING (may_edit_task(id))
  WITH CHECK (tenure_id = current_tenure());

CREATE POLICY "tasks_delete" ON tasks
  FOR DELETE TO authenticated
  USING (tenure_id = current_tenure() AND is_admin());

CREATE POLICY "task_assignees_read" ON task_assignees
  FOR SELECT TO authenticated USING (tenure_id = current_tenure());

CREATE POLICY "task_assignees_write" ON task_assignees
  FOR ALL TO authenticated
  USING (may_edit_task(task_id))
  WITH CHECK (tenure_id = current_tenure() AND may_edit_task(task_id));

CREATE POLICY "task_checklist_read" ON task_checklist
  FOR SELECT TO authenticated USING (tenure_id = current_tenure());

CREATE POLICY "task_checklist_write" ON task_checklist
  FOR ALL TO authenticated
  USING (may_edit_task(task_id))
  WITH CHECK (tenure_id = current_tenure() AND may_edit_task(task_id));

CREATE POLICY "task_links_read" ON task_links
  FOR SELECT TO authenticated USING (tenure_id = current_tenure());

CREATE POLICY "task_links_write" ON task_links
  FOR ALL TO authenticated
  USING (may_edit_task(task_id))
  WITH CHECK (tenure_id = current_tenure() AND may_edit_task(task_id));

-- Commenting is not editing: anyone on the board may say something about a
-- task, and may edit or delete only what they wrote.
CREATE POLICY "task_comments_read" ON task_comments
  FOR SELECT TO authenticated USING (tenure_id = current_tenure());

CREATE POLICY "task_comments_insert" ON task_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    tenure_id = current_tenure() AND user_id = auth.uid()
    AND NOT is_faculty() AND task_in_tenure(task_id)
  );

CREATE POLICY "task_comments_own" ON task_comments
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "task_comments_delete" ON task_comments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR is_admin());

-- The activity log is append-only at the table level already (the foundation
-- migration's immutability trigger). All this adds is who may append.
CREATE POLICY "task_activity_read" ON task_activity
  FOR SELECT TO authenticated USING (tenure_id = current_tenure());

CREATE POLICY "task_activity_insert" ON task_activity
  FOR INSERT TO authenticated
  WITH CHECK (tenure_id = current_tenure() AND task_in_tenure(task_id));

-- ------------------------------------------------------------------------------
-- 5. The admin screens
-- ------------------------------------------------------------------------------
-- Each gated on the same key its screen is gated on in `AdminFrame`, so a
-- permission revoked in §9.17 removes both the tab and the ability.

CREATE POLICY "recurring_rules_read" ON recurring_rules
  FOR SELECT TO authenticated USING (tenure_id = current_tenure());

CREATE POLICY "recurring_rules_write" ON recurring_rules
  FOR ALL TO authenticated
  USING (tenure_id = current_tenure() AND effective_permission('admin.recurring'))
  WITH CHECK (tenure_id = current_tenure() AND effective_permission('admin.recurring'));

CREATE POLICY "occasions_read" ON occasions
  FOR SELECT TO authenticated USING (tenure_id = current_tenure());

CREATE POLICY "occasions_write" ON occasions
  FOR ALL TO authenticated
  USING (tenure_id = current_tenure() AND effective_permission('admin.occasions'))
  WITH CHECK (tenure_id = current_tenure() AND effective_permission('admin.occasions'));

CREATE POLICY "integrations_read" ON integrations
  FOR SELECT TO authenticated
  USING (tenure_id = current_tenure() AND effective_permission('admin.integrations'));

CREATE POLICY "integrations_write" ON integrations
  FOR ALL TO authenticated
  USING (tenure_id = current_tenure() AND effective_permission('admin.integrations'))
  WITH CHECK (tenure_id = current_tenure() AND effective_permission('admin.integrations'));

CREATE POLICY "integration_conflicts_read" ON integration_conflicts
  FOR SELECT TO authenticated
  USING (tenure_id = current_tenure() AND effective_permission('admin.integrations'));

CREATE POLICY "integration_conflicts_write" ON integration_conflicts
  FOR ALL TO authenticated
  USING (tenure_id = current_tenure() AND effective_permission('admin.integrations'))
  WITH CHECK (tenure_id = current_tenure() AND effective_permission('admin.integrations'));

CREATE POLICY "member_directory_read" ON member_directory
  FOR SELECT TO authenticated USING (tenure_id = current_tenure());

CREATE POLICY "member_directory_write" ON member_directory
  FOR ALL TO authenticated
  USING (tenure_id = current_tenure() AND effective_permission('admin.members'))
  WITH CHECK (tenure_id = current_tenure() AND effective_permission('admin.members'));

CREATE POLICY "pending_imports_all" ON pending_imports
  FOR ALL TO authenticated
  USING (effective_permission('admin.members'))
  WITH CHECK (effective_permission('admin.members'));

-- The audit log is written by anyone whose action is worth recording and read
-- only by whoever holds the key — a log a member could edit would be no log.
CREATE POLICY "audit_log_read" ON audit_log
  FOR SELECT TO authenticated
  USING (effective_permission('admin.audit'));

CREATE POLICY "audit_log_insert" ON audit_log
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

CREATE POLICY "feature_flags_read" ON feature_flags
  FOR SELECT TO anon, authenticated USING (TRUE);

CREATE POLICY "feature_flags_write" ON feature_flags
  FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

-- ------------------------------------------------------------------------------
-- 6. Meetings and announcements
-- ------------------------------------------------------------------------------
CREATE POLICY "meetings_read" ON meetings
  FOR SELECT TO authenticated USING (tenure_id = current_tenure());

CREATE POLICY "meetings_write" ON meetings
  FOR ALL TO authenticated
  USING (tenure_id = current_tenure() AND is_admin())
  WITH CHECK (tenure_id = current_tenure() AND is_admin());

CREATE POLICY "attendance_read" ON attendance
  FOR SELECT TO authenticated USING (tenure_id = current_tenure());

CREATE POLICY "attendance_write" ON attendance
  FOR ALL TO authenticated
  USING (tenure_id = current_tenure() AND is_admin())
  WITH CHECK (tenure_id = current_tenure() AND is_admin());

CREATE POLICY "announcements_read" ON announcements
  FOR SELECT TO authenticated USING (tenure_id = current_tenure());

CREATE POLICY "announcements_write" ON announcements
  FOR ALL TO authenticated
  USING (tenure_id = current_tenure() AND is_admin())
  WITH CHECK (tenure_id = current_tenure() AND is_admin());

-- ------------------------------------------------------------------------------
-- 7. Notifications
-- ------------------------------------------------------------------------------
-- The foundation migration's own-rows policies stand. One addition: an admin has
-- to be able to notify somebody, which "your own rows" forbids.
CREATE POLICY "notifications_admin_insert" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (tenure_id = current_tenure() AND is_admin());
