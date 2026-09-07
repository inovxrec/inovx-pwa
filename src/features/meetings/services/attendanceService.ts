import { supabase } from '../../../lib/supabase';
import type { Attendance, AttendanceStatus } from '../types';

const TEAM_ROSTER = [
  { id: 'usr-1', name: 'Riya S.', initials: 'RS', role: 'admin', defaultStatus: 'present' as AttendanceStatus },
  { id: 'usr-2', name: 'Ananya R.', initials: 'AR', role: 'member', defaultStatus: 'present' as AttendanceStatus },
  { id: 'usr-3', name: 'Dr. Nair', initials: 'DN', role: 'faculty', defaultStatus: 'present' as AttendanceStatus },
  { id: 'usr-4', name: 'Akash D.', initials: 'AD', role: 'member', defaultStatus: 'present' as AttendanceStatus },
  { id: 'usr-5', name: 'Bhuvaneshwaran', initials: 'BH', role: 'member', defaultStatus: 'present' as AttendanceStatus },
  { id: 'usr-6', name: 'Laxmi Gayathri', initials: 'LG', role: 'member', defaultStatus: 'excused' as AttendanceStatus },
  { id: 'usr-7', name: 'Varun M.', initials: 'VM', role: 'member', defaultStatus: 'absent' as AttendanceStatus },
];

const LOCAL_ATTENDANCE_KEY = 'inovx84_attendance_cache';

function getLocalAttendanceMap(): Record<string, Attendance[]> {
  try {
    const raw = localStorage.getItem(LOCAL_ATTENDANCE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore error
  }
  return {};
}

function saveLocalAttendanceMap(map: Record<string, Attendance[]>): void {
  try {
    localStorage.setItem(LOCAL_ATTENDANCE_KEY, JSON.stringify(map));
  } catch {
    // Ignore error
  }
}

function generateDefaultRoster(meetingId: string): Attendance[] {
  return TEAM_ROSTER.map((member, index) => ({
    id: `att-${meetingId}-${member.id}`,
    meeting_id: meetingId,
    user_id: member.id,
    user_name: member.name,
    user_initials: member.initials,
    role: member.role,
    status: index === 0 ? 'present' : member.defaultStatus,
    marked_by: null,
    notes: null,
    recorded_at: new Date().toISOString(),
  }));
}

/**
 * Gets attendance roster for a specific meeting strictly conforming to team schema:
 * (meeting_id, user_id, status, marked_by)
 */
export async function getMeetingAttendance(
  meetingId: string
): Promise<{ data: Attendance[]; error: string | null; isPendingMigration?: boolean }> {
  try {
    const { data, error } = await supabase
      .from('attendance')
      .select('meeting_id, user_id, status, marked_by')
      .eq('meeting_id', meetingId);

    if (error) {
      const isMissingTable =
        error.message?.includes('Could not find the table') ||
        error.code === 'PGRST205' ||
        error.code === '42P01';

      if (isMissingTable) {
        const map = getLocalAttendanceMap();
        if (!map[meetingId]) {
          map[meetingId] = generateDefaultRoster(meetingId);
          saveLocalAttendanceMap(map);
        }
        return { data: map[meetingId], error: null, isPendingMigration: true };
      }

      return { data: [], error: error.message };
    }

    if (data && data.length > 0) {
      const formatted: Attendance[] = data.map((row: Record<string, unknown>) => {
        const foundUser = TEAM_ROSTER.find((u) => u.id === String(row.user_id));
        const rawStatus = String(row.status || 'present');
        // Team schema only allows present, absent, excused
        const safeStatus: AttendanceStatus =
          rawStatus === 'excused' ? 'excused' : rawStatus === 'absent' ? 'absent' : 'present';

        return {
          id: `att-${row.meeting_id}-${row.user_id}`,
          meeting_id: String(row.meeting_id),
          user_id: String(row.user_id),
          user_name: foundUser?.name || 'Station Member',
          user_initials: foundUser?.initials || 'OP',
          role: foundUser?.role || 'member',
          status: safeStatus,
          marked_by: row.marked_by ? String(row.marked_by) : null,
        };
      });
      return { data: formatted, error: null };
    }

    // Default fallback roster if table exists but meeting has no rows yet
    const map = getLocalAttendanceMap();
    if (!map[meetingId]) {
      map[meetingId] = generateDefaultRoster(meetingId);
      saveLocalAttendanceMap(map);
    }
    return { data: map[meetingId], error: null };
  } catch (err: unknown) {
    const map = getLocalAttendanceMap();
    if (!map[meetingId]) {
      map[meetingId] = generateDefaultRoster(meetingId);
      saveLocalAttendanceMap(map);
    }
    const message = err instanceof Error ? err.message : 'Error retrieving attendance';
    return { data: map[meetingId], error: message, isPendingMigration: true };
  }
}

/**
 * Marks attendance conforming to team schema (meeting_id, user_id, status, marked_by).
 */
export async function markAttendance(
  meetingId: string,
  userId: string,
  status: AttendanceStatus,
  markedBy?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from('attendance').upsert(
      {
        meeting_id: meetingId,
        user_id: userId,
        status,
        marked_by: markedBy || null,
      },
      { onConflict: 'meeting_id,user_id' }
    );

    if (!error) return { success: true, error: null };
  } catch {
    // Fallback on error
  }

  // Fallback in local store
  const map = getLocalAttendanceMap();
  if (!map[meetingId]) {
    map[meetingId] = generateDefaultRoster(meetingId);
  }
  const attendee = map[meetingId].find((a) => a.user_id === userId);
  if (attendee) {
    attendee.status = status;
    attendee.marked_by = markedBy || null;
    saveLocalAttendanceMap(map);
    return { success: true, error: null };
  }

  return { success: false, error: 'Attendee not found' };
}

/**
 * Batch marks attendance for all meeting attendees.
 */
export async function batchUpdateAttendance(
  meetingId: string,
  updates: Array<{ user_id: string; status: AttendanceStatus }>,
  markedBy?: string
): Promise<{ success: boolean; error: string | null }> {
  const map = getLocalAttendanceMap();
  if (!map[meetingId]) {
    map[meetingId] = generateDefaultRoster(meetingId);
  }

  for (const item of updates) {
    const record = map[meetingId].find((a) => a.user_id === item.user_id);
    if (record) {
      record.status = item.status;
      record.marked_by = markedBy || null;
    }
  }
  saveLocalAttendanceMap(map);

  try {
    const payload = updates.map((u) => ({
      meeting_id: meetingId,
      user_id: u.user_id,
      status: u.status,
      marked_by: markedBy || null,
    }));
    await supabase.from('attendance').upsert(payload, { onConflict: 'meeting_id,user_id' });
  } catch {
    // Fallback succeeded
  }

  return { success: true, error: null };
}
