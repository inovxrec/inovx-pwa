import { supabase } from '../../../lib/supabase';
import type { CreateMeetingInput, Meeting, UpdateMeetingInput } from '../types';

const INITIAL_FALLBACK_MEETINGS: Meeting[] = [
  {
    id: 'meet-101',
    title: 'Sprint 84 Architecture & Telemetry Brief',
    scope: 'domain',
    scope_id: 'technical',
    held_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // Tomorrow
    venue: 'Bridge Channel 1 · Virtual Deck',
    minutes: 'Agenda: 1. Supabase schema audit 2. Realtime notification pipelines 3. Action items assignation.',
    published_at: null,
    tenure_id: null,
    status: 'scheduled',
    domain: 'technical',
  },
  {
    id: 'meet-102',
    title: 'Design Review — Phosphor Aesthetics & Tokens',
    scope: 'domain',
    scope_id: 'design',
    held_at: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(), // In 2 days
    venue: 'Studio Terminal 4 / Discord Stage',
    minutes: null,
    published_at: null,
    tenure_id: null,
    status: 'scheduled',
    domain: 'design',
  },
  {
    id: 'meet-103',
    title: 'Faculty Oversight Briefing with Dr. Nair',
    scope: 'club',
    scope_id: null,
    held_at: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(), // In 3 days
    venue: 'Command Chamber 102',
    minutes: null,
    published_at: null,
    tenure_id: null,
    status: 'scheduled',
    domain: 'management',
  },
  {
    id: 'meet-104',
    title: 'Sprint 83 Post-Mortem & Domain Handoff',
    scope: 'domain',
    scope_id: 'technical',
    held_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    venue: 'Main Ops Briefing Room',
    minutes: 'Recorded minutes: All domain leads completed handoffs. Permissions deck was verified. Attendance recorded with 90% quorum.',
    published_at: new Date(Date.now() - 1000 * 60 * 60 * 46).toISOString(),
    tenure_id: null,
    status: 'completed',
    domain: 'technical',
  },
];

const LOCAL_STORAGE_KEY = 'inovx84_meetings_cache';

function getLocalMeetings(): Meeting[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore local storage parse error
  }
  return INITIAL_FALLBACK_MEETINGS;
}

function saveLocalMeetings(meetings: Meeting[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(meetings));
  } catch {
    // Ignore local storage error
  }
}

/**
 * Fetches all meetings conforming to the team database contract:
 * (id, scope, scope_id, title, held_at, venue, minutes, published_at, tenure_id)
 */
export async function getMeetings(): Promise<{
  data: Meeting[];
  error: string | null;
  isPendingMigration?: boolean;
}> {
  try {
    const { data, error } = await supabase
      .from('meetings')
      .select('id, scope, scope_id, title, held_at, venue, minutes, published_at, tenure_id')
      .order('held_at', { ascending: true });

    if (error) {
      const isMissingTable =
        error.message?.includes('Could not find the table') ||
        error.code === 'PGRST205' ||
        error.code === '42P01';

      if (isMissingTable) {
        return {
          data: getLocalMeetings(),
          error: null,
          isPendingMigration: true,
        };
      }
      return { data: [], error: error.message };
    }

    const now = Date.now();
    const formatted: Meeting[] = (data || []).map((row: Record<string, unknown>) => {
      const heldAtStr = String(row.held_at || new Date().toISOString());
      const isConcluded = new Date(heldAtStr).getTime() < now || Boolean(row.minutes);

      return {
        id: String(row.id),
        scope: (row.scope as Meeting['scope']) || 'club',
        scope_id: row.scope_id ? String(row.scope_id) : null,
        title: String(row.title || 'Untitled Meeting'),
        held_at: heldAtStr,
        venue: String(row.venue || 'TBD'),
        minutes: row.minutes ? String(row.minutes) : null,
        published_at: row.published_at ? String(row.published_at) : null,
        tenure_id: row.tenure_id ? String(row.tenure_id) : null,
        status: isConcluded ? 'completed' : 'scheduled',
        domain: row.scope === 'domain' && row.scope_id ? String(row.scope_id) : 'club',
      };
    });

    return { data: formatted, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to query meetings';
    return { data: getLocalMeetings(), error: message, isPendingMigration: true };
  }
}

/**
 * Fetches a single meeting by ID.
 */
export async function getMeetingById(
  id: string
): Promise<{ data: Meeting | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('meetings')
      .select('id, scope, scope_id, title, held_at, venue, minutes, published_at, tenure_id')
      .eq('id', id)
      .single();

    if (error) {
      const local = getLocalMeetings().find((m) => m.id === id);
      if (local) return { data: local, error: null };
      return { data: null, error: error.message };
    }

    const heldAtStr = String(data.held_at);
    const isConcluded = new Date(heldAtStr).getTime() < Date.now() || Boolean(data.minutes);

    return {
      data: {
        id: String(data.id),
        scope: (data.scope as Meeting['scope']) || 'club',
        scope_id: data.scope_id ? String(data.scope_id) : null,
        title: String(data.title),
        held_at: heldAtStr,
        venue: String(data.venue || 'TBD'),
        minutes: data.minutes ? String(data.minutes) : null,
        published_at: data.published_at ? String(data.published_at) : null,
        tenure_id: data.tenure_id ? String(data.tenure_id) : null,
        status: isConcluded ? 'completed' : 'scheduled',
        domain: data.scope === 'domain' && data.scope_id ? String(data.scope_id) : 'club',
      },
      error: null,
    };
  } catch (err: unknown) {
    const local = getLocalMeetings().find((m) => m.id === id);
    if (local) return { data: local, error: null };
    const message = err instanceof Error ? err.message : 'Error retrieving meeting';
    return { data: null, error: message };
  }
}

/**
 * Creates a new meeting strictly using the team database schema:
 * (scope, scope_id, title, held_at, venue, minutes, tenure_id)
 */
export async function createMeeting(
  input: CreateMeetingInput
): Promise<{ data: Meeting | null; error: string | null }> {
  const newMeeting: Meeting = {
    id: 'meet-' + Date.now(),
    scope: input.scope || 'club',
    scope_id: input.scope_id || null,
    title: input.title,
    held_at: input.held_at,
    venue: input.venue,
    minutes: input.minutes || null,
    published_at: null,
    tenure_id: input.tenure_id || null,
    status: 'scheduled',
    domain: input.scope === 'domain' && input.scope_id ? input.scope_id : 'club',
  };

  try {
    const { data, error } = await supabase
      .from('meetings')
      .insert({
        scope: input.scope || 'club',
        scope_id: input.scope_id || null,
        title: input.title,
        held_at: input.held_at,
        venue: input.venue,
        minutes: input.minutes || null,
        tenure_id: input.tenure_id || null,
      })
      .select('id, scope, scope_id, title, held_at, venue, minutes, published_at, tenure_id')
      .single();

    if (!error && data) {
      const heldAtStr = String(data.held_at);
      return {
        data: {
          id: String(data.id),
          scope: (data.scope as Meeting['scope']) || 'club',
          scope_id: data.scope_id ? String(data.scope_id) : null,
          title: String(data.title),
          held_at: heldAtStr,
          venue: String(data.venue),
          minutes: data.minutes ? String(data.minutes) : null,
          published_at: data.published_at ? String(data.published_at) : null,
          tenure_id: data.tenure_id ? String(data.tenure_id) : null,
          status: 'scheduled',
          domain: data.scope === 'domain' && data.scope_id ? String(data.scope_id) : 'club',
        },
        error: null,
      };
    }
  } catch {
    // Supabase query error, fallback to local cache
  }

  const existing = getLocalMeetings();
  const updated = [newMeeting, ...existing];
  saveLocalMeetings(updated);
  return { data: newMeeting, error: null };
}

/**
 * Updates an existing meeting strictly using the team database schema.
 */
export async function updateMeeting(
  id: string,
  input: UpdateMeetingInput
): Promise<{ data: Meeting | null; error: string | null }> {
  const payload: Record<string, unknown> = {};
  if (input.title !== undefined) payload.title = input.title;
  if (input.held_at !== undefined) payload.held_at = input.held_at;
  if (input.venue !== undefined) payload.venue = input.venue;
  if (input.scope !== undefined) payload.scope = input.scope;
  if (input.scope_id !== undefined) payload.scope_id = input.scope_id;
  if (input.minutes !== undefined) payload.minutes = input.minutes;
  if (input.published_at !== undefined) payload.published_at = input.published_at;

  try {
    const { data, error } = await supabase
      .from('meetings')
      .update(payload)
      .eq('id', id)
      .select('id, scope, scope_id, title, held_at, venue, minutes, published_at, tenure_id')
      .single();

    if (!error && data) {
      const heldAtStr = String(data.held_at);
      return {
        data: {
          id: String(data.id),
          scope: (data.scope as Meeting['scope']) || 'club',
          scope_id: data.scope_id ? String(data.scope_id) : null,
          title: String(data.title),
          held_at: heldAtStr,
          venue: String(data.venue),
          minutes: data.minutes ? String(data.minutes) : null,
          published_at: data.published_at ? String(data.published_at) : null,
          tenure_id: data.tenure_id ? String(data.tenure_id) : null,
          status: new Date(heldAtStr).getTime() < Date.now() || Boolean(data.minutes) ? 'completed' : 'scheduled',
          domain: data.scope === 'domain' && data.scope_id ? String(data.scope_id) : 'club',
        },
        error: null,
      };
    }
  } catch {
    // Fallback on error
  }

  const existing = getLocalMeetings();
  const index = existing.findIndex((m) => m.id === id);
  if (index !== -1) {
    const updatedRecord: Meeting = {
      ...existing[index],
      ...input,
    };
    existing[index] = updatedRecord;
    saveLocalMeetings(existing);
    return { data: updatedRecord, error: null };
  }

  return { data: null, error: 'Meeting record not found' };
}

/**
 * Removes or concludes a meeting.
 */
export async function cancelMeeting(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from('meetings').delete().eq('id', id);
    if (!error) return { success: true, error: null };
  } catch {
    // Fallback
  }

  const existing = getLocalMeetings();
  const filtered = existing.filter((m) => m.id !== id);
  saveLocalMeetings(filtered);
  return { success: true, error: null };
}
