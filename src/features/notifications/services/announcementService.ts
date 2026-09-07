import { supabase } from '../../../lib/supabase';
import type { Announcement } from '../types';

/**
 * Fetches active announcements conforming to the team database contract:
 * (id, scope, scope_id, title, body, pinned, expires_at, sender_id, created_at)
 * - Pinned announcements are sorted first.
 * - Expired announcements (where expires_at < now) are excluded.
 */
export async function fetchAnnouncements(): Promise<{
  data: Announcement[];
  error: string | null;
  isPendingMigration?: boolean;
}> {
  try {
    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from('announcements')
      .select('id, scope, scope_id, title, body, pinned, expires_at, sender_id, created_at')
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order('pinned', { ascending: false, nullsFirst: false })
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

    const announcements: Announcement[] = (data || []).map((row: Record<string, unknown>) => ({
      id: String(row.id),
      scope: (row.scope as Announcement['scope']) || 'club',
      scope_id: row.scope_id ? String(row.scope_id) : null,
      title: String(row.title || 'Broadcast'),
      body: String(row.body || ''),
      pinned: Boolean(row.pinned ?? false),
      expires_at: row.expires_at ? String(row.expires_at) : null,
      sender_id: row.sender_id ? String(row.sender_id) : null,
      created_at: String(row.created_at || new Date().toISOString()),
    }));

    return { data: announcements, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to query announcements';
    return { data: [], error: message };
  }
}
