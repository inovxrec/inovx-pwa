export type NotificationChannel = 'in_app' | 'push' | 'email';

export type NotificationType =
  | 'task_assigned'
  | 'task_status'
  | 'deadline_reminder'
  | 'announcement'
  | 'mention'
  | 'system';

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
  // UI computed convenience properties
  title: string;
  message: string;
  is_read: boolean;
  data?: Record<string, unknown> | null;
}

export interface Announcement {
  id: string;
  scope?: 'club' | 'domain' | 'committee';
  scope_id?: string | null;
  title: string;
  body: string;
  pinned: boolean;
  expires_at?: string | null;
  sender_id?: string | null;
  created_at: string;
}

export interface NotificationPreference {
  user_id: string;
  event_type: NotificationType;
  channel: NotificationChannel;
  enabled: boolean;
}

export interface EventPreferenceMatrix {
  event_type: NotificationType;
  label: string;
  description: string;
  in_app: boolean;
  push: boolean;
  email: boolean;
}

export interface CreateNotificationInput {
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  deduplication_key?: string;
  data?: Record<string, unknown>;
}

export interface PushSubscriptionRecord {
  id?: string;
  user_id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
    [key: string]: unknown;
  };
  user_agent?: string | null;
  created_at?: string;
}
