import { startOfToday, type Domain, type Person } from './tasks';

/*
  Shapes and helpers for the eight admin screens (§9.15).

  Everything here is fetched in `lib/db/queries.ts`: recurring_rules and
  audit_log from the foundation migration, occasions and integrations from
  `20260908000000_occasions_and_integrations.sql`. The one thing still without a
  table is the per-tenure archive figures — member counts and completed-task
  counts for a past year — so the archive screen counts what it can and says so.

  Nothing here fabricates a stand-in.
*/

/* ------------------------------------------------------------- occasions */

export type OccasionType = 'birthday' | 'festival' | 'anniversary' | 'lunar';

export type AssignmentStrategy = 'domain-lead' | 'round-robin' | 'unassigned';

export interface OccasionRule {
  id: string;
  name: string;
  type: OccasionType;
  /** MM-DD, or null for a lunar date that has to be confirmed each year. */
  date: string | null;
  outputDomain: Domain;
  leadDays: number;
  strategy: AssignmentStrategy;
  /**
   * True while the occasion has no date this year — the lunar queue's whole
   * membership test. Kept explicit rather than derived from `date` being null,
   * because a confirmed date is stored as a full date for one year and an
   * unconfirmed lunar occasion has neither.
   */
  needsDate?: boolean;
}

export const OCCASION_TYPE_LABELS: Record<OccasionType, string> = {
  birthday: 'Birthday',
  festival: 'Festival',
  anniversary: 'Anniversary',
  lunar: 'Lunar',
};

export const STRATEGY_LABELS: Record<AssignmentStrategy, string> = {
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

export type SyncHealth = 'ok' | 'degraded' | 'failing' | 'disabled';

export interface Integration {
  id: string;
  name: string;
  health: SyncHealth;
  /** Null when it has never run — which is not the same as being healthy. */
  lastSync: string | null;
  /** Set while a sync has been asked for but nothing has reported back. */
  syncRequestedAt: string | null;
  note: string;
  conflicts: Array<{ id: string; summary: string }>;
}

export const HEALTH_LABELS: Record<SyncHealth, string> = {
  ok: 'Healthy',
  degraded: 'Degraded',
  failing: 'Failing',
  disabled: 'Turned off',
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
