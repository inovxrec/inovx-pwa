import { DomainPerformanceCards } from './DomainPerformanceCards';
import { DomainAttendanceBreakdown } from './DomainAttendanceBreakdown';
import { Panel } from '../../../components/Panel';
import type { DomainAttendanceMetric } from '../types';

interface DomainAnalyticsViewProps {
  domains: DomainAttendanceMetric[];
}

export function DomainAnalyticsView({ domains }: DomainAnalyticsViewProps) {
  // Identify top performing domain and domain needing attention
  const sorted = [...domains].sort((a, b) => b.attendanceRate - a.attendanceRate);
  const topDomain = sorted[0];
  const atRiskDomain = sorted.filter((d) => d.healthStatus === 'at_risk')[0];

  return (
    <div className="domain-view-container">
      {/* Domain Insights Callout */}
      {domains.length > 0 && (
        <div className="domain-insights-row">
          {topDomain && (
            <Panel className="domain-insight-card">
              <div className="insight-tag tag-optimal">LEADING DOMAIN QUORUM</div>
              <div className="insight-title">{topDomain.domain.toUpperCase()} DOMAIN</div>
              <div className="insight-desc">
                Achieving <strong>{topDomain.attendanceRate}%</strong> average attendance rate across{' '}
                {topDomain.meetingCount} sessions ({topDomain.attendedRecords} attended roster logs).
              </div>
            </Panel>
          )}

          <Panel className="domain-insight-card">
            <div className={`insight-tag ${atRiskDomain ? 'tag-risk' : 'tag-neutral'}`}>
              {atRiskDomain ? 'INTERVENTION MONITORED' : 'DOMAIN BALANCE STATUS'}
            </div>
            <div className="insight-title">
              {atRiskDomain ? `${atRiskDomain.domain.toUpperCase()} DOMAIN` : 'STABLE PARTICIPATION'}
            </div>
            <div className="insight-desc">
              {atRiskDomain ? (
                <>
                  Attendance is currently at <strong>{atRiskDomain.attendanceRate}%</strong>. Review scheduling
                  cadence or roster size to improve quorum.
                </>
              ) : (
                'All tracked domains are sustaining acceptable attendance rates above the 60% operational threshold.'
              )}
            </div>
          </Panel>
        </div>
      )}

      {/* Domain Performance Cards Grid */}
      <DomainPerformanceCards domains={domains} />

      {/* Domain Breakdown Table */}
      <DomainAttendanceBreakdown domains={domains} />
    </div>
  );
}
