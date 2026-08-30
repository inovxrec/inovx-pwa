import { DomainStrip } from '../../components/DomainStrip';
import { Panel } from '../../components/Panel';
import { useTasks } from '../../store/taskStore';
import './OversightDeck.css';

export function OversightDeck() {
  const { domainMetrics, occasions } = useTasks();

  return (
    <div>
      <div className="oversight-header-row">
        <div className="eyebrow">Faculty landing — read only</div>
        <span className="oversight-badge">READ-ONLY AUDIT</span>
      </div>
      <h1 className="st">Oversight Deck</h1>

      <Panel bracket className="oversight-report">
        <div className="eyebrow" style={{ color: 'var(--chan)' }}>&gt; Executive fortnight report</div>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.7 }}>
          Design completed most of its tasks this fortnight, with two overdue. Technical is on pace. Events is
          carrying the most risk, with several overdue items tied to upcoming events.
        </p>
      </Panel>

      <div className="oversight-section">
        <div className="section-label">Per-domain completion</div>
        {domainMetrics.map((m) => (
          <DomainStrip
            key={m.domain}
            domain={m.domain}
            label={m.label}
            completionRate={m.completionRate}
            statusText={`${m.completionRate}%`}
          />
        ))}
      </div>

      <div>
        <div className="section-label">Upcoming milestones</div>
        <div className="oversight-milestones">
          {occasions.map((occ) => (
            <div key={occ.id} className="oversight-milestone-row">
              {occ.avatarText} {occ.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
