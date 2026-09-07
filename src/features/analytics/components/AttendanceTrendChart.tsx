import { Panel } from '../../../components/Panel';
import type { AttendanceTrendPoint } from '../types';

interface AttendanceTrendChartProps {
  trend: AttendanceTrendPoint[];
}

export function AttendanceTrendChart({ trend }: AttendanceTrendChartProps) {
  if (!trend || trend.length === 0) {
    return (
      <Panel className="analytics-panel">
        <div className="analytics-panel-header">
          <div>
            <h3 className="analytics-panel-title">CHRONOLOGICAL QUORUM TREND</h3>
            <p className="analytics-panel-subtitle">Session attendance trajectory over time</p>
          </div>
        </div>
        <div className="analytics-empty-state">
          No historical meeting sessions recorded yet for trend analysis.
        </div>
      </Panel>
    );
  }

  // Calculate high, low, average rates
  const rates = trend.map((t) => t.attendanceRate);
  const highest = Math.max(...rates);
  const lowest = Math.min(...rates);
  const avg = Math.round(rates.reduce((sum, r) => sum + r, 0) / rates.length);

  return (
    <Panel className="analytics-panel">
      <div className="analytics-panel-header">
        <div>
          <h3 className="analytics-panel-title">CHRONOLOGICAL QUORUM TREND</h3>
          <p className="analytics-panel-subtitle">Session attendance trajectory across recorded dates</p>
        </div>
        <div className="trend-stat-pills">
          <span className="trend-stat-item">AVG: <strong>{avg}%</strong></span>
          <span className="trend-stat-item">PEAK: <strong style={{ color: 'var(--st-done)' }}>{highest}%</strong></span>
          <span className="trend-stat-item">LOW: <strong style={{ color: lowest < 60 ? 'var(--st-blocked)' : 'var(--ink)' }}>{lowest}%</strong></span>
        </div>
      </div>

      <div className="trend-chart-container">
        {/* 80% benchmark reference guide line */}
        <div className="trend-benchmark-line" title="Target Quorum Benchmark (80%)">
          <span className="trend-benchmark-label">80% TARGET QUORUM</span>
        </div>

        {/* Bar / Point timeline */}
        <div className="trend-bars-wrapper">
          {trend.map((pt) => {
            const isHigh = pt.attendanceRate >= 80;
            const isMid = pt.attendanceRate >= 60 && pt.attendanceRate < 80;
            const barColor = isHigh
              ? 'var(--st-done)'
              : isMid
              ? 'var(--st-review)'
              : 'var(--st-blocked)';

            const domainLabel = (pt.domain || 'technical').toUpperCase();

            return (
              <div key={pt.id} className="trend-column" title={`${pt.title} (${pt.dateLabel}): ${pt.attendanceRate}% quorum`}>
                <div className="trend-rate-badge" style={{ color: barColor }}>
                  {pt.attendanceRate}%
                </div>

                <div className="trend-bar-track">
                  <div
                    className="trend-bar-fill"
                    style={{
                      height: `${Math.max(12, pt.attendanceRate)}%`,
                      backgroundColor: barColor,
                    }}
                  />
                </div>

                <div className="trend-date-label">{pt.dateLabel}</div>
                <div className="trend-domain-label">{domainLabel.slice(0, 4)}</div>

                {/* Tooltip on hover */}
                <div className="trend-tooltip">
                  <div className="trend-tooltip-title">{pt.title}</div>
                  <div className="trend-tooltip-meta">
                    {pt.dateLabel} · {domainLabel} · {pt.status.toUpperCase()}
                  </div>
                  <div className="trend-tooltip-grid">
                    <span>Present: {pt.presentCount}</span>
                    <span>Excused: {pt.excusedCount}</span>
                    <span>Absent: {pt.absentCount}</span>
                    <span>Roster: {pt.totalRoster}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}
