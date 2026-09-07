import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/authStore';
import { useTasks } from '../../store/taskStore';
import { usePermissionCheck } from '../../hooks/usePermission';
import { useToast } from '../../hooks/useToast';
import { useOpenTask } from '../../hooks/useOpenTask';
import { ANNOUNCEMENTS, OCCASIONS, PERSON_BY_EMAIL } from '../../lib/mockTasks';
import { LEGAL_TRANSITIONS, STATE_LABELS, daysUntil, dueInfo, type Task } from '../../lib/tasks';
import { Button } from '../../ui/primitives/Button';
import { Avatar } from '../../ui/primitives/Avatar';
import { Tag } from '../../ui/primitives/Tag';
import { SkeletonTaskCard } from '../../ui/primitives/Skeleton';
import { Card, EmptyState, TaskCard } from '../../ui/patterns';
import { Pin } from '../../ui/signature/Pin';
import { Tape } from '../../ui/signature/Tape';
import { StickerCoffee } from '../../ui/stickers';
import { StateSheet } from './StateSheet';
import './MyDay.css';

/** How many of the next-7-days rows show before "See all" (§9.4). */
const NEXT_PREVIEW = 3;

function greeting(hour = new Date().getHours()): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export interface MyDayProps {
  /** Renders the skeleton state instead of the data. */
  loading?: boolean;
}

/**
 * §9.4 — answers "what do I owe today" in under three seconds, without
 * scrolling on a phone. The greeting strip and the first two content cards are
 * above the fold at 375px, which is a hard requirement rather than a goal.
 *
 * All of this comes from one request in the real thing (§9.4 says never six),
 * so everything below is derived from the single task list the store holds.
 */
export function MyDay({ loading = false }: MyDayProps) {
  const { session } = useAuth();
  const { tasks, setState } = useTasks();
  const can = usePermissionCheck();
  const navigate = useNavigate();
  const toast = useToast();
  const openTask = useOpenTask();

  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [sheetTask, setSheetTask] = useState<Task | null>(null);

  const me = session ? PERSON_BY_EMAIL[session.email] : undefined;

  const groups = useMemo(() => {
    const live = tasks.filter((task) => task.state !== 'cancelled' && task.state !== 'done');
    const mine = live.filter((task) => task.assignees.some((p) => p.id === me?.id));

    // Blocks 2, 3, 5 and 6 are the person's own work (§9.4).
    const overdue = mine.filter((task) => dueInfo(task).overdue);
    const dueToday = mine.filter((task) => task.due && daysUntil(task.due) === 0);
    const inReview = mine.filter((task) => task.state === 'review');
    const upcoming = mine
      .filter((task) => {
        if (!task.due) return false;
        const days = daysUntil(task.due);
        return days > 0 && days <= 7;
      })
      .sort((a, b) => a.due!.localeCompare(b.due!));

    // Block 4 is other people's work waiting on this person (§9.4).
    const awaitingApproval = live.filter(
      (task) => task.state === 'review' && !task.assignees.some((p) => p.id === me?.id),
    );

    return { overdue, dueToday, awaitingApproval, inReview, upcoming };
  }, [tasks, me]);

  /**
   * §9.4's swipe-right and long-press both land here: advance one step along
   * the legal path, with an undo toast. The move is applied locally first so
   * the row leaves the group immediately.
   */
  function advance(task: Task) {
    const next = LEGAL_TRANSITIONS[task.state][0];
    if (!next) return;

    const undo = setState(task.id, next);
    toast.show(`${task.number} moved to ${STATE_LABELS[next]}`, {
      tone: 'success',
      action: { label: 'Undo', onAction: undo },
    });
  }

  /*
    §9.4's example line reads "3 due today · 1 overdue · 2 awaiting review".
    The third count is the person's OWN submitted work, not other people's
    approvals — a member has no permission to see those, and a greeting must
    not count things the screen below it will not show.
  */
  const counts = [
    `${groups.dueToday.length} due today`,
    groups.overdue.length > 0 ? `${groups.overdue.length} overdue` : null,
    `${groups.inReview.length} awaiting review`,
  ].filter(Boolean);

  /*
    §9.4 asks for tape on the overdue card AND a pin on the announcement, but
    §6.3 caps the screen at one of the two. The tape goes to the overdue block
    when there is one, since that is the card the eye should land on first;
    otherwise the pin marks the announcement.
  */
  const tapeOnOverdue = groups.overdue.length > 0;

  const nothingDue =
    groups.overdue.length === 0 &&
    groups.dueToday.length === 0 &&
    groups.inReview.length === 0;

  const rowProps = {
    variant: 'compact' as const,
    onOpen: openTask,
    onAdvance: advance,
    onLongPress: setSheetTask,
  };

  return (
    <div className="myday">
      {/*
        The greeting is on the ink ground, not a card (§9.4), and renders
        immediately from the session — it never waits on the day's data.
      */}
      <header className="myday__greeting">
        <h2 className="display-3 title-reveal">
          {greeting()}, {session?.name.split(' ')[0] ?? 'there'}
        </h2>
        <p className="myday__counts body-sm">
          {counts.map((line, index) => (
            <span key={line}>
              {index > 0 && <span className="myday__sep" aria-hidden="true"> · </span>}
              <span className={line!.includes('overdue') ? 'myday__overdue' : undefined}>
                {line}
              </span>
            </span>
          ))}
        </p>
      </header>

      {loading ? (
        <div className="myday__stack">
          <SkeletonTaskCard />
          <SkeletonTaskCard />
          <SkeletonTaskCard />
        </div>
      ) : nothingDue ? (
        <Card>
          <EmptyState
            sticker={<StickerCoffee size="empty" />}
            title="Nothing due today"
            line="you're clear — check the board for what's coming"
            action={
              <Button variant="outline" onClick={() => navigate('/board')}>
                Open the board
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="myday__stack">
          {/* Alternating paper → mint → paper down the stack (§5.1). */}

          {groups.overdue.length > 0 && (
            <Card
              title="Overdue"
              decoration={tapeOnOverdue ? <Tape channel="events" corner="top-right" /> : undefined}
              aside={<Tag state="blocked">{groups.overdue.length}</Tag>}
            >
              <ul className="myday__rows stagger" role="list">
                {groups.overdue.map((task) => (
                  <SwipeRow key={task.id} task={task} {...rowProps} />
                ))}
              </ul>
            </Card>
          )}

          {groups.dueToday.length > 0 && (
            <Card title="Due today">
              <ul className="myday__rows stagger" role="list">
                {groups.dueToday.map((task) => (
                  <SwipeRow key={task.id} task={task} {...rowProps} />
                ))}
              </ul>
            </Card>
          )}

          {/* Absent, not disabled, without the permission (§14 item 13). */}
          {can('approvals.review') && groups.awaitingApproval.length > 0 && (
            <Card
              surface="mint"
              title="Awaiting your approval"
              aside={<Tag state="review">{groups.awaitingApproval.length}</Tag>}
            >
              <ul className="myday__rows stagger" role="list">
                {groups.awaitingApproval.map((task) => (
                  <SwipeRow key={task.id} task={task} {...rowProps} />
                ))}
              </ul>
            </Card>
          )}

          {groups.inReview.length > 0 && (
            <Card title="In review">
              <ul className="myday__rows stagger" role="list">
                {groups.inReview.map((task) => (
                  <li key={task.id} className="myday__waiting">
                    <TaskCard task={task} variant="compact" onOpen={openTask} />
                    <span className="myday__waiting-age micro">
                      waiting {Math.max(1, -daysUntil(task.createdAt))}d
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {groups.upcoming.length > 0 && (
            <Card
              title="Next 7 days"
              aside={
                groups.upcoming.length > NEXT_PREVIEW && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllUpcoming((v) => !v)}
                  >
                    {showAllUpcoming ? 'Show less' : 'See all'}
                  </Button>
                )
              }
            >
              <ul className="myday__rows stagger" role="list">
                {(showAllUpcoming ? groups.upcoming : groups.upcoming.slice(0, NEXT_PREVIEW))
                  .map((task) => (
                    <SwipeRow key={task.id} task={task} {...rowProps} />
                  ))}
              </ul>
            </Card>
          )}

          {OCCASIONS.length > 0 && (
            <Card surface="mint" title="Today's birthdays">
              <ul className="myday__people" role="list">
                {OCCASIONS.map((occasion) => (
                  <li key={occasion.id} className="myday__person">
                    <Avatar
                      size={32}
                      name={occasion.person.name}
                      initials={occasion.person.initials}
                      channel={occasion.person.domain}
                    />
                    <span className="body-sm">{occasion.person.name}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {ANNOUNCEMENTS.map((announcement) => (
            <Card
              key={announcement.id}
              title={announcement.title}
              eyebrow={`Pinned by ${announcement.by.name}`}
              decoration={tapeOnOverdue ? undefined : <Pin />}
            >
              <p className="body-sm read-width myday__announcement">{announcement.body}</p>
            </Card>
          ))}
        </div>
      )}

      {/* §9.4 — long-press opens the state sheet. */}
      <StateSheet
        task={sheetTask}
        onClose={() => setSheetTask(null)}
        onPick={(task, next) => {
          const undo = setState(task.id, next);
          setSheetTask(null);
          toast.show(`${task.number} moved to ${STATE_LABELS[next]}`, {
            tone: 'success',
            action: { label: 'Undo', onAction: undo },
          });
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ swipe */

interface SwipeRowProps {
  task: Task;
  variant: 'compact';
  onOpen: (task: Task) => void;
  onAdvance: (task: Task) => void;
  onLongPress: (task: Task) => void;
}

/** Past this many pixels a swipe counts (§9.4). */
const SWIPE_PX = 72;
const LONG_PRESS_MS = 500;

/**
 * §9.4's two gestures. Both have a keyboard and pointer equivalent elsewhere —
 * the row still opens on Enter, and the state sheet is reachable from the task
 * itself — so nothing here is the only way to do anything.
 */
function SwipeRow({ task, onOpen, onAdvance, onLongPress }: SwipeRowProps) {
  const [offset, setOffset] = useState(0);
  const [start, setStart] = useState<number | null>(null);
  const [pressTimer, setPressTimer] = useState<number | null>(null);

  const canAdvance = LEGAL_TRANSITIONS[task.state].length > 0;

  function clearPress() {
    if (pressTimer !== null) window.clearTimeout(pressTimer);
    setPressTimer(null);
  }

  return (
    <li
      className="myday__row"
      style={{ '--swipe': `${offset}px` } as React.CSSProperties}
      onTouchStart={(event) => {
        setStart(event.touches[0].clientX);
        setPressTimer(
          window.setTimeout(() => {
            onLongPress(task);
            setStart(null);
          }, LONG_PRESS_MS),
        );
      }}
      onTouchMove={(event) => {
        if (start === null) return;
        const delta = event.touches[0].clientX - start;
        // Only rightward travel means anything, and only while it can advance.
        if (Math.abs(delta) > 8) clearPress();
        setOffset(canAdvance ? Math.max(0, Math.min(delta, SWIPE_PX * 1.5)) : 0);
      }}
      onTouchEnd={() => {
        clearPress();
        if (offset >= SWIPE_PX) onAdvance(task);
        setOffset(0);
        setStart(null);
      }}
      onTouchCancel={() => {
        clearPress();
        setOffset(0);
        setStart(null);
      }}
    >
      {/* Revealed behind the row as it slides. Decorative — the toast confirms. */}
      {offset > 0 && (
        <span className="myday__swipe-hint micro" aria-hidden="true">
          {STATE_LABELS[LEGAL_TRANSITIONS[task.state][0]]}
        </span>
      )}
      <TaskCard task={task} variant="compact" onOpen={onOpen} className="myday__row-card" />
    </li>
  );
}
