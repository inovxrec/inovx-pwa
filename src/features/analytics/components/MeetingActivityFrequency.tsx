import { Panel } from '../../../components/Panel';
import type {
  DomainAttendanceMetric,
  LeadershipOperationalMetrics,
  MeetingStatusDistribution,
} from '../types';

interface MeetingActivityFrequencyProps {
  ops: LeadershipOperationalMetrics;
  distribution: MeetingStatusDistribution;
  domains: DomainAttendanceMetric[];
}

export function MeetingActivityFrequency({
  ops,
  distribution,
  domains,
}: MeetingActivityFrequencyProps) {
  return (
    <Panel className="analytics-panel">
      <div className="analytics-panel-header">
        <div>
          <h3 className="analytics-panel-title">OPERATIONAL ACTIVITY &amp; CADENCE</h3>
          <p className="analytics-panel-subtitle">Meeting frequency and documentation metrics across cycles</p>
        </div>
        <span className="roster-count">{ops.activeDomainsCount} ACTIVE DOMAINS</span>
      </div>

      <div className="activity-metrics-grid">
        <div className="activity-metric-box">
          <div className="activity-metric-label">SESSION CADENCE</div>
          <div className="activity-metric-value">{ops.cadenceWeekly} <span className="unit">/ week</span></div>
          <div className="activity-metric-sub">Average scheduled meetings</div>
        </div>

        <div className="activity-metric-box">
          <div className="activity-metric-label">MINUTES LOGGED (MOM)</div>
          <div className="activity-metric-value" style={{ color: ops.documentationRate >= 75 ? 'var(--st-done)' : 'var(--st-review)' }}>
            {ops.documentationRate}%
          </div>
          <div className="activity-metric-sub">Documented session coverage</div>
        </div>

        <div className="activity-metric-box">
          <div className="activity-metric-label">HIGH-QUORUM SESSIONS</div>
          <div className="activity-metric-value" style={{ color: 'var(--st-done)' }}>
            {ops.highQuorumRate}%
          </div>
          <div className="activity-metric-sub">&gt;= 80% attendance rate</div>
        </div>

        <div className="activity-metric-box">
          <div className="activity-metric-label">AVG ROSTER SIZE</div>
          <div className="activity-metric-value">{ops.averageRosterSize}</div>
          <div className="activity-metric-sub">Members invited per session</div>
        </div>
      </div>

      {/* Domain meeting frequency distribution */}
      <div className="activity-domain-freq">
        <div className="activity-freq-header">
          <span>DOMAIN SESSION FREQUENCY ALLOCATION</span>
          <span>{distribution.total} TOTAL SESSIONS</span>
        </div>

        <div className="activity-freq-list">
          {domains.map((dom) => (
            <div key={dom.domain} className="activity-freq-row">
              <div className="freq-row-info">
                <span className="freq-dom-tag">{dom.domain.toUpperCase()}</span>
                <span className="freq-dom-count">{dom.meetingCount} sessions ({dom.meetingSharePercentage}%)</span>
              </div>
              <div className="freq-bar-track">
                <div
                  className="freq-bar-fill"
                  style={{
                    width: `${Math.max(5, dom.meetingSharePercentage)}%`,
                    backgroundColor:
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
                        : 'var(--chan-core)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}
