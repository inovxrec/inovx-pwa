import { MEMBERS } from './club';
import { PEOPLE } from './mockTasks';
import { startOfToday, type Domain, type Person } from './tasks';

/*
  What the eight admin screens read (§9.15). Everything here is seeded, because
  none of it is derivable from the task list — these are the club's settings,
  not its work.
*/

function iso(offsetDays: number): string {
  const d = startOfToday();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function ago(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

/* ------------------------------------------------------------- occasions */

export type OccasionType = 'birthday' | 'festival' | 'anniversary' | 'lunar';

export interface OccasionRule {
  id: string;
  name: string;
  type: OccasionType;
  /** MM-DD, or null for a lunar date that has to be confirmed each year. */
  date: string | null;
  /** Which domain picks up the generated work. */
  outputDomain: Domain;
  /** Days before the date that the task is raised. */
  leadDays: number;
  strategy: 'domain-lead' | 'round-robin' | 'unassigned';
  /** Lunar occasions need this year's date confirming (§9.15). */
  needsDate?: boolean;
}

export const OCCASION_RULES: OccasionRule[] = [
  ...MEMBERS.map((member, index) => ({
    id: `occ-${member.id}`,
    name: `${member.name} — birthday`,
    type: 'birthday' as const,
    date: member.birthday,
    outputDomain: 'design' as const,
    leadDays: 5,
    strategy: index % 2 === 0 ? ('domain-lead' as const) : ('round-robin' as const),
  })),
  {
    id: 'occ-foundation',
    name: 'Club foundation day',
    type: 'anniversary',
    date: '11-14',
    outputDomain: 'media',
    leadDays: 10,
    strategy: 'domain-lead',
  },
  {
    id: 'occ-diwali',
    name: 'Diwali',
    type: 'lunar',
    date: null,
    outputDomain: 'design',
    leadDays: 14,
    strategy: 'domain-lead',
    needsDate: true,
  },
  {
    id: 'occ-eid',
    name: 'Eid',
    type: 'lunar',
    date: null,
    outputDomain: 'design',
    leadDays: 14,
    strategy: 'round-robin',
    needsDate: true,
  },
];

export const OCCASION_TYPE_LABELS: Record<OccasionType, string> = {
  birthday: 'Birthday',
  festival: 'Festival',
  anniversary: 'Anniversary',
  lunar: 'Lunar',
};

export const STRATEGY_LABELS: Record<OccasionRule['strategy'], string> = {
  'domain-lead': 'Domain lead',
  'round-robin': 'Round robin',
  unassigned: 'Left unassigned',
};

/* ------------------------------------------------------------- recurring */

export type Frequency = 'daily' | 'weekly' | 'fortnightly' | 'monthly';

export interface RecurringRule {
  id: string;
  title: string;
  frequency: Frequency;
  /** 0–6, Sunday first. Used by weekly and fortnightly. */
  weekday: number;
  /** 1–28. Used by monthly. */
  monthDay: number;
  domain: Domain;
  owner?: Person;
  active: boolean;
}

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  daily: 'Every day',
  weekly: 'Every week',
  fortnightly: 'Every two weeks',
  monthly: 'Every month',
};

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const RECURRING_RULES: RecurringRule[] = [
  {
    id: 'rec-1', title: 'Weekly recap post', frequency: 'weekly', weekday: 5,
    monthDay: 1, domain: 'media', owner: PEOPLE.dev, active: true,
  },
  {
    id: 'rec-2', title: 'Core team agenda', frequency: 'weekly', weekday: 1,
    monthDay: 1, domain: 'core', owner: PEOPLE.riya, active: true,
  },
  {
    id: 'rec-3', title: 'Sponsor pipeline review', frequency: 'monthly', weekday: 1,
    monthDay: 1, domain: 'management', owner: PEOPLE.sana, active: false,
  },
];

/**
 * The next five dates a rule would fire — §9.15's live preview panel.
 *
 * Calculated rather than seeded, so the preview genuinely reflects whatever the
 * builder's controls currently say.
 */
export function nextOccurrences(rule: Pick<RecurringRule, 'frequency' | 'weekday' | 'monthDay'>, count = 5): string[] {
  const out: string[] = [];
  const cursor = startOfToday();

  if (rule.frequency === 'monthly') {
    const day = Math.min(28, Math.max(1, rule.monthDay));
    let date = new Date(cursor.getFullYear(), cursor.getMonth(), day);
    if (date < cursor) date = new Date(cursor.getFullYear(), cursor.getMonth() + 1, day);

    for (let i = 0; i < count; i += 1) {
      out.push(
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      );
      date = new Date(date.getFullYear(), date.getMonth() + 1, day);
    }
    return out;
  }

  if (rule.frequency === 'daily') {
    for (let i = 1; i <= count; i += 1) out.push(iso(i));
    return out;
  }

  const step = rule.frequency === 'fortnightly' ? 14 : 7;
  // The first hit is the next matching weekday, today included.
  let offset = (rule.weekday - cursor.getDay() + 7) % 7;

  for (let i = 0; i < count; i += 1) {
    out.push(iso(offset));
    offset += step;
  }
  return out;
}

/* ---------------------------------------------------------- integrations */

export type SyncHealth = 'ok' | 'degraded' | 'failing';

export interface Integration {
  id: string;
  name: string;
  health: SyncHealth;
  lastSync: string;
  note: string;
  conflicts: string[];
}

export const HEALTH_LABELS: Record<SyncHealth, string> = {
  ok: 'Healthy',
  degraded: 'Degraded',
  failing: 'Failing',
};

export const INTEGRATIONS: Integration[] = [
  {
    id: 'int-drive', name: 'Google Drive', health: 'degraded', lastSync: ago(74),
    note: 'Deliverable links stopped resolving three days ago.',
    conflicts: ['Two files named "Techfest backdrop final"'],
  },
  {
    id: 'int-sheets', name: 'Member roster sheet', health: 'ok', lastSync: ago(3),
    note: 'Roll numbers and domains, read-only.',
    conflicts: [],
  },
  {
    id: 'int-mail', name: 'Club mail', health: 'failing', lastSync: ago(210),
    note: 'The app password was rotated and not replaced.',
    conflicts: [],
  },
];

/* -------------------------------------------------------------- archive */

export interface Tenure {
  id: string;
  label: string;
  president: Person;
  members: number;
  tasksCompleted: number;
  current: boolean;
}

export const TENURES: Tenure[] = [
  { id: 't-2026', label: '2026–27', president: PEOPLE.riya, members: 45, tasksCompleted: 128, current: true },
  { id: 't-2025', label: '2025–26', president: PEOPLE.arjun, members: 41, tasksCompleted: 402, current: false },
  { id: 't-2024', label: '2024–25', president: PEOPLE.sana, members: 38, tasksCompleted: 361, current: false },
];

export const HANDOVER_STEPS = [
  {
    id: 'freeze',
    title: 'Freeze the tenure',
    detail: 'Closes the current year to new work. Everything already open stays open.',
  },
  {
    id: 'assign',
    title: 'Name the incoming core team',
    detail: 'Their accounts are issued and their permissions set from the roles you pick.',
  },
  {
    id: 'handover',
    title: 'Hand over',
    detail: 'Archives the year, moves open work to the new tenure, and emails everyone.',
  },
];

/* ---------------------------------------------------------------- audit */

export interface AuditEntry {
  id: string;
  actor: Person;
  action: string;
  target: string;
  at: string;
}

export const AUDIT: AuditEntry[] = [
  { id: 'a-1', actor: PEOPLE.riya, action: 'Granted permission', target: 'Ananya R. — approvals.review', at: ago(4) },
  { id: 'a-2', actor: PEOPLE.riya, action: 'Approved task', target: '#0131 Club website hero', at: ago(50) },
  { id: 'a-3', actor: PEOPLE.arjun, action: 'Created committee', target: 'Techfest', at: ago(96) },
  { id: 'a-4', actor: PEOPLE.riya, action: 'Issued account', target: 'karan@inovx.club', at: ago(120) },
  { id: 'a-5', actor: PEOPLE.sana, action: 'Edited recurring rule', target: 'Sponsor pipeline review', at: ago(150) },
  { id: 'a-6', actor: PEOPLE.riya, action: 'Revoked permission', target: 'Dev A. — export.csv', at: ago(200) },
];

/* -------------------------------------------------------------- members */

/**
 * A temporary password for a newly provisioned account (§9.15).
 *
 * TEMP and deliberately obvious: the server issues the real one. This exists so
 * the result card has something to show during review, and it is never sent
 * anywhere.
 */
export function temporaryPassword(): string {
  const words = ['amber', 'vinyl', 'stencil', 'ribbon', 'quartz', 'cobalt', 'marble'];
  const word = words[Math.floor(Math.random() * words.length)];
  const digits = String(Math.floor(Math.random() * 9000) + 1000);
  return `${word}-${digits}`;
}
