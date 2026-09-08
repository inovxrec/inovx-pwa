import { startOfToday, type Domain, type Person } from './tasks';

/*
  Shapes and helpers for the eight admin screens (§9.15).

  Two of these have tables behind them — recurring_rules and audit_log — and are
  fetched in `lib/db/queries.ts`. The rest do not exist in the foundation
  schema, so their screens say the feature is not wired up yet rather than
  showing invented rows:

    · occasions (the whole occasion engine: rules, outputs, the lunar queue)
    · integrations and their sync health
    · tenure archive figures beyond the tenure row itself

  Listed in the README so the backend team knows what the frontend is waiting
  for. Nothing here fabricates a stand-in.
*/

/* ------------------------------------------------------------- occasions */

export type OccasionType = 'birthday' | 'festival' | 'anniversary' | 'lunar';

export interface OccasionRule {
  id: string;
  name: string;
  type: OccasionType;
  /** MM-DD, or null for a lunar date that has to be confirmed each year. */
  date: string | null;
  outputDomain: Domain;
  leadDays: number;
  strategy: 'domain-lead' | 'round-robin' | 'unassigned';
  needsDate?: boolean;
}

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

export type Frequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';

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
  biweekly: 'Every two weeks',
  monthly: 'Every month',
  custom: 'On a schedule',
};

export const WEEKDAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

/**
 * The next five dates a rule would fire — §9.15's live preview panel.
 *
 * Calculated rather than fetched, so the preview reflects whatever the
 * builder's controls currently say rather than what was last saved.
 */
export function nextOccurrences(
  rule: Pick<RecurringRule, 'frequency' | 'weekday' | 'monthDay'>,
  count = 5,
): string[] {
  const out: string[] = [];
  const cursor = startOfToday();

  const iso = (offset: number) => {
    const d = startOfToday();
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

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

  // A custom cron is the server's to interpret; the preview shows the weekly
  // reading of it rather than pretending to parse one here.
  const step = rule.frequency === 'biweekly' ? 14 : 7;
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

/* -------------------------------------------------------------- archive */

export interface Tenure {
  id: string;
  label: string;
  president?: Person;
  members: number;
  tasksCompleted: number;
  current: boolean;
}

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
  actor?: Person;
  action: string;
  target: string;
  at: string;
}
