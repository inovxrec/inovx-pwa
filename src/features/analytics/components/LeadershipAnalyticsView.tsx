import { LeadershipKpiSummary } from './LeadershipKpiSummary';
import { MeetingStatusDistribution } from './MeetingStatusDistribution';
import { AttendanceTrendChart } from './AttendanceTrendChart';
import { MeetingActivityFrequency } from './MeetingActivityFrequency';
import type { AttendanceAnalyticsResult } from '../services/attendanceAnalyticsService';

interface LeadershipAnalyticsViewProps {
  data: AttendanceAnalyticsResult;
}

export function LeadershipAnalyticsView({ data }: LeadershipAnalyticsViewProps) {
  const { overview, leadershipOps, statusDistribution, attendanceTrend, domainMetrics } = data;

  return (
    <div className="leadership-view-container">
      {/* High-level KPI Summary */}
      <LeadershipKpiSummary
        overview={overview}
        ops={leadershipOps}
        distribution={statusDistribution}
      />

      {/* Grid: Status Distribution + Operational Activity & Cadence */}
      <div className="analytics-layout-grid">
        <MeetingStatusDistribution distribution={statusDistribution} />
        <MeetingActivityFrequency
          ops={leadershipOps}
          distribution={statusDistribution}
          domains={domainMetrics}
        />
      </div>

      {/* Chronological Quorum Trendline */}
      <AttendanceTrendChart trend={attendanceTrend} />
    </div>
  );
}
