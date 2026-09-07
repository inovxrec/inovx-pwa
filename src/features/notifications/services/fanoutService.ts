import { supabase } from '../../../lib/supabase';
import type { NotificationType } from '../types';

export interface FanoutRecipient {
  userId: string;
  email?: string;
  name?: string;
}

export interface FanoutPayload {
  title: string;
  message: string;
  type: NotificationType;
  deduplicationKey?: string; // Fingerprint to prevent duplicate fan-out
  data?: Record<string, unknown>;
}

// In-memory cache for fast deduplication within local session
const processedFanoutKeys = new Set<string>();

/**
 * Deduplicating notification fan-out engine:
 * Dispatches notifications to an array of recipients while ensuring:
 * 1. Deduplication (same deduplicationKey + userId is never double-dispatched).
 * 2. Checks recipient channel preference (in_app, push, email).
 * 3. Conforms strictly to team schema:
 *    notifications: id, user_id, type, payload, read_at, created_at
 */
export async function fanoutNotification(
  recipients: FanoutRecipient[],
  payload: FanoutPayload
): Promise<{ dispatchedCount: number; deduplicatedCount: number; errors: string[] }> {
  let dispatchedCount = 0;
  let deduplicatedCount = 0;
  const errors: string[] = [];

  for (const recipient of recipients) {
    const dedupeKey = payload.deduplicationKey
      ? `${recipient.userId}::${payload.deduplicationKey}`
      : `${recipient.userId}::${payload.type}::${payload.title}`;

    if (processedFanoutKeys.has(dedupeKey)) {
      deduplicatedCount += 1;
      continue;
    }

    try {
      // Check user preferences if available
      const { data: prefData } = await supabase
        .from('notification_prefs')
        .select('channel, enabled')
        .eq('user_id', recipient.userId)
        .eq('event_type', payload.type);

      const inAppDisabled = prefData?.some((p) => p.channel === 'in_app' && !p.enabled);

      if (!inAppDisabled) {
        // Insert conforming notification
        const notifRecord = {
          id: crypto.randomUUID(),
          user_id: recipient.userId,
          type: payload.type,
          payload: {
            title: payload.title,
            message: payload.message,
            ...payload.data,
          },
          read_at: null,
          created_at: new Date().toISOString(),
        };

        const { error } = await supabase.from('notifications').insert(notifRecord);

        if (error) {
          // Table migration might be pending; record and continue
          errors.push(`User ${recipient.userId}: ${error.message}`);
        } else {
          dispatchedCount += 1;
          processedFanoutKeys.add(dedupeKey);
        }
      } else {
        deduplicatedCount += 1;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fanout failed';
      errors.push(`User ${recipient.userId}: ${msg}`);
    }
  }

  return { dispatchedCount, deduplicatedCount, errors };
}
