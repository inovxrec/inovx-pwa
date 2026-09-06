-- ==============================================================================
-- INOVX OPS — STREAM A: FOUNDATION & INTEGRATION MIGRATION
-- Migration: 20260907000000_foundation_schema.sql
-- Description: Core schema, enums, triggers, indexes, and RLS scaffolding.
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. Helper Functions & Triggers
-- ------------------------------------------------------------------------------

-- Generic updated_at timestamp refresher
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Immutability enforcement for task_activity (insert-only, no update or delete)
CREATE OR REPLACE FUNCTION prevent_task_activity_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'task_activity entries are immutable and cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 2. Tenures Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,                -- e.g. '2026-2027'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_tenures_updated_at
BEFORE UPDATE ON tenures
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 3. Domains Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenure_id UUID NOT NULL REFERENCES tenures(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,                       -- 'technical', 'management', 'events', 'media', 'design', 'core'
  name TEXT NOT NULL,                       -- 'Technical', 'Management', etc.
  lead_user_id UUID,                        -- FK to users(id) added after users table creation
  color TEXT NOT NULL DEFAULT 'var(--chan-core)',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_domains_tenure_slug UNIQUE (tenure_id, slug)
);

CREATE TRIGGER trg_domains_updated_at
BEFORE UPDATE ON domains
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 4. Users Table (Public Profile mirroring auth.users)
-- ------------------------------------------------------------------------------
-- Roles: member, admin, super_admin, faculty
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,                     -- Mirrors auth.users.id
  tenure_id UUID REFERENCES tenures(id) ON DELETE SET NULL,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  initials TEXT,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('member', 'admin', 'super_admin', 'faculty')),
  domain_id UUID REFERENCES domains(id) ON DELETE SET NULL,
  domain TEXT,                             -- Convenience slug: 'technical', 'management', etc.
  position_title TEXT,                     -- e.g. 'Domain Lead', 'Associate', 'Advisor'
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'suspended')),
  must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Circular FK from domains.lead_user_id to users.id
ALTER TABLE domains
  ADD CONSTRAINT fk_domains_lead_user
  FOREIGN KEY (lead_user_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 5. User Permissions Table (Granular Tri-State Overrides)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenure_id UUID NOT NULL REFERENCES tenures(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,            -- e.g. 'viewAllBoards', 'approveCompletions', 'manageRecurring'
  effect TEXT NOT NULL CHECK (effect IN ('grant', 'revoke', 'inherit')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_permissions UNIQUE (tenure_id, user_id, permission_key)
);

CREATE TRIGGER trg_user_permissions_updated_at
BEFORE UPDATE ON user_permissions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 6. Committees Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS committees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenure_id UUID NOT NULL REFERENCES tenures(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                      -- e.g. 'Techfest Core', 'Occasion Engine'
  slug TEXT NOT NULL,                      -- e.g. 'techfest', 'occasion'
  lead_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_committees_tenure_slug UNIQUE (tenure_id, slug)
);

CREATE TRIGGER trg_committees_updated_at
BEFORE UPDATE ON committees
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 7. Committee Members Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS committee_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenure_id UUID NOT NULL REFERENCES tenures(id) ON DELETE CASCADE,
  committee_id UUID NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_committee_member UNIQUE (committee_id, user_id)
);

CREATE TRIGGER trg_committee_members_updated_at
BEFORE UPDATE ON committee_members
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 8. Tasks Table (Polymorphic Context: Domain or Committee)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenure_id UUID NOT NULL REFERENCES tenures(id) ON DELETE CASCADE,
  task_number TEXT NOT NULL,               -- e.g. '#0117'
  title TEXT NOT NULL,
  description TEXT,
  context_type TEXT NOT NULL CHECK (context_type IN ('domain', 'committee')),
  context_id UUID NOT NULL,               -- References domains(id) OR committees(id)
  domain_id UUID REFERENCES domains(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'progress', 'review', 'done', 'blocked', 'proposed')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  due_date TIMESTAMPTZ,
  due_label TEXT,                          -- e.g. 'DUE TODAY', 'OVERDUE 3D · 19 AUG'
  is_overdue BOOLEAN NOT NULL DEFAULT FALSE,
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  blocked_reason TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 9. Task Assignees Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenure_id UUID NOT NULL REFERENCES tenures(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_task_assignee UNIQUE (task_id, user_id)
);

CREATE TRIGGER trg_task_assignees_updated_at
BEFORE UPDATE ON task_assignees
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 10. Task Activity Table (IMMUTABLE: Insert-only via trigger)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenure_id UUID NOT NULL REFERENCES tenures(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,                    -- e.g. 'created', 'status_change', 'blocked', 'submitted'
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  message TEXT,                            -- Rendered human-readable activity log line
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Attach immutability trigger
CREATE TRIGGER trg_task_activity_immutable
BEFORE UPDATE OR DELETE ON task_activity
FOR EACH ROW EXECUTE FUNCTION prevent_task_activity_mutation();

-- ------------------------------------------------------------------------------
-- 11. Task Comments Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenure_id UUID NOT NULL REFERENCES tenures(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_task_comments_updated_at
BEFORE UPDATE ON task_comments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 12. Task Links Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenure_id UUID NOT NULL REFERENCES tenures(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_task_links_updated_at
BEFORE UPDATE ON task_links
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 13. Task Checklist Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenure_id UUID NOT NULL REFERENCES tenures(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_task_checklist_updated_at
BEFORE UPDATE ON task_checklist
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 14. Recurring Rules Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recurring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenure_id UUID NOT NULL REFERENCES tenures(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  context_type TEXT NOT NULL CHECK (context_type IN ('domain', 'committee')),
  context_id UUID NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'custom')),
  cron_expression TEXT,
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  default_assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_recurring_rules_updated_at
BEFORE UPDATE ON recurring_rules
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 15. Member Directory Table (Separate from users; may hold people with no account)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS member_directory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenure_id UUID NOT NULL REFERENCES tenures(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  domain_id UUID REFERENCES domains(id) ON DELETE SET NULL,
  domain_name TEXT,
  role_label TEXT,                         -- e.g. 'Domain Lead', 'Senior Associate', 'Member'
  birthday DATE,
  avatar_url TEXT,
  linked_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_member_directory_updated_at
BEFORE UPDATE ON member_directory
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 16. Meetings Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenure_id UUID NOT NULL REFERENCES tenures(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  location TEXT,
  context_type TEXT CHECK (context_type IN ('domain', 'committee', 'all')),
  context_id UUID,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_meetings_updated_at
BEFORE UPDATE ON meetings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 17. Attendance Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenure_id UUID NOT NULL REFERENCES tenures(id) ON DELETE CASCADE,
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  directory_member_id UUID REFERENCES member_directory(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'excused', 'late')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_attendance_updated_at
BEFORE UPDATE ON attendance
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 18. Announcements Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenure_id UUID NOT NULL REFERENCES tenures(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_announcements_updated_at
BEFORE UPDATE ON announcements
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 19. Notifications Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenure_id UUID NOT NULL REFERENCES tenures(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  type TEXT NOT NULL DEFAULT 'info',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_notifications_updated_at
BEFORE UPDATE ON notifications
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 20. Notification Preferences Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenure_id UUID NOT NULL REFERENCES tenures(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_email BOOLEAN NOT NULL DEFAULT TRUE,
  channel_inapp BOOLEAN NOT NULL DEFAULT TRUE,
  channel_push BOOLEAN NOT NULL DEFAULT FALSE,
  task_assigned BOOLEAN NOT NULL DEFAULT TRUE,
  task_status_changed BOOLEAN NOT NULL DEFAULT TRUE,
  meeting_reminder BOOLEAN NOT NULL DEFAULT TRUE,
  announcements BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_notification_prefs UNIQUE (tenure_id, user_id)
);

CREATE TRIGGER trg_notification_prefs_updated_at
BEFORE UPDATE ON notification_prefs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 21. Push Subscriptions Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_push_subscriptions_updated_at
BEFORE UPDATE ON push_subscriptions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 22. Audit Log Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenure_id UUID REFERENCES tenures(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,                    -- e.g. 'user.create', 'task.delete', 'perm.grant'
  entity_type TEXT NOT NULL,               -- e.g. 'user', 'task', 'permission'
  entity_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 23. Feature Flags Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,                -- e.g. 'dark_mode_theme', 'occasion_engine_auto_spawn'
  name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  tier TEXT NOT NULL DEFAULT 'tier-4'
    CHECK (tier IN ('tier-1', 'tier-2', 'tier-3', 'tier-4', 'experimental')),
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_feature_flags_updated_at
BEFORE UPDATE ON feature_flags
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 24. Pending Imports Table (Plumbing for CSV Bulk-Import)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pending_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenure_id UUID REFERENCES tenures(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  domain TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  imported_by UUID REFERENCES users(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_pending_imports_updated_at
BEFORE UPDATE ON pending_imports
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 25. Indexes for Multi-Tenancy and Polymorphic Contexts
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_domains_tenure ON domains(tenure_id);
CREATE INDEX IF NOT EXISTS idx_users_tenure ON users(tenure_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_lookup ON user_permissions(tenure_id, user_id);
CREATE INDEX IF NOT EXISTS idx_committees_tenure ON committees(tenure_id);
CREATE INDEX IF NOT EXISTS idx_committee_members_lookup ON committee_members(committee_id, user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_tenure ON tasks(tenure_id);
CREATE INDEX IF NOT EXISTS idx_tasks_context ON tasks(context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_domain ON tasks(domain_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_lookup ON task_assignees(task_id, user_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_task ON task_activity(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_links_task ON task_links(task_id);
CREATE INDEX IF NOT EXISTS idx_task_checklist_task ON task_checklist(task_id);
CREATE INDEX IF NOT EXISTS idx_recurring_rules_context ON recurring_rules(context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_member_directory_tenure ON member_directory(tenure_id);
CREATE INDEX IF NOT EXISTS idx_meetings_tenure ON meetings(tenure_id);
CREATE INDEX IF NOT EXISTS idx_attendance_meeting ON attendance(meeting_id);
CREATE INDEX IF NOT EXISTS idx_announcements_tenure ON announcements(tenure_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_pending_imports_batch ON pending_imports(batch_id, status);

-- ------------------------------------------------------------------------------
-- 26. Row Level Security (RLS) Scaffold
-- ------------------------------------------------------------------------------
-- NOTE FOR STREAM B:
-- RLS is enabled on all tables with safe placeholder policies.
-- Stream B owns `effective_permission()` and the actual business policies.
-- Stream B will DROP these placeholders and replace with real policy logic.
-- ------------------------------------------------------------------------------

ALTER TABLE tenures ENABLE ROW LEVEL SECURITY;
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE committees ENABLE ROW LEVEL SECURITY;
ALTER TABLE committee_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_imports ENABLE ROW LEVEL SECURITY;

-- Placeholder Policies: Safe deny-by-default or authenticated read placeholder.
-- Stream B will replace these with real effective_permission() policies.

CREATE POLICY "placeholder_tenures_read" ON tenures
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "placeholder_domains_read" ON domains
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "placeholder_users_read" ON users
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "placeholder_user_permissions_read" ON user_permissions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "placeholder_committees_read" ON committees
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "placeholder_committee_members_read" ON committee_members
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "placeholder_tasks_read" ON tasks
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "placeholder_tasks_modify" ON tasks
  FOR ALL TO authenticated USING (FALSE) WITH CHECK (FALSE);

CREATE POLICY "placeholder_task_assignees_read" ON task_assignees
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "placeholder_task_activity_read" ON task_activity
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "placeholder_task_comments_read" ON task_comments
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "placeholder_task_links_read" ON task_links
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "placeholder_task_checklist_read" ON task_checklist
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "placeholder_recurring_rules_read" ON recurring_rules
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "placeholder_member_directory_read" ON member_directory
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "placeholder_meetings_read" ON meetings
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "placeholder_attendance_read" ON attendance
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "placeholder_announcements_read" ON announcements
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "placeholder_notifications_user" ON notifications
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "placeholder_notification_prefs_user" ON notification_prefs
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "placeholder_push_subscriptions_user" ON push_subscriptions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "placeholder_audit_log_deny_all" ON audit_log
  FOR ALL TO authenticated USING (FALSE);

CREATE POLICY "placeholder_feature_flags_read" ON feature_flags
  FOR SELECT TO anon, authenticated USING (TRUE);

CREATE POLICY "placeholder_pending_imports_admin" ON pending_imports
  FOR ALL TO authenticated USING (FALSE);
