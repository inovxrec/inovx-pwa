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

export interface Tenure {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Domain {
  id: string;
  tenure_id: string;
  slug: string;
  name: string;
  lead_user_id: string | null;
  color: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
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
}

export interface UserPermission {
  id: string;
  tenure_id: string;
  user_id: string;
  permission_key: string;
  effect: TriState;
  created_at: string;
  updated_at: string;
}

export interface Committee {
  id: string;
  tenure_id: string;
  name: string;
  slug: string;
  lead_user_id: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommitteeMember {
  id: string;
  tenure_id: string;
  committee_id: string;
  user_id: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
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
}

export interface TaskAssignee {
  id: string;
  tenure_id: string;
  task_id: string;
  user_id: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskActivity {
  id: string;
  tenure_id: string;
  task_id: string;
  actor_id: string | null;
  action: string;
  details: Json;
  message: string | null;
  created_at: string;
}

export interface TaskComment {
  id: string;
  tenure_id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface TaskLink {
  id: string;
  tenure_id: string;
  task_id: string;
  title: string;
  url: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskChecklistItem {
  id: string;
  tenure_id: string;
  task_id: string;
  text: string;
  completed: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface RecurringRule {
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
}

export interface MemberDirectory {
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
}

export interface Meeting {
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
}

export interface Attendance {
  id: string;
  tenure_id: string;
  meeting_id: string;
  user_id: string | null;
  directory_member_id: string | null;
  status: AttendanceStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  tenure_id: string;
  title: string;
  body: string;
  author_id: string | null;
  is_pinned: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
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
}

export interface NotificationPrefs {
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
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
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
}

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  tier: FeatureFlagTier;
  rules: Json;
  created_at: string;
  updated_at: string;
}

export interface PendingImport {
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
}

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
      };
      domains: {
        Row: Domain;
        Insert: Partial<Domain> & Pick<Domain, 'tenure_id' | 'slug' | 'name'>;
        Update: Partial<Domain>;
      };
      users: {
        Row: User;
        Insert: Partial<User> & Pick<User, 'id' | 'email' | 'name'>;
        Update: Partial<User>;
      };
      user_permissions: {
        Row: UserPermission;
        Insert: Partial<UserPermission> & Pick<UserPermission, 'tenure_id' | 'user_id' | 'permission_key' | 'effect'>;
        Update: Partial<UserPermission>;
      };
      committees: {
        Row: Committee;
        Insert: Partial<Committee> & Pick<Committee, 'tenure_id' | 'name' | 'slug'>;
        Update: Partial<Committee>;
      };
      committee_members: {
        Row: CommitteeMember;
        Insert: Partial<CommitteeMember> & Pick<CommitteeMember, 'tenure_id' | 'committee_id' | 'user_id'>;
        Update: Partial<CommitteeMember>;
      };
      tasks: {
        Row: Task;
        Insert: Partial<Task> & Pick<Task, 'tenure_id' | 'task_number' | 'title' | 'context_type' | 'context_id'>;
        Update: Partial<Task>;
      };
      task_assignees: {
        Row: TaskAssignee;
        Insert: Partial<TaskAssignee> & Pick<TaskAssignee, 'tenure_id' | 'task_id' | 'user_id'>;
        Update: Partial<TaskAssignee>;
      };
      task_activity: {
        Row: TaskActivity;
        Insert: Partial<TaskActivity> & Pick<TaskActivity, 'tenure_id' | 'task_id' | 'action'>;
        Update: never; // Immutable: no updates allowed!
      };
      task_comments: {
        Row: TaskComment;
        Insert: Partial<TaskComment> & Pick<TaskComment, 'tenure_id' | 'task_id' | 'user_id' | 'content'>;
        Update: Partial<TaskComment>;
      };
      task_links: {
        Row: TaskLink;
        Insert: Partial<TaskLink> & Pick<TaskLink, 'tenure_id' | 'task_id' | 'title' | 'url'>;
        Update: Partial<TaskLink>;
      };
      task_checklist: {
        Row: TaskChecklistItem;
        Insert: Partial<TaskChecklistItem> & Pick<TaskChecklistItem, 'tenure_id' | 'task_id' | 'text'>;
        Update: Partial<TaskChecklistItem>;
      };
      recurring_rules: {
        Row: RecurringRule;
        Insert: Partial<RecurringRule> & Pick<RecurringRule, 'tenure_id' | 'title' | 'context_type' | 'context_id' | 'frequency'>;
        Update: Partial<RecurringRule>;
      };
      member_directory: {
        Row: MemberDirectory;
        Insert: Partial<MemberDirectory> & Pick<MemberDirectory, 'tenure_id' | 'name'>;
        Update: Partial<MemberDirectory>;
      };
      meetings: {
        Row: Meeting;
        Insert: Partial<Meeting> & Pick<Meeting, 'tenure_id' | 'title' | 'scheduled_at'>;
        Update: Partial<Meeting>;
      };
      attendance: {
        Row: Attendance;
        Insert: Partial<Attendance> & Pick<Attendance, 'tenure_id' | 'meeting_id' | 'status'>;
        Update: Partial<Attendance>;
      };
      announcements: {
        Row: Announcement;
        Insert: Partial<Announcement> & Pick<Announcement, 'tenure_id' | 'title' | 'body'>;
        Update: Partial<Announcement>;
      };
      notifications: {
        Row: Notification;
        Insert: Partial<Notification> & Pick<Notification, 'tenure_id' | 'user_id' | 'title' | 'body'>;
        Update: Partial<Notification>;
      };
      notification_prefs: {
        Row: NotificationPrefs;
        Insert: Partial<NotificationPrefs> & Pick<NotificationPrefs, 'tenure_id' | 'user_id'>;
        Update: Partial<NotificationPrefs>;
      };
      push_subscriptions: {
        Row: PushSubscription;
        Insert: Partial<PushSubscription> & Pick<PushSubscription, 'user_id' | 'endpoint' | 'p256dh' | 'auth'>;
        Update: Partial<PushSubscription>;
      };
      audit_log: {
        Row: AuditLog;
        Insert: Partial<AuditLog> & Pick<AuditLog, 'action' | 'entity_type'>;
        Update: never;
      };
      feature_flags: {
        Row: FeatureFlag;
        Insert: Partial<FeatureFlag> & Pick<FeatureFlag, 'key' | 'name'>;
        Update: Partial<FeatureFlag>;
      };
      pending_imports: {
        Row: PendingImport;
        Insert: Partial<PendingImport> & Pick<PendingImport, 'batch_id' | 'name' | 'email' | 'domain' | 'role'>;
        Update: Partial<PendingImport>;
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
