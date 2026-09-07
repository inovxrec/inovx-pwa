import type { MemberAttendanceMetric, DomainAttendanceMetric } from '../types';
import type { Meeting } from '../../meetings/types';

function triggerCsvDownload(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Exports Member Quorum Roster metrics to a CSV file.
 */
export function exportAttendanceRosterCsv(members: MemberAttendanceMetric[]) {
  const headers = ['Operator ID', 'Name', 'Initials', 'Role', 'Total Sessions', 'Attended', 'Present', 'Absent', 'Excused', 'Attendance Rate %'];
  const rows = members.map((m) => [
    escapeCsvCell(m.userId),
    escapeCsvCell(m.userName),
    escapeCsvCell(m.userInitials),
    escapeCsvCell(m.role || 'Member'),
    m.totalMeetings,
    m.attendedCount,
    m.presentCount,
    m.absentCount,
    m.excusedCount,
    `${m.attendanceRate}%`,
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const dateStr = new Date().toISOString().split('T')[0];
  triggerCsvDownload(csv, `inovx_quorum_roster_${dateStr}.csv`);
}

/**
 * Exports Meeting Sessions log to a CSV file strictly matching the team schema.
 */
export function exportMeetingsCsv(meetings: Meeting[]) {
  const headers = ['Meeting ID', 'Title', 'Held At', 'Venue', 'Scope', 'Scope ID', 'Minutes Published', 'Tenure ID'];
  const rows = meetings.map((m) => [
    escapeCsvCell(m.id),
    escapeCsvCell(m.title),
    escapeCsvCell(m.held_at),
    escapeCsvCell(m.venue),
    escapeCsvCell(m.scope),
    escapeCsvCell(m.scope_id || ''),
    escapeCsvCell(m.minutes ? 'YES' : 'NO'),
    escapeCsvCell(m.tenure_id || ''),
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const dateStr = new Date().toISOString().split('T')[0];
  triggerCsvDownload(csv, `inovx_meeting_sessions_${dateStr}.csv`);
}

/**
 * Exports Domain Performance telemetry to a CSV file.
 */
export function exportDomainMetricsCsv(domains: DomainAttendanceMetric[]) {
  const headers = ['Domain', 'Total Meetings', 'Total Records', 'Attended Records', 'Attendance Rate %', 'Meeting Share %', 'Health Status'];
  const rows = domains.map((d) => [
    escapeCsvCell(d.domain),
    d.meetingCount,
    d.totalRecords,
    d.attendedRecords,
    `${d.attendanceRate}%`,
    `${d.meetingSharePercentage}%`,
    escapeCsvCell(d.healthStatus.toUpperCase()),
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const dateStr = new Date().toISOString().split('T')[0];
  triggerCsvDownload(csv, `inovx_domain_metrics_${dateStr}.csv`);
}
