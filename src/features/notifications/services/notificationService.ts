import { supabase } from '../../../lib/supabase';
import type { AppNotification, CreateNotificationInput, NotificationType } from '../types';

/** Fallback stable UUIDs for local mock session testing if users table is not yet seeded */
const MOCK_USER_IDS: Record<string, string> = {
  'Riya S.': '00000000-0000-0000-0000-000000000001',
  'Ananya R.': '00000000-0000-0000-0000-000000000002',
  'Dr. Nair': '00000000-0000-0000-0000-000000000003',
};

/**
 * Resolves the canonical user ID for the current session.
 * 1. Checks Supabase Auth session.
 * 2. If absent, attempts to match the canonical `users` table.
 * 3. Falls back to deterministic UUID for unblocked local development.
 */
export async function getCurrentUserId(sessionName?: string): Promise<string> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user?.id) {
      return authData.user.id;
    }
  } catch {
    // Auth session not active in local client
  }

  if (sessionName) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .ilike('name', `%${sessionName}%`)
        .limit(1);

      if (!error && data && data.length > 0 && data[0]?.id) {
        return data[0].id as string;
      }
    } catch {
      // Table users query failed
    }

    if (MOCK_USER_IDS[sessionName]) {
      return MOCK_USER_IDS[sessionName];
    }
  }

  return '00000000-0000-0000-0000-000000000001';
}

/**
 * Reads notifications for a user conforming to the team database contract:
 * (id, user_id, type, payload, read_at, created_at)
 * - read = read_at !== null
 * - unread = read_at === null
 * - title/message/metadata are inside payload JSONB
 */
export async function fetchNotifications(
  userId: string
): Promise<{ data: AppNotification[]; error: string | null; isPendingMigration?: boolean }> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, user_id, type, payload, read_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      const isMissingTable =
        error.message?.includes('Could not find the table') ||
        error.code === 'PGRST205' ||
        error.code === '42P01';

      return {
        data: [],
        error: error.message,
        isPendingMigration: isMissingTable,
      };
    }

    const formatted: AppNotification[] = (data || []).map((row: Record<string, unknown>) => {
      const payload = (row.payload as Record<string, unknown>) || {};
      const readAt = row.read_at ? String(row.read_at) : null;
      const isRead = readAt !== null;

      return {
        id: String(row.id),
        user_id: String(row.user_id),
        type: (row.type as NotificationType) || 'system',
        payload,
        read_at: readAt,
        created_at: String(row.created_at || new Date().toISOString()),
        title: String(payload.title || 'Operational Notice'),
        message: String(payload.message || ''),
        is_read: isRead,
        data: (payload.data as Record<string, unknown>) || payload,
      };
    });

    return { data: formatted, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to query notifications';
    return { data: [], error: message };
  }
}

/**
 * Marks a single notification as read by setting read_at timestamp.
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error updating notification status';
    return { success: false, error: message };
  }
}

/**
 * Marks all unread notifications for a user as read by setting read_at timestamp.
 */
export async function markAllNotificationsAsRead(
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error marking all notifications as read';
    return { success: false, error: message };
  }
}

/**
 * Creates a notification conforming to the team database contract:
 * (user_id, type, payload, read_at)
 * - details and deduplication keys are stored inside payload JSONB.
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<{ data: AppNotification | null; skipped?: boolean; error: string | null }> {
  try {
    const dedupeKey = input.deduplication_key;

    // Deduplication check: inspect recent notifications
    if (dedupeKey) {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data: existing, error: checkError } = await supabase
        .from('notifications')
        .select('id, user_id, type, payload, read_at, created_at')
        .eq('user_id', input.user_id)
        .eq('type', input.type)
        .gte('created_at', fifteenMinutesAgo);

      if (!checkError && existing && existing.length > 0) {
        const match = existing.find((item: Record<string, unknown>) => {
          const payload = item.payload as Record<string, unknown> | undefined;
          return payload?.idempotency_key === dedupeKey || payload?.deduplication_key === dedupeKey;
        });

        if (match) {
          const payload = (match.payload as Record<string, unknown>) || {};
          const readAt = match.read_at ? String(match.read_at) : null;
          return {
            data: {
              id: String(match.id),
              user_id: String(match.user_id),
              type: (match.type as NotificationType) || 'system',
              payload,
              read_at: readAt,
              created_at: String(match.created_at),
              title: String(payload.title || 'Operational Notice'),
              message: String(payload.message || ''),
              is_read: readAt !== null,
              data: (payload.data as Record<string, unknown>) || payload,
            },
            skipped: true,
            error: null,
          };
        }
      }
    }

    const payload = {
      title: input.title,
      message: input.message,
      ...(input.data || {}),
      idempotency_key: dedupeKey,
    };

    const { data: inserted, error: insertError } = await supabase
      .from('notifications')
      .insert({
        user_id: input.user_id,
        type: input.type,
        payload,
        read_at: null,
      })
      .select('id, user_id, type, payload, read_at, created_at')
      .single();

    if (insertError) {
      return { data: null, error: insertError.message };
    }

    const resPayload = (inserted.payload as Record<string, unknown>) || {};
    const readAt = inserted.read_at ? String(inserted.read_at) : null;
    const res: AppNotification = {
      id: String(inserted.id),
      user_id: String(inserted.user_id),
      type: (inserted.type as NotificationType) || 'system',
      payload: resPayload,
      read_at: readAt,
      created_at: String(inserted.created_at),
      title: String(resPayload.title || input.title),
      message: String(resPayload.message || input.message),
      is_read: readAt !== null,
      data: (resPayload.data as Record<string, unknown>) || resPayload,
    };

    return { data: res, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create notification';
    return { data: null, error: message };
  }
}
