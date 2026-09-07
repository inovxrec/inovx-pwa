export interface AttendanceOverviewMetrics {
  totalMeetings: number;
  totalAttendanceRecords: number;
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  overallRate: number;
}

export interface MemberAttendanceMetric {
  userId: string;
  userName: string;
  userInitials: string;
  role?: string;
  totalMeetings: number;
  attendedCount: number;
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  attendanceRate: number;
}

export interface DomainAttendanceMetric {
  domain: string;
  meetingCount: number;
  totalRecords: number;
  attendedRecords: number;
  attendanceRate: number;
  meetingSharePercentage: number;
  healthStatus: 'optimal' | 'moderate' | 'at_risk';
}

export interface MeetingAttendanceStat {
  meetingId: string;
  meetingTitle: string;
  heldAt: string;
  venue: string;
  scope: string;
  scopeId?: string | null;
  status: string;
  totalRoster: number;
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  attendanceRate: number;
  hasMinutes: boolean;
}

export interface MeetingStatusDistribution {
  total: number;
  scheduled: number;
  completed: number;
  completionRate: number;
}

export interface AttendanceTrendPoint {
  id: string;
  title: string;
  date: string;
  dateLabel: string;
  attendanceRate: number;
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  totalRoster: number;
  domain?: string | null;
  status: string;
}

export interface LeadershipOperationalMetrics {
  cadenceWeekly: number;
  documentationRate: number;
  highQuorumRate: number;
  averageRosterSize: number;
  activeDomainsCount: number;
}
