export type MeetingScope = 'club' | 'domain' | 'committee';

export type AttendanceStatus = 'present' | 'absent' | 'excused';

export interface Meeting {
  id: string;
  scope: MeetingScope;
  scope_id?: string | null;
  title: string;
  held_at: string;
  venue: string;
  minutes?: string | null;
  published_at?: string | null;
  tenure_id?: string | null;
  // Derived helper for UI display (scheduled / completed based on held_at & minutes)
  status?: 'scheduled' | 'completed';
  domain?: string | null;
}

export interface Attendance {
  meeting_id: string;
  user_id: string;
  status: AttendanceStatus;
  marked_by?: string | null;
  // UI display joins from users table
  id?: string;
  user_name?: string;
  user_initials?: string;
  role?: string;
  notes?: string | null;
  recorded_at?: string;
}

export interface CreateMeetingInput {
  title: string;
  held_at: string;
  venue: string;
  scope?: MeetingScope;
  scope_id?: string | null;
  minutes?: string;
  tenure_id?: string | null;
}

export interface UpdateMeetingInput {
  title?: string;
  held_at?: string;
  venue?: string;
  scope?: MeetingScope;
  scope_id?: string | null;
  minutes?: string;
  published_at?: string;
}
