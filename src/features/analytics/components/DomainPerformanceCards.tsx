import { Panel } from '../../../components/Panel';
import type { DomainAttendanceMetric } from '../types';

interface DomainPerformanceCardsProps {
  domains: DomainAttendanceMetric[];
}

export function DomainPerformanceCards({ domains }: DomainPerformanceCardsProps) {
  if (!domains || domains.length === 0) {
    return (
      <Panel className="analytics-panel">
        <div className="analytics-panel-header">
          <div>
            <h3 className="analytics-panel-title">DOMAIN PERFORMANCE MATRIX</h3>
            <p className="analytics-panel-subtitle">Attendance and operational metrics grouped by organizational domain</p>
          </div>
        </div>
        <div className="analytics-empty-state">
          No domain session data recorded yet.
        </div>
      </Panel>
    );
  }

  return (
    <div className="domain-performance-section">
      <div className="domain-cards-grid">
        {domains.map((dom) => {
          const isOptimal = dom.healthStatus === 'optimal';
          const isModerate = dom.healthStatus === 'moderate';

          const statusClass = isOptimal
            ? 'health-optimal'
            : isModerate
            ? 'health-moderate'
            : 'health-risk';

          const statusText = isOptimal
            ? 'OPTIMAL QUORUM'
            : isModerate
            ? 'MODERATE QUORUM'
            : 'AT RISK';

          const domainAccent =
            dom.domain === 'technical'
              ? 'var(--chan-technical)'
              : dom.domain === 'design'
              ? 'var(--chan-design)'
              : dom.domain === 'events'
              ? 'var(--chan-events)'
              : dom.domain === 'management'
              ? 'var(--chan-management)'
              : dom.domain === 'media'
              ? 'var(--chan-media)'
              : 'var(--chan-core)';

          return (
            <Panel key={dom.domain} className="domain-card-panel">
              <div className="domain-card-header">
                <div className="domain-card-identity">
                  <span
                    className="domain-color-indicator"
                    style={{ backgroundColor: domainAccent }}
                  />
                  <div>
                    <h4 className="domain-card-name">{dom.domain.toUpperCase()} DOMAIN</h4>
                    <span className="domain-card-share">{dom.meetingSharePercentage}% of total meetings</span>
                  </div>
                </div>

                <span className={`domain-health-badge ${statusClass}`}>
                  {statusText}
                </span>
              </div>

              {/* Central Attendance Rate Meter */}
              <div className="domain-rate-display">
                <div className="domain-rate-large" style={{ color: domainAccent }}>
                  {dom.attendanceRate}%
                </div>
                <div className="domain-rate-label">AVERAGE QUORUM RATE</div>
              </div>

              <div className="domain-meter-track">
                <div
                  className="domain-meter-fill"
                  style={{
                    width: `${Math.min(100, Math.max(5, dom.attendanceRate))}%`,
                    backgroundColor: domainAccent,
                  }}
                />
              </div>

              {/* Sub metrics stats */}
              <div className="domain-card-metrics">
                <div className="domain-sub-metric">
                  <span className="d-label">Sessions Held</span>
                  <span className="d-value">{dom.meetingCount}</span>
                </div>
                <div className="domain-sub-metric">
                  <span className="d-label">Total Roster</span>
                  <span className="d-value">{dom.totalRecords}</span>
                </div>
                <div className="domain-sub-metric">
                  <span className="d-label">Attended</span>
                  <span className="d-value">{dom.attendedRecords}</span>
                </div>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
