import { Panel } from '../../../components/Panel';
import type { DomainAttendanceMetric } from '../types';

const DOMAIN_LABELS: Record<string, string> = {
  technical: 'Technical',
  design: 'Design',
  management: 'Management',
  events: 'Events',
  media: 'Media',
  core: 'Core Command',
};

export function DomainAttendanceBreakdown({ domains }: { domains: DomainAttendanceMetric[] }) {
  return (
    <Panel className="analytics-panel">
      <div className="analytics-panel-header">
        <div>
          <h3 className="analytics-panel-title">DOMAIN QUORUM BREAKDOWN</h3>
          <p className="analytics-panel-subtitle">Attendance adherence grouped by domain channel</p>
        </div>
      </div>

      {domains.length === 0 ? (
        <div className="analytics-empty-note">No domain telemetry available.</div>
      ) : (
        <div className="domain-breakdown-list">
          {domains.map((d) => {
            const domainColor = `var(--chan-${d.domain}, var(--chan))`;
            const label = DOMAIN_LABELS[d.domain] || d.domain.toUpperCase();

            return (
              <div key={d.domain} className="domain-breakdown-row">
                <div className="domain-row-top">
                  <div className="domain-name-col">
                    <span
                      className="domain-color-dot"
                      style={{ backgroundColor: domainColor, boxShadow: `0 0 6px ${domainColor}` }}
                    />
                    <span className="domain-label-text">{label}</span>
                    <span className="domain-count-tag">
                      {d.meetingCount} {d.meetingCount === 1 ? 'meeting' : 'meetings'}
                    </span>
                  </div>

                  <div className="domain-rate-col">
                    <span className="domain-rate-num">{d.attendanceRate}%</span>
                  </div>
                </div>

                <div className="rate-bar-track">
                  <div
                    className="rate-bar-fill"
                    style={{
                      width: `${d.attendanceRate}%`,
                      backgroundColor: domainColor,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
