import { useState } from 'react';
import { StatTile } from '../../components/StatTile';
import { DomainStrip } from '../../components/DomainStrip';
import { Pill } from '../../components/Pill';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { useTasks, type Task } from '../../store/taskStore';
import './CommandDeck.css';

export function CommandDeck() {
  const { kpis, domainMetrics, proposedTasks, approveTask, rejectTask } = useTasks();
  const { toast } = useToast();
  const [rejectTarget, setRejectTarget] = useState<Task | null>(null);

  return (
    <div>
      <div className="eyebrow">Admin landing</div>
      <h1 className="st">Command Deck</h1>

      <div className="deck-stats">
        <StatTile value={kpis.openTasks} label="Open tasks" />
        <StatTile value={kpis.overdueTasks} label="Overdue" hot />
        <StatTile value={kpis.awaitingApproval} label="Awaiting approval" />
        <StatTile value={`${kpis.weeklyCompletionRate}%`} label="Completion this week" />
      </div>

      <div className="deck-section">
        <div className="section-label">Domains</div>
        {domainMetrics.map((m) => (
          <DomainStrip
            key={m.domain}
            domain={m.domain}
            label={m.label}
            completionRate={m.completionRate}
            statusText={m.statusText}
            overdueCount={m.overdueCount}
            onClick={() => toast(`VIEWING — ${m.label.toUpperCase()}`)}
          />
        ))}
      </div>

      <div className="deck-section">
        <div className="section-label">Approval queue</div>
        {proposedTasks.length > 0 ? (
          proposedTasks.map((t) => (
            <div key={t.id} className="approval-row">
              <div>
                <div className="task-meta">PROPOSAL · {t.domain.toUpperCase()} · {t.taskNumber}</div>
                <div className="approval-title">{t.title}</div>
                <div className="approval-meta-row">
                  <Pill status="proposed" />
                  <span className="due blocked">{t.dueLabel}</span>
                </div>
              </div>
              <div className="approval-actions">
                <Button
                  variant="primary"
                  onClick={() => {
                    approveTask(t.id);
                    toast(`APPROVED — ${t.title}`);
                  }}
                >
                  Approve
                </Button>
                <Button variant="ghost" onClick={() => setRejectTarget(t)}>Return</Button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty">
            <div className="l1">&gt; APPROVAL QUEUE IS EMPTY</div>
          </div>
        )}
      </div>

      <Modal
        open={Boolean(rejectTarget)}
        title="Return proposal for revision?"
        body={<>This will move &lsquo;{rejectTarget?.title}&rsquo; back to draft state and alert the lead.</>}
        confirmLabel="Return proposal"
        cancelLabel="Keep in queue"
        onConfirm={() => {
          if (!rejectTarget) return;
          rejectTask(rejectTarget.id);
          toast(`RETURNED — ${rejectTarget.title}`);
          setRejectTarget(null);
        }}
        onCancel={() => setRejectTarget(null)}
      />
    </div>
  );
}
