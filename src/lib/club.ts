import { PEOPLE } from './mockTasks';
import { daysUntil, dueInfo, startOfToday, type Person, type Task } from './tasks';

/*
  The club's own records — people, meetings, notifications and the calendar
  (§9.9–§9.11, §9.13).

  As with the decks, anything that can be derived from the task list is derived;
  only what the store cannot know is seeded.
*/

function iso(offsetDays: number): string {
  const d = startOfToday();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function ago(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

/* ------------------------------------------------------------------ people */

export interface Member extends Person {
  /** The position line under the name — "Design lead", "Member". */
  title: string;
  committees: string[];
  /** Day and month only; the year is nobody's business. */
  birthday: string;
}

export const MEMBERS: Member[] = [
  { ...PEOPLE.riya, title: 'President', committees: ['Techfest', 'Alumni meet'], birthday: '11-02' },
  { ...PEOPLE.arjun, title: 'Events lead', committees: ['Techfest'], birthday: '03-19' },
  { ...PEOPLE.ananya, title: 'Design lead', committees: ['Techfest'], birthday: '09-04' },
  { ...PEOPLE.karan, title: 'Member', committees: ['Techfest'], birthday: '09-07' },
  { ...PEOPLE.nithya, title: 'Technical lead', committees: ['Techfest'], birthday: '09-07' },
  { ...PEOPLE.dev, title: 'Media lead', committees: [], birthday: '12-22' },
  { ...PEOPLE.sana, title: 'Management lead', committees: ['Alumni meet'], birthday: '10-30' },
];

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
export function upcomingBirthdays(window = 60): Array<{ member: Member; date: string; inDays: number }> {
  const today = startOfToday();

  return MEMBERS.map((member) => {
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

export const MEETINGS: Meeting[] = [
  {
    id: 'mt-1',
    title: 'Core team weekly',
    context: 'Core team',
    date: iso(-5),
    location: 'Seminar hall 2',
    published: true,
    invited: [PEOPLE.riya, PEOPLE.arjun, PEOPLE.ananya, PEOPLE.nithya, PEOPLE.dev, PEOPLE.sana],
    attendance: {
      [PEOPLE.riya.id]: 'present',
      [PEOPLE.arjun.id]: 'present',
      [PEOPLE.ananya.id]: 'present',
      [PEOPLE.nithya.id]: 'excused',
      [PEOPLE.dev.id]: 'absent',
      [PEOPLE.sana.id]: 'present',
    },
    minutes:
      'Techfest brief signed off. Design to start on the backdrop this week. Sponsorship deck goes to the two new partners on Friday.',
    actions: [
      { id: 'ai-1', text: 'Send the sponsorship deck to both new partners', owner: PEOPLE.sana },
      { id: 'ai-2', text: 'Book the shuttle for the guest speakers', owner: PEOPLE.arjun, taskNumber: '#0157' },
    ],
  },
  {
    id: 'mt-2',
    title: 'Techfest committee',
    context: 'Techfest',
    date: iso(-9),
    location: 'Design studio',
    link: 'https://meet.google.com/abc-defg-hij',
    published: true,
    invited: [PEOPLE.arjun, PEOPLE.karan, PEOPLE.ananya, PEOPLE.nithya],
    attendance: {
      [PEOPLE.arjun.id]: 'present',
      [PEOPLE.karan.id]: 'present',
      [PEOPLE.ananya.id]: 'present',
      [PEOPLE.nithya.id]: 'present',
    },
    minutes: 'Venue still blocked on the stamped requisition. Registration form goes to review this week.',
    actions: [{ id: 'ai-3', text: 'Chase the admin office in person', owner: PEOPLE.karan }],
  },
  {
    id: 'mt-3',
    title: 'Core team weekly',
    context: 'Core team',
    date: iso(2),
    link: 'https://meet.google.com/klm-nopq-rst',
    published: false,
    invited: [PEOPLE.riya, PEOPLE.arjun, PEOPLE.ananya, PEOPLE.nithya, PEOPLE.dev, PEOPLE.sana],
    attendance: {},
    minutes: '',
    actions: [],
  },
];

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

export const NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n-1', kind: 'assigned', actor: PEOPLE.riya,
    message: 'assigned you the stage backdrop artwork',
    at: ago(2), read: false, to: '/task/t-0153',
  },
  {
    id: 'n-2', kind: 'due',
    message: 'Birthday poster — Ananya Rao is due today',
    at: ago(5), read: false, to: '/task/t-0142',
  },
  {
    id: 'n-3', kind: 'comment', actor: PEOPLE.riya,
    message: 'commented on the birthday poster',
    at: ago(9), read: false, to: '/task/t-0142',
  },
  {
    id: 'n-4', kind: 'changes', actor: PEOPLE.arjun,
    message: 'asked for changes on the speaker carousel',
    at: ago(30), read: true, to: '/task/t-0140',
  },
  {
    id: 'n-5', kind: 'approved', actor: PEOPLE.riya,
    message: 'approved the website hero swap',
    at: ago(50), read: true, to: '/task/t-0131',
  },
  {
    id: 'n-6', kind: 'mention', actor: PEOPLE.nithya,
    message: 'mentioned you in the registration form task',
    at: ago(74), read: true, to: '/task/t-0138',
  },
];

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

/** TEMP: club events, which have no store of their own yet. */
const CLUB_EVENTS = [
  { id: 'ev-1', date: iso(9), label: 'Techfest — day one' },
  { id: 'ev-2', date: iso(10), label: 'Techfest — day two' },
  { id: 'ev-3', date: iso(3), label: 'Sponsor review call' },
];

/**
 * Every layer, folded into one list the month grid and the agenda both read.
 * Deadlines and occasions come from the tasks, so the calendar can never show a
 * date the board disagrees with.
 */
export function calendarEvents(tasks: Task[]): CalendarEvent[] {
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

  for (const entry of upcomingBirthdays(60)) {
    // The poster tasks this occasion generated, so the Design lead can see at a
    // glance whether the work behind a birthday is actually done (§9.9).
    const generated = tasks.filter(
      (task) =>
        task.source?.kind === 'occasion' &&
        task.title.toLowerCase().includes(entry.member.name.split(' ')[0].toLowerCase()),
    );

    events.push({
      id: `occ-${entry.member.id}`,
      layer: 'occasions',
      date: entry.date,
      label: `${entry.member.name} — birthday`,
      generated,
    });
  }

  for (const meeting of MEETINGS) {
    events.push({
      id: `mt-${meeting.id}`,
      layer: 'meetings',
      date: meeting.date,
      label: meeting.title,
      to: `/meetings/${meeting.id}`,
    });
  }

  for (const event of CLUB_EVENTS) {
    events.push({ id: event.id, layer: 'events', date: event.date, label: event.label });
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
