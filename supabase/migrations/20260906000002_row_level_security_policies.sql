-- ============================================================================
-- INOVX OPS - MIGRATION 002: ROW-LEVEL SECURITY (RLS) POLICIES
-- Author: Member B (Permissions, Visibility & Audit)
-- Enforces: Server-side data isolation, board privacy, and role authority in Postgres.
-- ============================================================================

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION public.my_domain()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT domain FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.board_is_club_visible(ctx_type TEXT, ctx_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_vis TEXT;
BEGIN
    IF ctx_type = 'domain' THEN
        SELECT visibility INTO v_vis FROM public.domains WHERE id::text = ctx_id OR name = ctx_id;
        RETURN v_vis = 'club_visible';
    ELSIF ctx_type = 'committee' THEN
        SELECT visibility INTO v_vis FROM public.committees WHERE id::text = ctx_id OR name = ctx_id;
        RETURN v_vis = 'club_visible';
    END IF;
    RETURN FALSE;
END;
$$;

-- ----------------------------------------------------------------------------
-- 1. USER_PERMISSIONS TABLE RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Admins with permissions.manage or Super Admins can manage all overrides
CREATE POLICY "user_permissions_manage" ON public.user_permissions
    FOR ALL
    TO authenticated
    USING (public.has_perm('permissions.manage'))
    WITH CHECK (public.has_perm('permissions.manage'));

-- Every user can read their own overrides
CREATE POLICY "user_permissions_read_own" ON public.user_permissions
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 2. AUDIT_LOG TABLE RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Leadership & Faculty with permissions.manage or oversight.view can read audit trails
CREATE POLICY "audit_log_read" ON public.audit_log
    FOR SELECT
    TO authenticated
    USING (
        public.has_perm('permissions.manage') 
        OR public.has_perm('oversight.view')
    );

-- Any authenticated action can append to audit_log
CREATE POLICY "audit_log_insert" ON public.audit_log
    FOR INSERT
    TO authenticated
    WITH CHECK (actor_id = auth.uid() OR actor_id IS NULL);

-- ----------------------------------------------------------------------------
-- 3. TASKS & WORKFLOW TABLES RLS
-- ----------------------------------------------------------------------------
-- Tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select_policy" ON public.tasks
    FOR SELECT
    TO authenticated
    USING (
        public.has_perm('task.view.all')
        OR creator_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.task_assignees a 
            WHERE a.task_id = tasks.id AND a.user_id = auth.uid()
        )
        OR (context_type = 'domain' AND context_id = public.my_domain())
        OR (context_type = 'committee' AND EXISTS (
            SELECT 1 FROM public.committee_members cm 
            WHERE cm.committee_id::text = tasks.context_id AND cm.user_id = auth.uid()
        ))
        OR public.board_is_club_visible(context_type, context_id)
    );

CREATE POLICY "tasks_insert_policy" ON public.tasks
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.has_perm('task.create')
    );

CREATE POLICY "tasks_update_policy" ON public.tasks
    FOR UPDATE
    TO authenticated
    USING (
        public.has_perm('task.edit.all')
        OR creator_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.task_assignees a 
            WHERE a.task_id = tasks.id AND a.user_id = auth.uid()
        )
        -- Delegated approval permission for Domain Leads (FR-TASK-9)
        OR (public.has_perm('task.approve') AND context_type = 'domain' AND context_id = public.my_domain())
    );

CREATE POLICY "tasks_delete_policy" ON public.tasks
    FOR DELETE
    TO authenticated
    USING (
        public.has_perm('task.delete')
    );

-- Task Sub-tables: Assignees, Activity, Comments, Links, Checklist
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_assignees_all" ON public.task_assignees
    FOR ALL TO authenticated USING (true);

ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_activity_select" ON public.task_activity
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "task_activity_insert" ON public.task_activity
    FOR INSERT TO authenticated WITH CHECK (true);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_comments_select" ON public.task_comments
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "task_comments_insert" ON public.task_comments
    FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());

ALTER TABLE public.task_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_links_all" ON public.task_links
    FOR ALL TO authenticated USING (true);

ALTER TABLE public.task_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_checklist_all" ON public.task_checklist
    FOR ALL TO authenticated USING (true);

-- ----------------------------------------------------------------------------
-- 4. DOMAINS & COMMITTEES BOARDS RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "domains_read" ON public.domains
    FOR SELECT TO authenticated
    USING (
        visibility = 'club_visible'
        OR name = public.my_domain()
        OR public.has_perm('board.view.all')
    );

CREATE POLICY "domains_manage" ON public.domains
    FOR UPDATE TO authenticated
    USING (
        public.has_perm('board.visibility.manage')
        OR lead_user_id = auth.uid()
    );

ALTER TABLE public.committees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "committees_read" ON public.committees
    FOR SELECT TO authenticated
    USING (
        visibility = 'club_visible'
        OR public.has_perm('board.view.all')
        OR EXISTS (
            SELECT 1 FROM public.committee_members cm 
            WHERE cm.committee_id = committees.id AND cm.user_id = auth.uid()
        )
    );

CREATE POLICY "committees_manage" ON public.committees
    FOR ALL TO authenticated
    USING (
        public.has_perm('board.visibility.manage')
        OR coordinator_id = auth.uid()
    );

-- ----------------------------------------------------------------------------
-- 5. OPERATIONS & GOVERNANCE TABLES RLS
-- ----------------------------------------------------------------------------
-- Recurring Rules
ALTER TABLE public.recurring_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recurring_rules_read" ON public.recurring_rules
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "recurring_rules_write" ON public.recurring_rules
    FOR ALL TO authenticated USING (public.has_perm('recurring.manage'));

-- Announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "announcements_read" ON public.announcements
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "announcements_write" ON public.announcements
    FOR ALL TO authenticated USING (public.has_perm('announcement.create'));

-- Meetings & Attendance
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meetings_read" ON public.meetings
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "meetings_write" ON public.meetings
    FOR ALL TO authenticated USING (public.has_perm('meetings.manage'));

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attendance_read" ON public.attendance
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "attendance_write" ON public.attendance
    FOR ALL TO authenticated USING (public.has_perm('meetings.manage'));

-- Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_own" ON public.notifications
    FOR ALL TO authenticated USING (user_id = auth.uid());
