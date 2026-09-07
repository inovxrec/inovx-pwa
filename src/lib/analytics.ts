import { DOMAIN_LABELS, daysUntil, dueInfo, type Domain, type Person, type Task } from './tasks';

/*
  What the three deck screens read (§9.5, §9.6, §9.12).

  Everything here is derived from data the app has already fetched, so the decks
  and the board can never disagree. Nothing is seeded.

  NOT DERIVABLE, and therefore absent rather than invented — the foundation
  schema has no table behind any of them:

    · the seven-point sparkline trends on a stat tile
    · twelve weeks of completions for the activity chart — a task carries no
      completion date, only a status, so there is nothing to put on a week axis
    · attendance and minutes summaries on the Oversight deck
    · integration health, occasion rules, tenure archive figures

  The screens that wanted those now say the figure is not available yet rather
  than showing a number nobody measured. They are listed in the README for the
  backend team.
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

/** One row per domain the club actually has. */
export function domainRollups(tasks: Task[], domains: Domain[]): DomainRollup[] {
  return domains.map((domain) => {
    const mine = tasks.filter((task) => task.domain === domain);
    const done = mine.filter((task) => task.state === 'done').length;
    const open = mine.filter(
      (task) => task.state !== 'done' && task.state !== 'cancelled',
    ).length;
    const overdue = mine.filter((task) => dueInfo(task).overdue).length;
    const counted = done + open;

    return {
      domain,
      label: DOMAIN_LABELS[domain],
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

export interface WorkloadRow {
  person: Person;
  open: number;
  overdue: number;
}

export function workload(tasks: Task[], people: Person[]): WorkloadRow[] {
  const rows = new Map<string, WorkloadRow>();
  for (const person of people) rows.set(person.id, { person, open: 0, overdue: 0 });

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

export interface LeaderboardRow {
  person: Person;
  completed: number;
}

/**
 * §9.12's leaderboard — finished tasks per person, highest first.
 *
 * Counted from the same task list the board draws, so it is a standing total
 * rather than a period one: without a completion date on a task there is no
 * way to say "this month", and a total that quietly meant something else would
 * be worse than one that says what it is.
 */
export function leaderboard(tasks: Task[], people: Person[]): LeaderboardRow[] {
  const rows = new Map<string, LeaderboardRow>();
  for (const person of people) rows.set(person.id, { person, completed: 0 });

  for (const task of tasks) {
    if (task.state !== 'done') continue;
    for (const person of task.assignees) {
      const row = rows.get(person.id);
      if (row) row.completed += 1;
    }
  }

  return [...rows.values()]
    .filter((row) => row.completed > 0)
    .sort((a, b) => b.completed - a.completed);
}

/* ------------------------------------------------ §9.5.4 attention list */

export type AttentionKind = 'blocked' | 'unassigned';

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

/**
 * Only the two the task list can actually answer.
 *
 * The screen used to list degraded integrations and members with nothing open
 * as well; the first needs a table that does not exist, and the second was
 * removed with it rather than left as the only half of a pair.
 */
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

  return items;
}

/**
 * §9.6's hero card: the same figures as everywhere else, written as sentences.
 * Faculty read prose, not a metric wall.
 */
export function oversightSummary(tasks: Task[], domains: Domain[]): string {
  if (tasks.length === 0) return 'There is no work on the board yet.';

  const rollups = domainRollups(tasks, domains);
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

  if (late.length > 0) {
    const total = late.reduce((sum, domain) => sum + domain.overdue, 0);
    const names = late.map((domain) => domain.label);
    const where =
      names.length === 1
        ? names[0]
        : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

    sentences.push(`${total} ${total === 1 ? 'task is' : 'tasks are'} overdue, in ${where}.`);
  }

  return sentences.join(' ');
}
