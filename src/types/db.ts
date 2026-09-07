/**
 * INOVX OPS — DATABASE TYPES (STREAM A CONTRACT)
 * 
 * Canonical TypeScript interfaces matching the approved PostgreSQL schema (Draft v1).
 * Source: supabase/migrations/20260907000000_foundation_schema.sql
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ------------------------------------------------------------------------------
// Domain Enums & Literals (matching DDL exact enum types)
// ------------------------------------------------------------------------------

export type UserRole = 'super_admin' | 'admin' | 'member' | 'faculty';

export type UserStatus = 'active' | 'deactivated';

export type TaskStatus =
  | 'todo'
  | 'progress'
  | 'review'
  | 'done'
  | 'blocked'
  | 'cancelled'
  | 'proposed';

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

export type TaskContext = 'domain' | 'committee';

export type BoardVisibility = 'private' | 'club_visible' | 'shared_with';

export type ScopeKind = 'club' | 'domain' | 'committee';

export type RecurrenceFreq =
  | 'daily'
  | 'weekly'
  | 'fortnightly'
  | 'monthly'
  | 'yearly'
  | 'every_n_days';

export type AssignmentStrategy =
  | 'fixed'
  | 'round_robin'
  | 'whole_group'
  | 'unassigned_queue';

export type RecurringSource = 'interval' | 'data_driven';

export type AttendanceStatus = 'present' | 'absent' | 'excused';

export type NotificationChannel = 'in_app' | 'push' | 'email';

export type TenureStatus = 'active' | 'archived';

export type RetentionChoice = 'undecided' | 'retain' | 'delete';

export type FeatureFlagTier =
  | 'tier-1'
  | 'tier-2'
  | 'tier-3'
  | 'tier-4'
  | 'experimental';

export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed';

// ------------------------------------------------------------------------------
// Canonical Table Entities
// ------------------------------------------------------------------------------

export type Tenure = {
  id: string;
  label: string;
  starts_on: string | null;
  ends_on: string | null;
  status: TenureStatus;
  archived_at: string | null;
  retention: RetentionChoice;
  archive_export: Json | null;
};

export type Domain = {
  id: string;
  key: string;
  name: string;
  lead_user_id: string | null;
  visibility: BoardVisibility;
  archived: boolean;
  tenure_id: string;
};

export type User = {
  id: string;
  email: string;
  name: string;
  initials: string | null;
  domain_id: string | null;
  role: UserRole;
  position_title: string | null;
  status: UserStatus;
  must_change_password: boolean;
  tenure_id: string;
};

export type Permission = {
  key: string;
  label: string;
  description: string | null;
};

export type RolePermissionMatrix = {
  role: UserRole;
  permission_key: string;
  default_on: boolean;
};

export type UserPermission = {
  id: string;
  user_id: string;
  permission_key: string;
  granted: boolean;
  scope: Json | null;
  set_by: string | null;
  set_at: string;
};

export type Committee = {
  id: string;
  name: string;
  purpose: string | null;
  linked_event: string | null;
  starts_on: string | null;
  expected_end: string | null;
  visibility: BoardVisibility;
  archived: boolean;
  tenure_id: string;
};

export type CommitteeMember = {
  committee_id: string;
  user_id: string;
  is_coordinator: boolean;
};

export type RecurringRule = {
  id: string;
  title_template: string;
  desc_template: string | null;
  context_type: TaskContext;
  context_id: string;
  frequency: RecurrenceFreq;
  weekdays: number[] | null;
  every_n_days: number | null;
  strategy: AssignmentStrategy;
  assignee_pool: string[];
  lead_time_days: number;
  approval_required: boolean;
  source_type: RecurringSource;
  paused: boolean;
  tenure_id: string;
};

export type Task = {
  id: string;
  seq: number;
  title: string;
  description: string | null;
  context_type: TaskContext;
  context_id: string;
  priority: TaskPriority;
  due_at: string | null;
  status: TaskStatus;
  labels: string[];
  creator_id: string | null;
  approval_required: boolean;
  blocked_reason: string | null;
  recurring_rule_id: string | null;
  proposal_reason: string | null;
  proposal_decided_by: string | null;
  tenure_id: string;
  created_at: string;
};

export type TaskAssignee = {
  task_id: string;
  user_id: string;
  assigned_by: string | null;
  assigned_at: string;
};

export type TaskActivity = {
  id: string;
  task_id: string;
  actor_id: string | null;
  action: string;
  from_val: string | null;
  to_val: string | null;
  note: string | null;
  created_at: string;
};

export type TaskComment = {
  id: string;
  task_id: string;
  author_id: string | null;
  body: string;
  mentions: string[];
  created_at: string;
};

export type TaskLink = {
  id: string;
  task_id: string;
  url: string;
  label: string | null;
  detected_provider: string | null;
  added_by: string | null;
  position: number;
  last_checked_at: string | null;
  alive: boolean | null;
  created_at: string;
};

export type TaskChecklist = {
  id: string;
  task_id: string;
  text: string;
  completed: boolean;
  position: number;
};

export type MemberDirectory = {
  id: string;
  external_key: string | null;
  name: string;
  dob: string | null;
  team: string | null;
  card_url: string | null;
  photo_url: string | null;
  conflict_flag: boolean;
  synced_at: string | null;
};

export type Meeting = {
  id: string;
  scope: ScopeKind;
  scope_id: string | null;
  title: string;
  held_at: string | null;
  venue: string | null;
  minutes: string | null;
  published_at: string | null;
  tenure_id: string;
};

export type Attendance = {
  meeting_id: string;
  user_id: string;
  status: AttendanceStatus;
  marked_by: string | null;
};

export type Announcement = {
  id: string;
  scope: ScopeKind;
  scope_id: string | null;
  title: string;
  body: string | null;
  pinned: boolean;
  expires_at: string | null;
  sender_id: string | null;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  payload: Json | null;
  read_at: string | null;
  created_at: string;
};

export type NotificationPrefs = {
  user_id: string;
  event_type: string;
  channel: NotificationChannel;
  enabled: boolean;
};

export type PushSubscription = {
  id: string;
  user_id: string;
  endpoint: string;
  keys: Json;
  user_agent: string | null;
  created_at: string;
};

export type AuditLog = {
  id: string;
  actor_id: string | null;
  entity: string;
  action: string;
  diff: Json | null;
  created_at: string;
};

export type FeatureFlag = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  tier: FeatureFlagTier;
  rules: Json;
  created_at: string;
  updated_at: string;
};

export type PendingImport = {
  id: string;
  tenure_id: string | null;
  batch_id: string;
  name: string;
  email: string;
  domain: string;
  role: string;
  status: ImportStatus;
  error_message: string | null;
  imported_by: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
};

// ------------------------------------------------------------------------------
// Generic Supabase Schema Definition for Typed Client
// ------------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      tenures: {
        Row: Tenure;
        Insert: Partial<Tenure> & Pick<Tenure, 'label'>;
        Update: Partial<Tenure>;
        Relationships: [];
      };
      domains: {
        Row: Domain;
        Insert: Partial<Domain> & Pick<Domain, 'key' | 'name' | 'tenure_id'>;
        Update: Partial<Domain>;
        Relationships: [];
      };
      users: {
        Row: User;
        Insert: Partial<User> & Pick<User, 'id' | 'email' | 'name' | 'tenure_id'>;
        Update: Partial<User>;
        Relationships: [];
      };
      permissions: {
        Row: Permission;
        Insert: Permission;
        Update: Partial<Permission>;
        Relationships: [];
      };
      role_permission_matrix: {
        Row: RolePermissionMatrix;
        Insert: RolePermissionMatrix;
        Update: Partial<RolePermissionMatrix>;
        Relationships: [];
      };
      user_permissions: {
        Row: UserPermission;
        Insert: Partial<UserPermission> & Pick<UserPermission, 'user_id' | 'permission_key' | 'granted'>;
        Update: Partial<UserPermission>;
        Relationships: [];
      };
      committees: {
        Row: Committee;
        Insert: Partial<Committee> & Pick<Committee, 'name' | 'tenure_id'>;
        Update: Partial<Committee>;
        Relationships: [];
      };
      committee_members: {
        Row: CommitteeMember;
        Insert: CommitteeMember;
        Update: Partial<CommitteeMember>;
        Relationships: [];
      };
      tasks: {
        Row: Task;
        Insert: Partial<Task> & Pick<Task, 'title' | 'context_type' | 'context_id' | 'tenure_id'>;
        Update: Partial<Task>;
        Relationships: [];
      };
      task_assignees: {
        Row: TaskAssignee;
        Insert: TaskAssignee;
        Update: Partial<TaskAssignee>;
        Relationships: [];
      };
      task_activity: {
        Row: TaskActivity;
        Insert: Partial<TaskActivity> & Pick<TaskActivity, 'task_id' | 'action'>;
        Update: Partial<TaskActivity>;
        Relationships: [];
      };
      task_comments: {
        Row: TaskComment;
        Insert: Partial<TaskComment> & Pick<TaskComment, 'task_id' | 'body'>;
        Update: Partial<TaskComment>;
        Relationships: [];
      };
      task_links: {
        Row: TaskLink;
        Insert: Partial<TaskLink> & Pick<TaskLink, 'task_id' | 'url'>;
        Update: Partial<TaskLink>;
        Relationships: [];
      };
      task_checklist: {
        Row: TaskChecklist;
        Insert: Partial<TaskChecklist> & Pick<TaskChecklist, 'task_id' | 'text'>;
        Update: Partial<TaskChecklist>;
        Relationships: [];
      };
      recurring_rules: {
        Row: RecurringRule;
        Insert: Partial<RecurringRule> & Pick<RecurringRule, 'title_template' | 'context_type' | 'context_id' | 'frequency' | 'tenure_id'>;
        Update: Partial<RecurringRule>;
        Relationships: [];
      };
      member_directory: {
        Row: MemberDirectory;
        Insert: Partial<MemberDirectory> & Pick<MemberDirectory, 'name'>;
        Update: Partial<MemberDirectory>;
        Relationships: [];
      };
      meetings: {
        Row: Meeting;
        Insert: Partial<Meeting> & Pick<Meeting, 'scope' | 'title' | 'tenure_id'>;
        Update: Partial<Meeting>;
        Relationships: [];
      };
      attendance: {
        Row: Attendance;
        Insert: Attendance;
        Update: Partial<Attendance>;
        Relationships: [];
      };
      announcements: {
        Row: Announcement;
        Insert: Partial<Announcement> & Pick<Announcement, 'scope' | 'title'>;
        Update: Partial<Announcement>;
        Relationships: [];
      };
      notifications: {
        Row: Notification;
        Insert: Partial<Notification> & Pick<Notification, 'user_id' | 'type'>;
        Update: Partial<Notification>;
        Relationships: [];
      };
      notification_prefs: {
        Row: NotificationPrefs;
        Insert: NotificationPrefs;
        Update: Partial<NotificationPrefs>;
        Relationships: [];
      };
      push_subscriptions: {
        Row: PushSubscription;
        Insert: Partial<PushSubscription> & Pick<PushSubscription, 'user_id' | 'endpoint' | 'keys'>;
        Update: Partial<PushSubscription>;
        Relationships: [];
      };
      audit_log: {
        Row: AuditLog;
        Insert: Partial<AuditLog> & Pick<AuditLog, 'entity' | 'action'>;
        Update: Partial<AuditLog>;
        Relationships: [];
      };
      feature_flags: {
        Row: FeatureFlag;
        Insert: Partial<FeatureFlag> & Pick<FeatureFlag, 'key' | 'name'>;
        Update: Partial<FeatureFlag>;
        Relationships: [];
      };
      pending_imports: {
        Row: PendingImport;
        Insert: Partial<PendingImport> & Pick<PendingImport, 'batch_id' | 'name' | 'email' | 'domain' | 'role'>;
        Update: Partial<PendingImport>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: UserRole;
      user_status: UserStatus;
      task_status: TaskStatus;
      task_priority: TaskPriority;
      task_context: TaskContext;
      board_visibility: BoardVisibility;
      scope_kind: ScopeKind;
      recurrence_freq: RecurrenceFreq;
      assignment_strategy: AssignmentStrategy;
      recurring_source: RecurringSource;
      attendance_status: AttendanceStatus;
      notification_channel: NotificationChannel;
      tenure_status: TenureStatus;
      retention_choice: RetentionChoice;
      feature_flag_tier: FeatureFlagTier;
      import_status: ImportStatus;
    };
  };
}
