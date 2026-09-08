import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasks } from '../../store/taskStore';
import { useIsDesktop } from '../../hooks/useBreakpoint';
import { useToast } from '../../hooks/useToast';
import { useOpenTask } from '../../hooks/useOpenTask';
import { useAssignment } from '../../hooks/useAssignment';
import { usePermissionCheck } from '../../hooks/usePermission';
import { useMeetings } from '../../hooks/useMeetings';
import { useClub, useDomainSlugs } from '../../store/ClubProvider';
import {
  OVERDUE_THRESHOLD, attentionItems, deckStats, domainRollups,
} from '../../lib/analytics';
import { calendarEvents, eventIsLate, upcomingBirthdays } from '../../lib/club';
import { STATE_LABELS, daysUntil, formatDate, startOfToday, type Task } from '../../lib/tasks';
import { Button } from '../../ui/primitives/Button';
import { Chip } from '../../ui/primitives/Chip';
import { Tag } from '../../ui/primitives/Tag';
import { Avatar } from '../../ui/primitives/Avatar';
import { Card, EmptyState, StatCard, DomainStrip, TaskCard } from '../../ui/patterns';
import { Sheet } from '../../ui/patterns/Sheet';
import { StickerCoffee } from '../../ui/stickers';
import { NewTask } from '../board/NewTask';
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
  const { canCreate } = useAssignment();
  const { members, committees: clubCommittees } = useClub();
  const { meetings } = useMeetings();
  const domains = useDomainSlugs();

  /** The mobile approval row opens a sheet with the same two actions (§9.5.3). */
  const [sheetTask, setSheetTask] = useState<Task | null>(null);
  const [raising, setRaising] = useState(false);

  const stats = useMemo(() => deckStats(tasks), [tasks]);
  const rollups = useMemo(() => domainRollups(tasks, domains), [tasks, domains]);
  const attention = useMemo(() => attentionItems(tasks), [tasks]);

  /** Today's birthdays, and then the next few dated things after them. */
  const birthdays = useMemo(
    () => upcomingBirthdays(members, 0).map((entry) => entry.member),
    [members],
  );

  const upcoming = useMemo(() => {
    const today = startOfToday().toISOString().slice(0, 10);
    return calendarEvents(tasks, members, meetings)
      .filter((event) => event.date > today && !eventIsLate(event))
      .slice(0, 5);
  }, [tasks, members, meetings]);

  /** Open work per committee, counted from the same task list as the board. */
  const committeeRows = useMemo(
    () =>
      clubCommittees.map((committee) => ({
        id: committee.id,
        name: committee.name,
        members: committee.members.length,
        open: tasks.filter(
          (task) =>
            task.committee === committee.name &&
            task.state !== 'done' &&
            task.state !== 'cancelled',
        ).length,
      })),
    [clubCommittees, tasks],
  );

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
      {/*
        No sparklines: a tile's trend needs seven days of history and nothing
        records one, so the number stands on its own (§7.11).
      */}
      <StatCard value={stats.open} caption="Open" />
      <StatCard
        value={stats.overdue}
        caption="Overdue"
        atRisk={stats.overdue > OVERDUE_THRESHOLD}
      />
      <StatCard value={stats.awaitingApproval} caption="Awaiting approval" />
      <StatCard value={stats.doneThisWeek} caption="Done this week" />
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

  const committees = committeeRows.length === 0 ? null : (
    <Card title="Committees">
      <ul className="deck__list" role="list">
        {committeeRows.map((committee) => (
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

  /*
    §9.6 asks for an occasions card, and birthdays are the only occasion the
    deck can work out for itself. What follows them is simply the next few dated
    things — deadlines and meetings — which is useful but is not an occasion.

    So the card is named after what it actually holds. With no birthdays in the
    directory it was listing task deadlines under the word "Occasions", which
    reads as though the club had an occasion called "Sponsor outreach deck".
  */
  const occasions = birthdays.length === 0 && upcoming.length === 0 ? null : (
    <Card surface="mint" title={birthdays.length > 0 ? 'Occasions' : "What's coming"}>
      <ul className="deck__list" role="list">
        {birthdays.map((member) => (
          <li className="deck__list-row" key={member.id}>
            <Avatar
              size={24}
              name={member.name}
              initials={member.initials}
              channel={member.domain}
            />
            <span className="body-sm deck__list-name">{member.name}</span>
            <span className="micro deck__list-meta">birthday today</span>
          </li>
        ))}
        {upcoming.map((event) => (
          <li className="deck__list-row" key={event.id}>
            <span className="body-sm deck__list-name">{event.label}</span>
            <span className="micro deck__list-meta">{formatDate(event.date)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );

  return (
    <div className="deck">
      {/*
        The deck is where an admin starts the day, so raising work belongs here
        as well as on the board. It is the screen's one brush action (§1.2).
      */}
      {canCreate && (
        <div className="deck__actions">
          <Button variant="brush" size="sm" onClick={() => setRaising(true)}>
            New task
          </Button>
        </div>
      )}

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

      <NewTask
        open={raising}
        onClose={() => setRaising(false)}
        onCreated={(task) => {
          setRaising(false);
          openTask(task);
        }}
      />

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
