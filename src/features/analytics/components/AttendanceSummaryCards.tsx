import { StatTile } from '../../../components/StatTile';
import type { AttendanceOverviewMetrics } from '../types';

export function AttendanceSummaryCards({ overview }: { overview: AttendanceOverviewMetrics }) {
  return (
    <div className="analytics-stats-grid">
      <StatTile value={overview.totalMeetings} label="Total Sessions" />
      <StatTile value={`${overview.overallRate}%`} label="Overall Quorum Rate" />
      <StatTile value={overview.presentCount} label="Present Records" />
      <StatTile value={overview.excusedCount} label="Excused Records" />
      <StatTile
        value={overview.absentCount}
        label="Absent Records"
        hot={overview.absentCount > 0}
      />
      <StatTile value={overview.totalAttendanceRecords} label="Total Roster Entries" />
    </div>
  );
}
