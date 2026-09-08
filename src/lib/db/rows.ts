/*
  The database's own shapes, as `supabase/migrations/20260907000000_foundation_schema.sql`
  declares them.

  Hand-written rather than generated so the frontend has no build-time
  dependency on the backend repo. When the schema moves, these move with it —
  and a mismatch shows up as a type error at the mapper rather than as an
  undefined three screens away.

  Nothing outside `lib/db` should import these: the rest of the app speaks the
  domain types in `lib/tasks.ts` and `lib/club.ts`.
*/

export type Uuid = string;

export interface UserRow {
  id: Uuid;
  tenure_id: Uuid | null;
  email: string;
  name: string;
  initials: string | null;
  /** The database spells it super_admin; the app spells it super-admin. */
  role: 'member' | 'admin' | 'super_admin' | 'faculty';
  domain_id: Uuid | null;
  domain: string | null;
  position_title: string | null;
  status: 'active' | 'inactive' | 'suspended';
  must_change_password: boolean;
  avatar_url: string | null;
}

export interface DomainRow {
  id: Uuid;
  tenure_id: Uuid;
  slug: string;
  name: string;
  lead_user_id: Uuid | null;
  color: string;
  description: string | null;
}

export interface CommitteeRow {
  id: Uuid;
  tenure_id: Uuid;
  name: string;
  slug: string;
  lead_user_id: Uuid | null;
  description: string | null;
}

export interface CommitteeMemberRow {
  id: Uuid;
  committee_id: Uuid;
  user_id: Uuid;
  role: string;
  users?: UserRow | null;
}

export interface TaskRow {
  id: Uuid;
  tenure_id: Uuid;
  task_number: string;
  title: string;
  description: string | null;
  context_type: 'domain' | 'committee';
  context_id: Uuid;
  domain_id: Uuid | null;
  status: 'todo' | 'progress' | 'review' | 'done' | 'blocked' | 'proposed';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  due_date: string | null;
  due_label: string | null;
  is_overdue: boolean;
  is_blocked: boolean;
  blocked_reason: string | null;
  tags: string[];
  created_by: Uuid | null;
  created_at: string;

  /** Joined in by the task query. */
  task_assignees?: Array<{ user_id: Uuid; is_primary: boolean; users: UserRow | null }>;
  task_checklist?: Array<{ id: Uuid; text: string; completed: boolean; position: number }>;
  task_links?: Array<{ id: Uuid; title: string; url: string }>;
  task_comments?: Array<{ id: Uuid; content: string; created_at: string; users: UserRow | null }>;
  task_activity?: Array<{
    id: Uuid;
    action: string;
    message: string | null;
    created_at: string;
    users: UserRow | null;
  }>;
}

export interface UserPermissionRow {
  id: Uuid;
  user_id: Uuid;
  permission_key: string;
  effect: 'grant' | 'revoke' | 'inherit';
}

export interface MemberDirectoryRow {
  id: Uuid;
  name: string;
  email: string | null;
  domain_id: Uuid | null;
  domain_name: string | null;
  role_label: string | null;
  birthday: string | null;
  avatar_url: string | null;
  linked_user_id: Uuid | null;
}

export interface MeetingRow {
  id: Uuid;
  title: string;
  description: string | null;
  scheduled_at: string;
  location: string | null;
  context_type: 'domain' | 'committee' | 'all' | null;
  context_id: Uuid | null;
  created_by: Uuid | null;
  attendance?: AttendanceRow[];
}

export interface AttendanceRow {
  id: Uuid;
  meeting_id: Uuid;
  user_id: Uuid | null;
  status: 'present' | 'absent' | 'excused' | 'late';
  notes: string | null;
  users?: UserRow | null;
}

export interface AnnouncementRow {
  id: Uuid;
  title: string;
  body: string;
  author_id: Uuid | null;
  is_pinned: boolean;
  published_at: string;
  users?: UserRow | null;
}

export interface NotificationRow {
  id: Uuid;
  user_id: Uuid;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  read_at: string | null;
  type: string;
  created_at: string;
}

export interface RecurringRuleRow {
  id: Uuid;
  title: string;
  description: string | null;
  context_type: 'domain' | 'committee';
  context_id: Uuid;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
  cron_expression: string | null;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  default_assignee_id: Uuid | null;
  is_active: boolean;
  next_run_at: string | null;
}

export interface AuditRow {
  id: Uuid;
  actor_id: Uuid | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
  users?: UserRow | null;
}

export interface TenureRow {
  id: Uuid;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface OccasionRow {
  id: Uuid;
  tenure_id: Uuid;
  name: string;
  occasion_type: 'birthday' | 'festival' | 'anniversary' | 'lunar';
  /** MM-DD. Null on a lunar occasion nobody has confirmed this year's date for. */
  occasion_date: string | null;
  confirmed_date: string | null;
  confirmed_year: number | null;
  output_domain_id: Uuid | null;
  lead_days: number;
  assignment_strategy: 'domain-lead' | 'round-robin' | 'unassigned';
  is_active: boolean;
  directory_member_id: Uuid | null;
}

export interface IntegrationRow {
  id: Uuid;
  tenure_id: Uuid;
  key: string;
  name: string;
  status: 'ok' | 'degraded' | 'failing' | 'disabled';
  note: string | null;
  last_synced_at: string | null;
  last_error: string | null;
  sync_requested_at: string | null;

  /** Joined in by the integrations query — the unresolved ones only. */
  integration_conflicts?: IntegrationConflictRow[];
}

export interface IntegrationConflictRow {
  id: Uuid;
  integration_id: Uuid;
  summary: string;
  resolved_at: string | null;
  created_at: string;
}
