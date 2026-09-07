import { Panel } from '../../../components/Panel';
import type { MeetingStatusDistribution as DistributionType } from '../types';

export function MeetingStatusDistribution({
  distribution,
}: {
  distribution: DistributionType;
}) {
  const total = distribution.total || 1;
  const pctScheduled = Math.round((distribution.scheduled / total) * 100);
  const pctCompleted = Math.round((distribution.completed / total) * 100);

  return (
    <Panel className="analytics-panel">
      <div className="analytics-panel-header">
        <div>
          <h3 className="analytics-panel-title">MEETING STATUS DISTRIBUTION</h3>
          <p className="analytics-panel-subtitle">Lifecycle state breakdown of all station sessions</p>
        </div>
        <span className="roster-count">{distribution.total} TOTAL SESSIONS</span>
      </div>

      {/* Multi-segment visual status bar */}
      <div className="status-dist-track" title="Meeting lifecycle proportion">
        {distribution.completed > 0 && (
          <div
            className="status-dist-seg seg-completed"
            style={{ width: `${pctCompleted}%` }}
            title={`Completed: ${distribution.completed} (${pctCompleted}%)`}
          />
        )}
        {distribution.scheduled > 0 && (
          <div
            className="status-dist-seg seg-scheduled"
            style={{ width: `${pctScheduled}%` }}
            title={`Scheduled: ${distribution.scheduled} (${pctScheduled}%)`}
          />
        )}
      </div>

      {/* Breakdown summary pills */}
      <div className="status-dist-legend">
        <div className="legend-item">
          <span className="legend-dot dot-completed" />
          <span className="legend-label">Completed:</span>
          <span className="legend-val">{distribution.completed} ({pctCompleted}%)</span>
        </div>

        <div className="legend-item">
          <span className="legend-dot dot-scheduled" />
          <span className="legend-label">Scheduled:</span>
          <span className="legend-val">{distribution.scheduled} ({pctScheduled}%)</span>
        </div>

        <div className="legend-item">
          <span className="legend-dot dot-rate" />
          <span className="legend-label">Completion Rate:</span>
          <span className="legend-val">{distribution.completionRate}%</span>
        </div>
      </div>
    </Panel>
  );
}
