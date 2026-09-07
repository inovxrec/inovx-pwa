import { getMeetings } from '../../meetings/services/meetingService';
import { getMeetingAttendance } from '../../meetings/services/attendanceService';
import type {
  AttendanceOverviewMetrics,
  AttendanceTrendPoint,
  DomainAttendanceMetric,
  LeadershipOperationalMetrics,
  MeetingAttendanceStat,
  MeetingStatusDistribution,
  MemberAttendanceMetric,
} from '../types';

export interface AttendanceAnalyticsResult {
  overview: AttendanceOverviewMetrics;
  memberMetrics: MemberAttendanceMetric[];
  domainMetrics: DomainAttendanceMetric[];
  meetingStats: MeetingAttendanceStat[];
  statusDistribution: MeetingStatusDistribution;
  attendanceTrend: AttendanceTrendPoint[];
  leadershipOps: LeadershipOperationalMetrics;
  isPendingMigration: boolean;
  error: string | null;
}

/**
 * Derives comprehensive leadership and domain analytics conforming to the team database contract:
 * - Attendance status is strictly: present, absent, excused (No Late status)
 * - Meetings use: held_at, scope, scope_id, minutes
 */
export async function getAttendanceAnalytics(): Promise<AttendanceAnalyticsResult> {
  try {
    const meetingsRes = await getMeetings();
    const meetings = meetingsRes.data;

    let isPendingMigration = Boolean(meetingsRes.isPendingMigration);
    let totalAttendanceRecords = 0;
    let presentCount = 0;
    let absentCount = 0;
    let excusedCount = 0;

    let scheduledCount = 0;
    let completedCount = 0;
    let meetingsWithMinutes = 0;

    const memberMap: Record<
      string,
      {
        userId: string;
        userName: string;
        userInitials: string;
        role?: string;
        totalMeetings: number;
        presentCount: number;
        absentCount: number;
        excusedCount: number;
      }
    > = {};

    const domainMap: Record<
      string,
      {
        domain: string;
        meetingCount: number;
        totalRecords: number;
        attendedRecords: number;
      }
    > = {};

    const meetingStats: MeetingAttendanceStat[] = [];
    const trendPoints: AttendanceTrendPoint[] = [];

    // Chronologically sorted meetings by held_at
    const chronologicalMeetings = [...meetings].sort(
      (a, b) => new Date(a.held_at).getTime() - new Date(b.held_at).getTime()
    );

    const now = Date.now();

    for (const meeting of chronologicalMeetings) {
      const isConcluded =
        new Date(meeting.held_at).getTime() < now || Boolean(meeting.minutes);

      if (isConcluded) completedCount += 1;
      else scheduledCount += 1;

      const hasMOM = Boolean(meeting.minutes && meeting.minutes.trim().length > 0);
      if (hasMOM) meetingsWithMinutes += 1;

      const attRes = await getMeetingAttendance(meeting.id);
      if (attRes.isPendingMigration) {
        isPendingMigration = true;
      }
      const records = attRes.data;

      let mPresent = 0;
      let mAbsent = 0;
      let mExcused = 0;

      for (const rec of records) {
        totalAttendanceRecords += 1;

        if (rec.status === 'present') {
          presentCount += 1;
          mPresent += 1;
        } else if (rec.status === 'absent') {
          absentCount += 1;
          mAbsent += 1;
        } else if (rec.status === 'excused') {
          excusedCount += 1;
          mExcused += 1;
        }

        // Aggregate per member
        if (!memberMap[rec.user_id]) {
          memberMap[rec.user_id] = {
            userId: rec.user_id,
            userName: rec.user_name || 'Member',
            userInitials: rec.user_initials || 'OP',
            role: rec.role,
            totalMeetings: 0,
            presentCount: 0,
            absentCount: 0,
            excusedCount: 0,
          };
        }

        const mem = memberMap[rec.user_id];
        mem.totalMeetings += 1;
        if (rec.status === 'present') mem.presentCount += 1;
        else if (rec.status === 'absent') mem.absentCount += 1;
        else if (rec.status === 'excused') mem.excusedCount += 1;
      }

      // Aggregate by domain / scope
      const domKey = meeting.scope === 'domain' && meeting.scope_id
        ? meeting.scope_id
        : 'club';

      if (!domainMap[domKey]) {
        domainMap[domKey] = {
          domain: domKey,
          meetingCount: 0,
          totalRecords: 0,
          attendedRecords: 0,
        };
      }
      domainMap[domKey].meetingCount += 1;
      domainMap[domKey].totalRecords += records.length;
      domainMap[domKey].attendedRecords += mPresent;

      // Calculate meeting attendance rate (present / roster)
      const mRate =
        records.length > 0 ? Math.round((mPresent / records.length) * 100) : 0;

      meetingStats.push({
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        heldAt: meeting.held_at,
        venue: meeting.venue,
        scope: meeting.scope,
        scopeId: meeting.scope_id,
        status: isConcluded ? 'completed' : 'scheduled',
        totalRoster: records.length,
        presentCount: mPresent,
        absentCount: mAbsent,
        excusedCount: mExcused,
        attendanceRate: mRate,
        hasMinutes: hasMOM,
      });

      const d = new Date(meeting.held_at);
      trendPoints.push({
        id: meeting.id,
        title: meeting.title,
        date: meeting.held_at,
        dateLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        attendanceRate: mRate,
        presentCount: mPresent,
        absentCount: mAbsent,
        excusedCount: mExcused,
        totalRoster: records.length,
        domain: domKey,
        status: isConcluded ? 'completed' : 'scheduled',
      });
    }

    const overallRate =
      totalAttendanceRecords > 0
        ? Math.round((presentCount / totalAttendanceRecords) * 100)
        : 0;

    const overview: AttendanceOverviewMetrics = {
      totalMeetings: meetings.length,
      totalAttendanceRecords,
      presentCount,
      absentCount,
      excusedCount,
      overallRate,
    };

    // Meeting Status Distribution
    const statusDistribution: MeetingStatusDistribution = {
      total: meetings.length,
      scheduled: scheduledCount,
      completed: completedCount,
      completionRate:
        meetings.length > 0 ? Math.round((completedCount / meetings.length) * 100) : 0,
    };

    // Member attendance metrics sorted descending by attendance percentage
    const memberMetrics: MemberAttendanceMetric[] = Object.values(memberMap)
      .map((m) => {
        const attended = m.presentCount;
        const rate =
          m.totalMeetings > 0 ? Math.round((attended / m.totalMeetings) * 100) : 0;
        return {
          userId: m.userId,
          userName: m.userName,
          userInitials: m.userInitials,
          role: m.role,
          totalMeetings: m.totalMeetings,
          attendedCount: attended,
          presentCount: m.presentCount,
          absentCount: m.absentCount,
          excusedCount: m.excusedCount,
          attendanceRate: rate,
        };
      })
      .sort((a, b) => b.attendanceRate - a.attendanceRate || b.attendedCount - a.attendedCount);

    // Domain metrics with share percentage and health status
    const domainMetrics: DomainAttendanceMetric[] = Object.values(domainMap).map((d) => {
      const rate =
        d.totalRecords > 0 ? Math.round((d.attendedRecords / d.totalRecords) * 100) : 0;
      const share =
        meetings.length > 0 ? Math.round((d.meetingCount / meetings.length) * 100) : 0;
      const health: DomainAttendanceMetric['healthStatus'] =
        rate >= 80 ? 'optimal' : rate >= 60 ? 'moderate' : 'at_risk';

      return {
        domain: d.domain,
        meetingCount: d.meetingCount,
        totalRecords: d.totalRecords,
        attendedRecords: d.attendedRecords,
        attendanceRate: rate,
        meetingSharePercentage: share,
        healthStatus: health,
      };
    });

    // Operational metrics for Leadership
    const highQuorumCount = meetingStats.filter((m) => m.attendanceRate >= 80).length;
    const leadershipOps: LeadershipOperationalMetrics = {
      cadenceWeekly: Math.max(1, Math.round((meetings.length / 2) * 10) / 10),
      documentationRate:
        meetings.length > 0 ? Math.round((meetingsWithMinutes / meetings.length) * 100) : 0,
      highQuorumRate:
        meetingStats.length > 0 ? Math.round((highQuorumCount / meetingStats.length) * 100) : 0,
      averageRosterSize:
        meetings.length > 0 ? Math.round((totalAttendanceRecords / meetings.length) * 10) / 10 : 0,
      activeDomainsCount: Object.keys(domainMap).length,
    };

    return {
      overview,
      memberMetrics,
      domainMetrics,
      meetingStats,
      statusDistribution,
      attendanceTrend: trendPoints,
      leadershipOps,
      isPendingMigration,
      error: null,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error deriving attendance analytics';
    return {
      overview: {
        totalMeetings: 0,
        totalAttendanceRecords: 0,
        presentCount: 0,
        absentCount: 0,
        excusedCount: 0,
        overallRate: 0,
      },
      memberMetrics: [],
      domainMetrics: [],
      meetingStats: [],
      statusDistribution: {
        total: 0,
        scheduled: 0,
        completed: 0,
        completionRate: 0,
      },
      attendanceTrend: [],
      leadershipOps: {
        cadenceWeekly: 0,
        documentationRate: 0,
        highQuorumRate: 0,
        averageRosterSize: 0,
        activeDomainsCount: 0,
      },
      isPendingMigration: true,
      error: msg,
    };
  }
}
