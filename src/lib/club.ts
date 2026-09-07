import { daysUntil, dueInfo, startOfToday, type Person, type Task } from './tasks';
import type { Role } from '../store/authStore';

/*
  The club's own records — people, meetings, notifications and the calendar
  (§9.9–§9.11, §9.13).

  Shapes and derivations only. Every one of these is filled from Supabase; there
  is no seeded data anywhere in the frontend.
*/

/* ------------------------------------------------------------------ people */

export interface Member extends Person {
  /** The position line under the name — "Design lead", "Member". */
  title: string;
  /**
   * Present when the person has an account; the directory holds people who do
   * not, and a position line is not a role.
   */
  role?: Role;
  committees: string[];
  /** Day and month only; the year is nobody's business. */
  birthday: string;
}

/** How many open tasks each member is carrying, straight from the store. */
export function openCountFor(person: Person, tasks: Task[]): number {
  return tasks.filter(
    (task) =>
      task.state !== 'done' &&
      task.state !== 'cancelled' &&
      task.assignees.some((p) => p.id === person.id),
  ).length;
}

/** §9.10's BIRTHDAYS tab — the next sixty days, soonest first. */
export function upcomingBirthdays(
  members: Member[],
  window = 60,
): Array<{ member: Member; date: string; inDays: number }> {
  const today = startOfToday();

  return members
    .filter((member) => member.birthday)
    .map((member) => {
      const [month, day] = member.birthday.split('-').map(Number);
      let date = new Date(today.getFullYear(), month - 1, day);
      // Already gone this year — it is next year's that is coming up.
      if (date < today) date = new Date(today.getFullYear() + 1, month - 1, day);

      const value = `${date.getFullYear()}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { member, date: value, inDays: daysUntil(value, today) };
    })
    .filter((entry) => entry.inDays <= window)
    .sort((a, b) => a.inDays - b.inDays);
}

/* ---------------------------------------------------------------- meetings */


export type Attendance = 'present' | 'absent' | 'excused';

export interface ActionItem {
  id: string;
  text: string;
  owner?: Person;
  /** Set once "Make a task" has been used, so it cannot be done twice. */
  taskNumber?: string;
}

export interface Meeting {
  id: string;
  title: string;
  /** "Core team", "Techfest committee" — the context the list groups by. */
  context: string;
  date: string;
  /** Where it happens — a room, a building. Either or both of these may be set. */
  location?: string;
  /** A join link. Kept apart from `location` so a hybrid meeting can say both. */
  link?: string;
  published: boolean;
  invited: Person[];
  attendance: Record<string, Attendance>;
  minutes: string;
  actions: ActionItem[];
}

/* ----------------------------------------------------------- notifications */

export type NotificationKind = 'assigned' | 'due' | 'approved' | 'changes' | 'comment' | 'mention';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  actor?: Person;
  /** The sentence, with the actor's name rendered separately by the row. */
  message: string;
  at: string;
  read: boolean;
  /** Where tapping the row goes (§9.13). */
  to?: string;
}

/* --------------------------------------------------------------- calendar */

/** §9.9's four layers. */
export type CalendarLayer = 'deadlines' | 'occasions' | 'meetings' | 'events';

export interface CalendarEvent {
  id: string;
  layer: CalendarLayer;
  date: string;
  label: string;
  /** Deadlines carry the task so the cell can show its state inline. */
  task?: Task;
  /** Occasion rows list the poster tasks they generated (§9.9). */
  generated?: Task[];
  to?: string;
}

export const LAYER_LABELS: Record<CalendarLayer, string> = {
  deadlines: 'Deadlines',
  occasions: 'Occasions',
  meetings: 'Meetings',
  events: 'Events',
};

/**
 * Every layer, folded into one list the month grid and the agenda both read.
 *
 * Deadlines come from the task list and occasions from the roster's birthdays,
 * so the calendar can never show a date the board disagrees with. Meetings are
 * passed in because they are their own fetch.
 *
 * There is no `events` layer yet: the schema has no table for club events, so
 * nothing is invented for it — the layer simply has nothing in it.
 */
export function calendarEvents(
  tasks: Task[],
  members: Member[],
  meetings: Meeting[],
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const task of tasks) {
    if (!task.due || task.state === 'cancelled') continue;
    events.push({
      id: `due-${task.id}`,
      layer: 'deadlines',
      date: task.due,
      label: task.title,
      task,
      to: `/task/${task.id}`,
    });
  }

  for (const entry of upcomingBirthdays(members, 60)) {
    /*
      The poster tasks this occasion generated, so the Design lead can see at a
      glance whether the work behind a birthday is actually done (§9.9). Matched
      on the person's name until tasks carry an occasion id.
    */
    const first = entry.member.name.split(' ')[0].toLowerCase();
    const generated = tasks.filter((task) => task.title.toLowerCase().includes(first));

    events.push({
      id: `occ-${entry.member.id}`,
      layer: 'occasions',
      date: entry.date,
      label: `${entry.member.name} — birthday`,
      generated,
    });
  }

  for (const meeting of meetings) {
    events.push({
      id: `mt-${meeting.id}`,
      layer: 'meetings',
      date: meeting.date,
      label: meeting.title,
      to: `/meetings/${meeting.id}`,
    });
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

/** Groups events by ISO date, for the agenda list and the month cells. */
export function eventsByDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const list = map.get(event.date);
    if (list) list.push(event);
    else map.set(event.date, [event]);
  }
  return map;
}

/** True when a deadline has already gone past without being finished. */
export function eventIsLate(event: CalendarEvent): boolean {
  return Boolean(event.task && dueInfo(event.task).overdue);
}
