/**
 * INOVX OPS — DATABASE TYPES (STREAM A CONTRACT)
 * 
 * Auto-generated / mirrored from Supabase PostgreSQL schema:
 * Migration 20260907000000_foundation_schema.sql
 * 
 * This is the official interface contract that Streams B, C, D, E, and F code against.
 * Treat any modifications to this file as breaking changes.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ------------------------------------------------------------------------------
// Domain Enums & Literals
// ------------------------------------------------------------------------------

/**
 * 4 Recognized System Roles.
 * NOTE FOR FRONTEND TEAM: `src/layouts/navConfig.ts` currently only defines 3 roles.
 * 'super_admin' is introduced here as part of Stream A foundation.
 */
export type UserRole = 'member' | 'admin' | 'super_admin' | 'faculty';

export type UserStatus = 'active' | 'inactive' | 'suspended';

export type TriState = 'grant' | 'revoke' | 'inherit';

export type ContextType = 'domain' | 'committee';

export type MeetingContextType = 'domain' | 'committee' | 'all';

export type TaskStatus = 'todo' | 'progress' | 'review' | 'done' | 'blocked' | 'proposed';

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

export type RecurringFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';

export type AttendanceStatus = 'present' | 'absent' | 'excused' | 'late';

export type FeatureFlagTier = 'tier-1' | 'tier-2' | 'tier-3' | 'tier-4' | 'experimental';

export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed';

// ------------------------------------------------------------------------------
// Canonical Table Entities
// ------------------------------------------------------------------------------

export type Tenure = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Domain = {
  id: string;
  tenure_id: string;
  slug: string;
  name: string;
  lead_user_id: string | null;
  color: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type User = {
  id: string;
  tenure_id: string | null;
  email: string;
  name: string;
  initials: string | null;
  role: UserRole;
  domain_id: string | null;
  domain: string | null;
  position_title: string | null;
  status: UserStatus;
  must_change_password: boolean;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

export type UserPermission = {
  id: string;
  tenure_id: string;
  user_id: string;
  permission_key: string;
  effect: TriState;
  created_at: string;
  updated_at: string;
};

export type Committee = {
  id: string;
  tenure_id: string;
  name: string;
  slug: string;
  lead_user_id: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type CommitteeMember = {
  id: string;
  tenure_id: string;
  committee_id: string;
  user_id: string;
  role: string;
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: string;
  tenure_id: string;
  task_number: string;
  title: string;
  description: string | null;
  context_type: ContextType;
  context_id: string;
  domain_id: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  due_label: string | null;
  is_overdue: boolean;
  is_blocked: boolean;
  blocked_reason: string | null;
  tags: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskAssignee = {
  id: string;
  tenure_id: string;
  task_id: string;
  user_id: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
};

export type TaskActivity = {
  id: string;
  tenure_id: string;
  task_id: string;
  actor_id: string | null;
  action: string;
  details: Json;
  message: string | null;
  created_at: string;
};

export type TaskComment = {
  id: string;
  tenure_id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type TaskLink = {
  id: string;
  tenure_id: string;
  task_id: string;
  title: string;
  url: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskChecklistItem = {
  id: string;
  tenure_id: string;
  task_id: string;
  text: string;
  completed: boolean;
  position: number;
  created_at: string;
  updated_at: string;
};

export type RecurringRule = {
  id: string;
  tenure_id: string;
  title: string;
  description: string | null;
  context_type: ContextType;
  context_id: string;
  frequency: RecurringFrequency;
  cron_expression: string | null;
  priority: TaskPriority;
  default_assignee_id: string | null;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MemberDirectory = {
  id: string;
  tenure_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  domain_id: string | null;
  domain_name: string | null;
  role_label: string | null;
  birthday: string | null;
  avatar_url: string | null;
  linked_user_id: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

export type Meeting = {
  id: string;
  tenure_id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  location: string | null;
  context_type: MeetingContextType | null;
  context_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Attendance = {
  id: string;
  tenure_id: string;
  meeting_id: string;
  user_id: string | null;
  directory_member_id: string | null;
  status: AttendanceStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Announcement = {
  id: string;
  tenure_id: string;
  title: string;
  body: string;
  author_id: string | null;
  is_pinned: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
};

export type Notification = {
  id: string;
  tenure_id: string;
  user_id: string;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  read_at: string | null;
  type: string;
  created_at: string;
  updated_at: string;
};

export type NotificationPrefs = {
  id: string;
  tenure_id: string;
  user_id: string;
  channel_email: boolean;
  channel_inapp: boolean;
  channel_push: boolean;
  task_assigned: boolean;
  task_status_changed: boolean;
  meeting_reminder: boolean;
  announcements: boolean;
  created_at: string;
  updated_at: string;
};

export type PushSubscription = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
};

export type AuditLog = {
  id: string;
  tenure_id: string | null;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Json | null;
  new_values: Json | null;
  ip_address: string | null;
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
        Insert: Partial<Tenure> & Pick<Tenure, 'name' | 'start_date' | 'end_date'>;
        Update: Partial<Tenure>;
        Relationships: [];
      };
      domains: {
        Row: Domain;
        Insert: Partial<Domain> & Pick<Domain, 'tenure_id' | 'slug' | 'name'>;
        Update: Partial<Domain>;
        Relationships: [];
      };
      users: {
        Row: User;
        Insert: Partial<User> & Pick<User, 'id' | 'email' | 'name'>;
        Update: Partial<User>;
        Relationships: [];
      };
      user_permissions: {
        Row: UserPermission;
        Insert: Partial<UserPermission> & Pick<UserPermission, 'tenure_id' | 'user_id' | 'permission_key' | 'effect'>;
        Update: Partial<UserPermission>;
        Relationships: [];
      };
      committees: {
        Row: Committee;
        Insert: Partial<Committee> & Pick<Committee, 'tenure_id' | 'name' | 'slug'>;
        Update: Partial<Committee>;
        Relationships: [];
      };
      committee_members: {
        Row: CommitteeMember;
        Insert: Partial<CommitteeMember> & Pick<CommitteeMember, 'tenure_id' | 'committee_id' | 'user_id'>;
        Update: Partial<CommitteeMember>;
        Relationships: [];
      };
      tasks: {
        Row: Task;
        Insert: Partial<Task> & Pick<Task, 'tenure_id' | 'task_number' | 'title' | 'context_type' | 'context_id'>;
        Update: Partial<Task>;
        Relationships: [];
      };
      task_assignees: {
        Row: TaskAssignee;
        Insert: Partial<TaskAssignee> & Pick<TaskAssignee, 'tenure_id' | 'task_id' | 'user_id'>;
        Update: Partial<TaskAssignee>;
        Relationships: [];
      };
      task_activity: {
        Row: TaskActivity;
        Insert: Partial<TaskActivity> & Pick<TaskActivity, 'tenure_id' | 'task_id' | 'action'>;
        Update: Partial<TaskActivity>; // Note: DB trigger prevents updates at runtime
        Relationships: [];
      };
      task_comments: {
        Row: TaskComment;
        Insert: Partial<TaskComment> & Pick<TaskComment, 'tenure_id' | 'task_id' | 'user_id' | 'content'>;
        Update: Partial<TaskComment>;
        Relationships: [];
      };
      task_links: {
        Row: TaskLink;
        Insert: Partial<TaskLink> & Pick<TaskLink, 'tenure_id' | 'task_id' | 'title' | 'url'>;
        Update: Partial<TaskLink>;
        Relationships: [];
      };
      task_checklist: {
        Row: TaskChecklistItem;
        Insert: Partial<TaskChecklistItem> & Pick<TaskChecklistItem, 'tenure_id' | 'task_id' | 'text'>;
        Update: Partial<TaskChecklistItem>;
        Relationships: [];
      };
      recurring_rules: {
        Row: RecurringRule;
        Insert: Partial<RecurringRule> & Pick<RecurringRule, 'tenure_id' | 'title' | 'context_type' | 'context_id' | 'frequency'>;
        Update: Partial<RecurringRule>;
        Relationships: [];
      };
      member_directory: {
        Row: MemberDirectory;
        Insert: Partial<MemberDirectory> & Pick<MemberDirectory, 'tenure_id' | 'name'>;
        Update: Partial<MemberDirectory>;
        Relationships: [];
      };
      meetings: {
        Row: Meeting;
        Insert: Partial<Meeting> & Pick<Meeting, 'tenure_id' | 'title' | 'scheduled_at'>;
        Update: Partial<Meeting>;
        Relationships: [];
      };
      attendance: {
        Row: Attendance;
        Insert: Partial<Attendance> & Pick<Attendance, 'tenure_id' | 'meeting_id' | 'status'>;
        Update: Partial<Attendance>;
        Relationships: [];
      };
      announcements: {
        Row: Announcement;
        Insert: Partial<Announcement> & Pick<Announcement, 'tenure_id' | 'title' | 'body'>;
        Update: Partial<Announcement>;
        Relationships: [];
      };
      notifications: {
        Row: Notification;
        Insert: Partial<Notification> & Pick<Notification, 'tenure_id' | 'user_id' | 'title' | 'body'>;
        Update: Partial<Notification>;
        Relationships: [];
      };
      notification_prefs: {
        Row: NotificationPrefs;
        Insert: Partial<NotificationPrefs> & Pick<NotificationPrefs, 'tenure_id' | 'user_id'>;
        Update: Partial<NotificationPrefs>;
        Relationships: [];
      };
      push_subscriptions: {
        Row: PushSubscription;
        Insert: Partial<PushSubscription> & Pick<PushSubscription, 'user_id' | 'endpoint' | 'p256dh' | 'auth'>;
        Update: Partial<PushSubscription>;
        Relationships: [];
      };
      audit_log: {
        Row: AuditLog;
        Insert: Partial<AuditLog> & Pick<AuditLog, 'action' | 'entity_type'>;
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
      tri_state: TriState;
      context_type: ContextType;
      task_status: TaskStatus;
      task_priority: TaskPriority;
      recurring_frequency: RecurringFrequency;
      attendance_status: AttendanceStatus;
      feature_flag_tier: FeatureFlagTier;
      import_status: ImportStatus;
    };
  };
}
