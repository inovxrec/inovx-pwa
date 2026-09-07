import { StatTile } from '../../../components/StatTile';
import type {
  AttendanceOverviewMetrics,
  LeadershipOperationalMetrics,
  MeetingStatusDistribution,
} from '../types';

interface LeadershipKpiSummaryProps {
  overview: AttendanceOverviewMetrics;
  ops: LeadershipOperationalMetrics;
  distribution: MeetingStatusDistribution;
}

export function LeadershipKpiSummary({
  overview,
  ops,
  distribution,
}: LeadershipKpiSummaryProps) {
  return (
    <div className="analytics-stats-grid">
      <StatTile value={`${overview.overallRate}%`} label="Overall Quorum Rate" />
      <StatTile value={`${distribution.completionRate}%`} label="Session Completion" />
      <StatTile value={`${ops.documentationRate}%`} label="Minutes Logged (MOM)" />
      <StatTile value={`${ops.cadenceWeekly}/wk`} label="Operational Cadence" />
      <StatTile value={ops.averageRosterSize} label="Avg. Roster Size" />
      <StatTile
        value={`${ops.highQuorumRate}%`}
        label="High Quorum Rate (≥80%)"
      />
    </div>
  );
}
