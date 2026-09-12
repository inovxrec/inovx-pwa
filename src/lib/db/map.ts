import type { Role } from '../../store/authStore';
import type {
  ActivityEntry, Comment, Deliverable, Domain, Person, Task, TaskState,
} from '../tasks';
import type { AppNotification, Meeting, Member, NotificationKind } from '../club';
import type { Integration, OccasionRule } from '../admin';
import type {
  AnnouncementRow, AttendanceRow, CommitteeRow, IntegrationRow, MeetingRow, MemberDirectoryRow,
  NotificationRow, OccasionRow, TaskRow, UserRow,
} from './rows';

/*
  Row → domain translation, all in one place.

  The database and the app disagree in a few small ways on purpose — the schema
  spells a role `super_admin` and the UI spells it `super-admin`; the schema
  keeps a `due_label` string the UI would rather compute from the date so it
  cannot go stale. Every one of those disagreements is resolved here, so no
  screen ever has to know the database exists.
*/

/** The five domains the design system has colours for, plus core. */
const KNOWN_DOMAINS: Domain[] = ['technical', 'management', 'events', 'media', 'design', 'core'];

export function toDomain(slug: string | null | undefined): Domain {
  const value = (slug ?? '').toLowerCase();
  return (KNOWN_DOMAINS as string[]).includes(value) ? (value as Domain) : 'core';
}

export function toRole(role: UserRow['role']): Role {
  return role === 'super_admin' ? 'super-admin' : role;
}

/** Initials are optional in the schema; a person always has some. */
function initialsFor(row: Pick<UserRow, 'name' | 'initials'>): string {
  if (row.initials) return row.initials;
  return row.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();
}

export function toPerson(row: UserRow): Person {
  return {
    id: row.id,
    name: row.name,
    initials: initialsFor(row),
    domain: toDomain(row.domain),
  };
}

export function toMember(row: UserRow, committees: string[] = [], birthday = ''): Member {
  return {
    ...toPerson(row),
    title: row.position_title ?? 'Member',
    role: toRole(row.role),
    committees,
    birthday,
    email: row.email,
    viewerKind: row.viewer_kind ?? undefined,
  };
}

/** The directory is the roster; a user row is an account. They are not the same. */
/**
 * A directory row as the club's screens read it.
 *
 * `domainSlug` resolves the row's `domain_id`, which is the only trustworthy
 * answer. It used to read `domain_name` through `toDomain`, but that column
 * holds a display name — "Media & PR", "Core Ops" — and `toDomain` answers
 * `core` for anything it does not recognise. So every person in Media & PR was
 * quietly filed under Core: no error, no empty state, just the wrong domain on
 * their card and their absence from their own board's list.
 */
export function directoryToMember(
  row: MemberDirectoryRow,
  domainSlug?: (id: string | null) => Domain | undefined,
): Member {
  return {
    id: row.linked_user_id ?? row.id,
    name: row.name,
    initials: initialsFor({ name: row.name, initials: null }),
    domain: domainSlug?.(row.domain_id) ?? toDomain(row.domain_name),
    title: row.role_label ?? 'Member',
    committees: [],
    email: row.email ?? undefined,
    // The schema stores a full date; the app only ever wants the day and month.
    birthday: row.birthday ? row.birthday.slice(5) : '',
  };
}

/** The schema has no `cancelled` status; everything else lines up. */
export function toTaskState(status: TaskRow['status']): TaskState {
  return status;
}

/** ISO timestamp → the calendar day the UI works in. */
function toDay(value: string | null): string | null {
  return value ? value.slice(0, 10) : null;
}

/** A link's provider, guessed from its host for the LinkChip's leading mark. */
function providerFor(url: string): Deliverable['provider'] {
  const host = url.toLowerCase();
  if (host.includes('figma.')) return 'figma';
  if (host.includes('github.')) return 'github';
  if (host.includes('drive.google') || host.includes('docs.google')) return 'drive';
  return 'link';
}

export interface TaskContext {
  /** Domain id → slug and name, for resolving a task's board. */
  domains: Map<string, { slug: string; name: string }>;
  /** Committee id → name, for the committee label on a card. */
  committees: Map<string, string>;
}

export function toTask(row: TaskRow, context: TaskContext): Task {
  const domain = row.domain_id ? context.domains.get(row.domain_id) : undefined;
  const committee =
    row.context_type === 'committee' ? context.committees.get(row.context_id) : undefined;

  const assignees = (row.task_assignees ?? [])
    .map((entry) => entry.users)
    .filter((user): user is UserRow => Boolean(user))
    .map(toPerson);

  const checklist = [...(row.task_checklist ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((item) => ({ id: item.id, text: item.text, done: item.completed }));

  const deliverables: Deliverable[] = (row.task_links ?? []).map((link) => ({
    id: link.id,
    url: link.url,
    label: link.title,
    provider: providerFor(link.url),
    /*
      The schema does not record whether a link is actually shared, and we
      cannot see inside someone's Drive. Reported as confirmed rather than
      flagging every link with a warning nobody can act on.
    */
    shared: true,
  }));

  const comments: Comment[] = (row.task_comments ?? [])
    .filter((comment) => comment.users)
    .map((comment) => ({
      id: comment.id,
      author: toPerson(comment.users as UserRow),
      body: comment.content,
      at: comment.created_at,
    }));

  const activity: ActivityEntry[] = (row.task_activity ?? []).map((entry) => ({
    id: entry.id,
    text: entry.message ?? entry.action.replace(/_/g, ' '),
    at: entry.created_at,
    actor: entry.users ? toPerson(entry.users) : undefined,
  }));

  return {
    id: row.id,
    number: row.task_number,
    title: row.title,
    description: row.description ?? '',
    domain: toDomain(domain?.slug),
    boardSlug: domain?.slug ?? 'core',
    boardName: domain?.name ?? 'Core',
    committee,
    state: toTaskState(row.status),
    priority: row.priority,
    assignees,
    /*
      The date, not the stored `due_label`. A label written at insert time says
      "OVERDUE 3D" forever; the UI derives the same sentence from the date every
      render, so it cannot drift.
    */
    due: toDay(row.due_date),
    labels: row.tags ?? [],
    checklist,
    deliverables,
    comments,
    activity: activity.sort((a, b) => b.at.localeCompare(a.at)),
    blockedReason: row.blocked_reason ?? undefined,
    createdAt: row.created_at.slice(0, 10),
  };
}

export function toMeeting(
  row: MeetingRow,
  contextName: (type: string | null, id: string | null) => string,
): Meeting {
  const attendance: Record<string, 'present' | 'absent' | 'excused'> = {};
  const invited: Person[] = [];

  for (const entry of row.attendance ?? []) {
    if (!entry.users) continue;
    invited.push(toPerson(entry.users));
    // The schema has a fourth state, `late`, that the UI does not model. It
    // counts as present, which is what it means for a quorum.
    attendance[entry.users.id] = entry.status === 'late' ? 'present' : entry.status;
  }

  return {
    id: row.id,
    title: row.title,
    context: contextName(row.context_type, row.context_id),
    date: row.scheduled_at.slice(0, 10),
    location: row.location ?? undefined,
    /* A join link is stored in the description until the schema gains a column. */
    link: extractLink(row.description),
    published: Boolean(row.description),
    invited,
    attendance,
    minutes: row.description ?? '',
    actions: [],
  };
}

/** Pulls the first URL out of free text, for a meeting's join link. */
function extractLink(text: string | null): string | undefined {
  if (!text) return undefined;
  const match = text.match(/https?:\/\/\S+/);
  return match?.[0];
}

const NOTIFICATION_KINDS: NotificationKind[] = [
  'assigned', 'due', 'approved', 'changes', 'comment', 'mention',
];

export function toNotification(row: NotificationRow): AppNotification {
  const kind = NOTIFICATION_KINDS.includes(row.type as NotificationKind)
    ? (row.type as NotificationKind)
    : 'assigned';

  return {
    id: row.id,
    kind,
    // The title says who did what; the body says what it was.
    message: row.title || row.body,
    detail: row.title ? row.body : undefined,
    at: row.created_at,
    read: row.is_read,
    to: row.link ?? undefined,
  };
}

export function toAnnouncement(row: AnnouncementRow) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    by: row.users ? toPerson(row.users) : undefined,
    at: row.published_at,
  };
}

export function committeeName(row: CommitteeRow): string {
  return row.name;
}

export type { AttendanceRow };

/* --------------------------------------------------------------- occasions */

/**
 * An occasion row as the admin screen reads it.
 *
 * The screen shows one date per occasion, but the schema keeps two: a repeating
 * MM-DD for anything on the solar calendar, and a full `confirmed_date` for a
 * lunar occasion someone has pinned to this year. A confirmation from a past
 * year is deliberately not carried forward — that is precisely the fact the
 * queue exists to surface.
 */
export function toOccasion(
  row: OccasionRow,
  domainSlug: (id: string | null) => Domain,
  year = new Date().getFullYear(),
): OccasionRule {
  const confirmedThisYear = row.confirmed_year === year ? row.confirmed_date : null;
  const date = row.occasion_date ?? (confirmedThisYear ? confirmedThisYear.slice(5) : null);

  return {
    id: row.id,
    name: row.name,
    type: row.occasion_type,
    date,
    outputDomain: domainSlug(row.output_domain_id),
    leadDays: row.lead_days,
    strategy: row.assignment_strategy,
    needsDate: date === null,
  };
}

/* ------------------------------------------------------------ integrations */

export function toIntegration(row: IntegrationRow): Integration {
  return {
    id: row.id,
    name: row.name,
    health: row.status,
    lastSync: row.last_synced_at,
    syncRequestedAt: row.sync_requested_at,
    // `last_error` is the more useful line when there is one: the note explains
    // what the integration is for, the error explains why it is amber.
    note: row.last_error || row.note || '',
    conflicts: (row.integration_conflicts ?? [])
      .filter((conflict) => !conflict.resolved_at)
      .map((conflict) => ({ id: conflict.id, summary: conflict.summary })),
  };
}
