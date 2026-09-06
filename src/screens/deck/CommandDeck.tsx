import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasks } from '../../store/taskStore';
import { useIsDesktop } from '../../hooks/useBreakpoint';
import { useToast } from '../../hooks/useToast';
import { useOpenTask } from '../../hooks/useOpenTask';
import { usePermissionCheck } from '../../hooks/usePermission';
import {
  COMMITTEES, OVERDUE_THRESHOLD, STAT_TRENDS, UPCOMING, attentionItems, deckStats,
  domainRollups,
} from '../../lib/analytics';
import { OCCASIONS } from '../../lib/mockTasks';
import { STATE_LABELS, daysUntil, type Task } from '../../lib/tasks';
import { Button } from '../../ui/primitives/Button';
import { Chip } from '../../ui/primitives/Chip';
import { Tag } from '../../ui/primitives/Tag';
import { Avatar } from '../../ui/primitives/Avatar';
import { Card, EmptyState, StatCard, DomainStrip, TaskCard } from '../../ui/patterns';
import { Sheet } from '../../ui/patterns/Sheet';
import { StickerCoffee } from '../../ui/stickers';
import './CommandDeck.css';

/** Past this many days waiting, the approval chip turns blocked (§9.5.3). */
const STALE_DAYS = 3;

/**
 * §9.5 — the admin and super-admin landing screen.
 *
 * Mobile is a single column; desktop is a stat row across the top and then an
 * 8/4 split with the domain strips left and the approval queue right.
 */
export function CommandDeck() {
  const { tasks, setState } = useTasks();
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();
  const openTask = useOpenTask();
  const toast = useToast();
  const can = usePermissionCheck();

  /** The mobile approval row opens a sheet with the same two actions (§9.5.3). */
  const [sheetTask, setSheetTask] = useState<Task | null>(null);

  const stats = useMemo(() => deckStats(tasks), [tasks]);
  const rollups = useMemo(() => domainRollups(tasks), [tasks]);
  const attention = useMemo(() => attentionItems(tasks), [tasks]);

  const queue = useMemo(
    () =>
      tasks
        .filter((task) => task.state === 'review')
        // Oldest first — the thing that has waited longest is the thing to do.
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [tasks],
  );

  function decide(task: Task, approve: boolean) {
    const undo = setState(task.id, approve ? 'done' : 'progress');
    setSheetTask(null);
    toast.show(
      approve
        ? `${task.number} approved`
        : `${task.number} sent back to ${STATE_LABELS.progress}`,
      { tone: 'success', action: { label: 'Undo', onAction: undo } },
    );
  }

  const statRow = (
    <div className="deck__stats">
      <StatCard value={stats.open} caption="Open" trend={STAT_TRENDS.open} />
      <StatCard
        value={stats.overdue}
        caption="Overdue"
        trend={STAT_TRENDS.overdue}
        atRisk={stats.overdue > OVERDUE_THRESHOLD}
      />
      <StatCard
        value={stats.awaitingApproval}
        caption="Awaiting approval"
        trend={STAT_TRENDS.awaitingApproval}
      />
      <StatCard
        value={stats.doneThisWeek}
        caption="Done this week"
        trend={STAT_TRENDS.doneThisWeek}
      />
    </div>
  );

  const strips = (
    <Card title="Domains">
      <div className="deck__strips">
        {rollups.map((rollup) => (
          <DomainStrip
            key={rollup.domain}
            rollup={rollup}
            onOpen={() => navigate(`/board/${rollup.domain}`)}
          />
        ))}
      </div>
    </Card>
  );

  const approvals = (
    <Card
      title="Approval queue"
      aside={queue.length > 0 && <Tag state="review">{queue.length}</Tag>}
    >
      {queue.length === 0 ? (
        <EmptyState
          sticker={<StickerCoffee size="empty" />}
          title="Nothing to approve"
          line="the queue is clear — go and make something"
        />
      ) : (
        <ul className="deck__queue" role="list">
          {queue.map((task) => {
            const waiting = Math.max(1, -daysUntil(task.createdAt));

            return (
              <li className="deck__queue-row" key={task.id}>
                <TaskCard
                  task={task}
                  variant="compact"
                  onOpen={openTask}
                  className="deck__queue-card"
                />

                <span
                  className={`deck__waiting micro${waiting > STALE_DAYS ? ' deck__waiting--stale' : ''}`}
                >
                  waiting {waiting}d
                </span>

                {/*
                  Inline on desktop, a sheet on mobile — both offer the same two
                  actions, which §8 requires of every fork.
                */}
                {isDesktop ? (
                  <span className="deck__decide">
                    <Button variant="solid" size="sm" onClick={() => decide(task, true)}>
                      Approve
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => decide(task, false)}>
                      Changes
                    </Button>
                  </span>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setSheetTask(task)}>
                    Review
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );

  const attentionCard = (
    <Card surface="mint" title="Needs attention" aside={<Tag state="blocked">{attention.length}</Tag>}>
      {attention.length === 0 ? (
        <p className="body-sm deck__none">Nothing is stuck.</p>
      ) : (
        <ul className="deck__attention" role="list">
          {attention.map((item) => (
            <li className="deck__attention-row" key={item.id}>
              <Chip variant="static">{item.tag}</Chip>
              <span className="body-sm deck__attention-line">{item.line}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => item.to && navigate(item.to)}
                disabled={!item.to}
              >
                {item.action}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );

  const committees = (
    <Card title="Committees">
      <ul className="deck__list" role="list">
        {COMMITTEES.map((committee) => (
          <li className="deck__list-row" key={committee.id}>
            <span className="body-sm deck__list-name">{committee.name}</span>
            <span className="micro deck__list-meta tnum">
              {committee.members} members · {committee.open} open
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );

  const occasions = (
    <Card surface="mint" title="Occasions">
      <ul className="deck__list" role="list">
        {OCCASIONS.map((occasion) => (
          <li className="deck__list-row" key={occasion.id}>
            <Avatar
              size={24}
              name={occasion.person.name}
              initials={occasion.person.initials}
              channel={occasion.person.domain}
            />
            <span className="body-sm deck__list-name">{occasion.person.name}</span>
            <span className="micro deck__list-meta">{occasion.kind} today</span>
          </li>
        ))}
        {UPCOMING.map((event) => (
          <li className="deck__list-row" key={event.id}>
            <span className="body-sm deck__list-name">{event.label}</span>
            <span className="micro deck__list-meta">{event.when}</span>
          </li>
        ))}
      </ul>
    </Card>
  );

  return (
    <div className="deck">
      {statRow}

      {isDesktop ? (
        <div className="deck__split">
          <div className="deck__col deck__col--main">
            {strips}
            {attentionCard}
          </div>
          <div className="deck__col deck__col--side">
            {approvals}
            {committees}
            {occasions}
          </div>
        </div>
      ) : (
        <div className="deck__col">
          {strips}
          {approvals}
          {attentionCard}
          {committees}
          {occasions}
        </div>
      )}

      {/* §9.5.3 — the mobile equivalent of the two inline buttons. */}
      {sheetTask && (
        <Sheet open onClose={() => setSheetTask(null)} title={`Review ${sheetTask.number}`}>
          <p className="body-sm deck__sheet-title">{sheetTask.title}</p>
          <div className="deck__sheet-actions">
            {can('approvals.review') && (
              <>
                <Button variant="brush" fullWidth onClick={() => decide(sheetTask, true)}>
                  Approve
                </Button>
                <Button variant="outline" fullWidth onClick={() => decide(sheetTask, false)}>
                  Request changes
                </Button>
              </>
            )}
            <Button variant="ghost" fullWidth onClick={() => openTask(sheetTask)}>
              Open the task
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
