import { BOARDS, PEOPLE } from './mockTasks';
import { DOMAIN_LABELS, daysUntil, dueInfo, type Domain, type Person, type Task } from './tasks';

/*
  Everything the three deck screens read (§9.5, §9.6, §9.12).

  Anything derivable from the task list is derived, so the decks and the board
  can never disagree. Only the series that need history the store does not keep
  — twelve weeks of completions, attendance, minutes — are seeded.
*/

export interface DomainRollup {
  domain: Domain;
  label: string;
  open: number;
  overdue: number;
  done: number;
  /** 0–100, for the strip's ProgressBar and the completion chart. */
  completion: number;
}

export function domainRollups(tasks: Task[]): DomainRollup[] {
  return BOARDS.map((board) => {
    const mine = tasks.filter((task) => task.domain === board.domain);
    const done = mine.filter((task) => task.state === 'done').length;
    const open = mine.filter(
      (task) => task.state !== 'done' && task.state !== 'cancelled',
    ).length;
    const overdue = mine.filter((task) => dueInfo(task).overdue).length;
    const counted = done + open;

    return {
      domain: board.domain,
      label: DOMAIN_LABELS[board.domain],
      open,
      overdue,
      done,
      completion: counted === 0 ? 0 : Math.round((done / counted) * 100),
    };
  });
}

export interface DeckStats {
  open: number;
  overdue: number;
  awaitingApproval: number;
  doneThisWeek: number;
}

export function deckStats(tasks: Task[]): DeckStats {
  return {
    open: tasks.filter((t) => t.state !== 'done' && t.state !== 'cancelled').length,
    overdue: tasks.filter((t) => dueInfo(t).overdue).length,
    awaitingApproval: tasks.filter((t) => t.state === 'review').length,
    doneThisWeek: tasks.filter(
      (t) => t.state === 'done' && t.due !== null && -daysUntil(t.due) <= 7,
    ).length,
  };
}

/** Past this many overdue tasks the tile gains its blocked border (§9.5.1). */
export const OVERDUE_THRESHOLD = 3;

/**
 * TEMP: seven-point trends for the stat sparklines, and twelve weeks of
 * completions for the activity chart. The store keeps no history, so these are
 * the only figures here that are not derived. They come from the analytics
 * endpoint in the real thing.
 */
export const STAT_TRENDS: Record<keyof DeckStats, number[]> = {
  open: [22, 25, 24, 28, 26, 24, 21],
  overdue: [1, 2, 4, 3, 2, 3, 4],
  awaitingApproval: [3, 2, 4, 5, 3, 2, 3],
  doneThisWeek: [6, 9, 7, 11, 8, 12, 14],
};

export interface WeekPoint {
  /** "12 Aug" — the week's Monday. */
  label: string;
  completed: number;
}

export const ACTIVITY_12W: WeekPoint[] = [
  { label: '16 Jun', completed: 7 },
  { label: '23 Jun', completed: 11 },
  { label: '30 Jun', completed: 9 },
  { label: '07 Jul', completed: 14 },
  { label: '14 Jul', completed: 12 },
  { label: '21 Jul', completed: 8 },
  { label: '28 Jul', completed: 15 },
  { label: '04 Aug', completed: 18 },
  { label: '11 Aug', completed: 13 },
  { label: '18 Aug', completed: 16 },
  { label: '25 Aug', completed: 19 },
  { label: '01 Sep', completed: 14 },
];

export interface WorkloadRow {
  person: Person;
  open: number;
  overdue: number;
}

export function workload(tasks: Task[]): WorkloadRow[] {
  const rows = new Map<string, WorkloadRow>();

  for (const person of Object.values(PEOPLE)) {
    rows.set(person.id, { person, open: 0, overdue: 0 });
  }

  for (const task of tasks) {
    if (task.state === 'done' || task.state === 'cancelled') continue;
    const late = dueInfo(task).overdue;

    for (const person of task.assignees) {
      const row = rows.get(person.id);
      if (!row) continue;
      row.open += 1;
      if (late) row.overdue += 1;
    }
  }

  return [...rows.values()].sort((a, b) => b.open - a.open);
}

export interface LeaderRow {
  person: Person;
  completed: number;
}

/** §9.12 — a maximum of ten rows, and only with `leaderboard.view`. */
export const LEADERBOARD: LeaderRow[] = [
  { person: PEOPLE.ananya, completed: 14 },
  { person: PEOPLE.nithya, completed: 12 },
  { person: PEOPLE.karan, completed: 9 },
  { person: PEOPLE.dev, completed: 8 },
  { person: PEOPLE.sana, completed: 6 },
  { person: PEOPLE.arjun, completed: 5 },
  { person: PEOPLE.riya, completed: 3 },
];

/* ------------------------------------------------ §9.5.4 attention list */

export type AttentionKind = 'blocked' | 'unassigned' | 'integration' | 'idle';

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  /** The chip that leads the row. */
  tag: string;
  line: string;
  /** The one-tap resolution's label, and where it goes. */
  action: string;
  to?: string;
}

export function attentionItems(tasks: Task[]): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const task of tasks.filter((t) => t.state === 'blocked')) {
    items.push({
      id: `blocked-${task.id}`,
      kind: 'blocked',
      tag: 'Blocked',
      line: `${task.number} — ${task.blockedReason ?? task.title}`,
      action: 'Open',
      to: `/task/${task.id}`,
    });
  }

  for (const task of tasks.filter(
    (t) => t.assignees.length === 0 && t.state !== 'done' && t.state !== 'cancelled',
  )) {
    items.push({
      id: `unassigned-${task.id}`,
      kind: 'unassigned',
      tag: 'Unassigned',
      line: `${task.number} — ${task.title}`,
      action: 'Assign',
      to: `/task/${task.id}`,
    });
  }

  // TEMP: integration health and idle members need endpoints that do not exist.
  items.push({
    id: 'integration-drive',
    kind: 'integration',
    tag: 'Integration',
    line: 'Drive sync last succeeded 3 days ago',
    action: 'Check',
  });

  const idle = workload(tasks).filter((row) => row.open === 0);
  for (const row of idle) {
    items.push({
      id: `idle-${row.person.id}`,
      kind: 'idle',
      tag: 'No work',
      line: `${row.person.name} has nothing open`,
      action: 'Assign',
    });
  }

  return items;
}

/* ------------------------------------------------ §9.6 oversight extras */

export const COMMITTEES = [
  { id: 'c-techfest', name: 'Techfest', members: 18, open: 4 },
  { id: 'c-alumni', name: 'Alumni meet', members: 7, open: 1 },
];

export const UPCOMING = [
  { id: 'u-1', label: 'Techfest — day one', when: 'in 9 days' },
  { id: 'u-2', label: "Karan M.'s birthday", when: 'today' },
  { id: 'u-3', label: 'Sponsor review call', when: 'in 3 days' },
];

export const MINUTES = [
  { id: 'm-1', label: 'Core team — 02 Sep', by: PEOPLE.riya },
  { id: 'm-2', label: 'Techfest committee — 29 Aug', by: PEOPLE.arjun },
];

export const ATTENDANCE = { present: 38, invited: 46, meetings: 4 };

/**
 * §9.6's hero card: the same figures as everywhere else, written as sentences.
 * Faculty read prose, not a metric wall.
 */
export function oversightSummary(tasks: Task[]): string {
  const rollups = domainRollups(tasks);
  const done = tasks.filter((t) => t.state === 'done').length;
  const counted = tasks.filter((t) => t.state !== 'cancelled').length;

  const onTrack = rollups.filter((r) => r.overdue === 0 && r.open > 0).map((r) => r.label);
  const late = rollups.filter((r) => r.overdue > 0);

  const sentences = [`The club completed ${done} of ${counted} tasks this fortnight.`];

  if (onTrack.length > 0) {
    sentences.push(
      onTrack.length === 1
        ? `${onTrack[0]} is on track.`
        : `${onTrack.slice(0, -1).join(', ')} and ${onTrack[onTrack.length - 1]} are on track.`,
    );
  }

  // One sentence for all of them. Three sentences of the same shape in a row
  // reads as a generated list, which is the opposite of what §9.6 asks for.
  if (late.length > 0) {
    const total = late.reduce((sum, domain) => sum + domain.overdue, 0);
    const names = late.map((domain) => domain.label);
    const where =
      names.length === 1
        ? names[0]
        : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

    sentences.push(
      `${total} ${total === 1 ? 'task is' : 'tasks are'} overdue, in ${where}.`,
    );
  }

  return sentences.join(' ');
}
