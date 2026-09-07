import { supabase } from '../../../lib/supabase';
import type { EventPreferenceMatrix, NotificationChannel, NotificationType } from '../types';

export const DEFAULT_EVENT_TYPES: Array<{
  type: NotificationType;
  label: string;
  description: string;
  defaultInApp: boolean;
  defaultPush: boolean;
  defaultEmail: boolean;
}> = [
  {
    type: 'task_assigned',
    label: 'Task Assignments',
    description: 'Alerts when a card or directive is assigned to you',
    defaultInApp: true,
    defaultPush: true,
    defaultEmail: false,
  },
  {
    type: 'task_status',
    label: 'Status Changes',
    description: 'Progress, review approvals, and column transitions',
    defaultInApp: true,
    defaultPush: false,
    defaultEmail: false,
  },
  {
    type: 'deadline_reminder',
    label: 'Deadline Reminders',
    description: 'Upcoming sprint deadlines and overdue alerts',
    defaultInApp: true,
    defaultPush: true,
    defaultEmail: true,
  },
  {
    type: 'announcement',
    label: 'Station Broadcasts',
    description: 'High-priority command alerts and operational notices',
    defaultInApp: true,
    defaultPush: true,
    defaultEmail: true,
  },
  {
    type: 'mention',
    label: 'Mentions & Comms',
    description: 'Direct operator mentions in task discussion logs',
    defaultInApp: true,
    defaultPush: false,
    defaultEmail: false,
  },
];

/**
 * Fetches user notification preferences strictly conforming to the team database contract:
 * (user_id, event_type, channel, enabled)
 */
export async function fetchPreferences(
  userId: string
): Promise<{ data: EventPreferenceMatrix[]; error: string | null; isPendingMigration?: boolean }> {
  try {
    const { data, error } = await supabase
      .from('notification_prefs')
      .select('user_id, event_type, channel, enabled')
      .eq('user_id', userId);

    if (error) {
      const isMissingTable =
        error.message?.includes('Could not find the table') ||
        error.code === 'PGRST205' ||
        error.code === '42P01';

      const defaultMatrix: EventPreferenceMatrix[] = DEFAULT_EVENT_TYPES.map((item) => ({
        event_type: item.type,
        label: item.label,
        description: item.description,
        in_app: item.defaultInApp,
        push: item.defaultPush,
        email: item.defaultEmail,
      }));

      return {
        data: defaultMatrix,
        error: isMissingTable ? null : error.message,
        isPendingMigration: isMissingTable,
      };
    }

    const matrix: EventPreferenceMatrix[] = DEFAULT_EVENT_TYPES.map((item) => {
      let inApp = item.defaultInApp;
      let push = item.defaultPush;
      let email = item.defaultEmail;

      if (data && data.length > 0) {
        for (const row of data as Array<Record<string, unknown>>) {
          if (row.event_type === item.type) {
            if (row.channel === 'in_app' && typeof row.enabled === 'boolean') inApp = row.enabled;
            if (row.channel === 'push' && typeof row.enabled === 'boolean') push = row.enabled;
            if (row.channel === 'email' && typeof row.enabled === 'boolean') email = row.enabled;
          }
        }
      }

      return {
        event_type: item.type,
        label: item.label,
        description: item.description,
        in_app: inApp,
        push,
        email,
      };
    });

    return { data: matrix, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to query notification preferences';
    return { data: [], error: message };
  }
}

/**
 * Persists a preference change strictly conforming to the team database contract:
 * (user_id, event_type, channel, enabled)
 */
export async function updatePreference(
  userId: string,
  eventType: NotificationType,
  channel: NotificationChannel,
  enabled: boolean
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from('notification_prefs').upsert(
      {
        user_id: userId,
        event_type: eventType,
        channel,
        enabled,
      },
      { onConflict: 'user_id,event_type,channel' }
    );

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to persist preference';
    return { success: false, error: message };
  }
}
