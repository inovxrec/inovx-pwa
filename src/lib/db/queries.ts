import { supabase } from '../supabase';
import type { Committee } from '../../store/committeeStore';
import type { Domain, Person, Task } from '../tasks';
import type { AppNotification, Meeting, Member } from '../club';
import type { AssignmentStrategy, Integration, OccasionRule } from '../admin';
import {
  directoryToMember, toAnnouncement, toDomain, toIntegration, toMeeting, toNotification,
  toOccasion, toPerson, toTask,
  type TaskContext,
} from './map';
import type {
  AnnouncementRow, AuditRow, CommitteeMemberRow, CommitteeRow, DomainRow, IntegrationRow,
  MeetingRow, MemberDirectoryRow, NotificationRow, OccasionRow, RecurringRuleRow, TaskRow,
  TenureRow, UserPermissionRow, UserRow,
} from './rows';

/*
  Every read the app makes, in one file.

  Each returns plain domain objects — a screen never sees a row, a join, or a
  PostgREST error shape. Row level security decides what actually comes back, so
  an empty result here can legitimately mean "not yours to see"; that is why the
  callers keep `loading` and `error` apart from "no rows".
*/

/** The tenure everything else is scoped to. */
export async function fetchActiveTenure(): Promise<TenureRow | null> {
  const { data, error } = await supabase
    .from('tenures')
    .select('id, name, start_date, end_date, is_active')
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  return data as TenureRow | null;
}

export async function fetchDomains(tenureId: string): Promise<DomainRow[]> {
  const { data, error } = await supabase
    .from('domains')
    .select('id, tenure_id, slug, name, lead_user_id, color, description')
    .eq('tenure_id', tenureId)
    .order('name');

  if (error) throw error;
  return (data ?? []) as DomainRow[];
}

export async function fetchUsers(tenureId: string): Promise<UserRow[]> {
  const { data, error } = await supabase
    .from('users')
    .select(
      'id, tenure_id, email, name, initials, role, domain_id, domain, position_title, status, must_change_password, avatar_url, viewer_kind',
    )
    .eq('tenure_id', tenureId)
    .eq('status', 'active')
    .order('name');

  if (error) throw error;
  return (data ?? []) as UserRow[];
}

/** One person's own profile row, by auth id. */
export async function fetchProfile(userId: string): Promise<UserRow | null> {
  const { data, error } = await supabase
    .from('users')
    .select(
      'id, tenure_id, email, name, initials, role, domain_id, domain, position_title, status, must_change_password, avatar_url, viewer_kind',
    )
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as UserRow | null;
}

export async function fetchCommittees(tenureId: string): Promise<Committee[]> {
  const { data, error } = await supabase
    .from('committees')
    .select('id, tenure_id, name, slug, lead_user_id, description')
    .eq('tenure_id', tenureId)
    .order('name');

  if (error) throw error;

  const committees = (data ?? []) as CommitteeRow[];
  if (committees.length === 0) return [];

  const { data: memberData, error: memberError } = await supabase
    .from('committee_members')
    .select('id, committee_id, user_id, role, users(*)')
    .in('committee_id', committees.map((c) => c.id));

  if (memberError) throw memberError;

  const byCommittee = new Map<string, Person[]>();
  for (const row of (memberData ?? []) as unknown as CommitteeMemberRow[]) {
    if (!row.users) continue;
    const list = byCommittee.get(row.committee_id) ?? [];
    list.push(toPerson(row.users));
    byCommittee.set(row.committee_id, list);
  }

  return committees.map((row) => {
    const members = byCommittee.get(row.id) ?? [];
    return {
      id: row.slug || row.id,
      name: row.name,
      members,
      domains: [...new Set(members.map((p) => p.domain))],
      createdAt: '',
    };
  });
}

/** Everything a task screen needs, joined in one round trip rather than N. */
const TASK_SELECT = `
  id, tenure_id, task_number, title, description, context_type, context_id, domain_id,
  status, priority, due_date, due_label, is_overdue, is_blocked, blocked_reason, tags,
  created_by, created_at,
  task_assignees ( user_id, is_primary, users(*) ),
  task_checklist ( id, text, completed, position ),
  task_links ( id, title, url ),
  task_comments ( id, content, created_at, users(*) ),
  task_activity ( id, action, message, created_at, users(*) )
`;

export async function fetchTasks(tenureId: string, context: TaskContext): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('tenure_id', tenureId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as TaskRow[]).map((row) => toTask(row, context));
}

export interface CreateTaskInput {
  tenureId: string;
  title: string;
  description: string;
  contextType: 'domain' | 'committee';
  contextId: string;
  domainId: string | null;
  priority: Task['priority'];
  due: string | null;
  assigneeIds: string[];
  createdBy: string | null;
}

export async function insertTask(input: CreateTaskInput, context: TaskContext): Promise<Task> {
  /*
    The number is allocated here because the schema has no sequence for it. Two
    people creating at the same moment could collide; the real fix is a database
    default, and it is worth one when the backend lands.
  */
  const { count } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('tenure_id', input.tenureId);

  const number = `#${String((count ?? 0) + 1).padStart(4, '0')}`;

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      tenure_id: input.tenureId,
      task_number: number,
      title: input.title,
      description: input.description,
      context_type: input.contextType,
      context_id: input.contextId,
      domain_id: input.domainId,
      status: 'todo',
      priority: input.priority,
      due_date: input.due ? `${input.due}T00:00:00Z` : null,
      tags: [],
      created_by: input.createdBy,
    })
    .select(TASK_SELECT)
    .single();

  if (error) throw error;

  if (input.assigneeIds.length > 0) {
    const { error: assignError } = await supabase.from('task_assignees').insert(
      input.assigneeIds.map((userId, index) => ({
        tenure_id: input.tenureId,
        task_id: (data as unknown as TaskRow).id,
        user_id: userId,
        is_primary: index === 0,
      })),
    );
    if (assignError) throw assignError;
  }

  return toTask(data as unknown as TaskRow, context);
}

export async function updateTaskStatus(taskId: string, status: Task['state']): Promise<void> {
  // The schema has no `cancelled`; nothing in the UI writes one.
  const { error } = await supabase
    .from('tasks')
    .update({ status, is_blocked: status === 'blocked' })
    .eq('id', taskId);

  if (error) throw error;
}

/**
 * Appends to a task's history.
 *
 * The table is insert-only by trigger and by policy, so this is the only way
 * anything reaches it — and until now nothing called it. The store rendered an
 * optimistic entry and never wrote one, so every task's activity tab was empty
 * the moment it was reloaded, on a log the schema goes out of its way to make
 * immutable.
 *
 * Failure is deliberately not surfaced: losing a line of history is not worth
 * putting an error in front of someone who just moved a card, and the move
 * itself has already been reported.
 */
export async function insertActivity(input: {
  tenureId: string;
  taskId: string;
  actorId: string | null;
  action: string;
  message: string;
}): Promise<void> {
  const { error } = await supabase.from('task_activity').insert({
    tenure_id: input.tenureId,
    task_id: input.taskId,
    actor_id: input.actorId,
    action: input.action,
    message: input.message,
  });
  if (error) throw error;
}

export async function updateTask(taskId: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from('tasks').update(patch).eq('id', taskId);
  if (error) throw error;
}

export async function setChecklistItem(itemId: string, done: boolean): Promise<void> {
  const { error } = await supabase
    .from('task_checklist')
    .update({ completed: done })
    .eq('id', itemId);
  if (error) throw error;
}

export async function insertChecklistItem(
  tenureId: string,
  taskId: string,
  text: string,
  position: number,
): Promise<void> {
  const { error } = await supabase
    .from('task_checklist')
    .insert({ tenure_id: tenureId, task_id: taskId, text, position });
  if (error) throw error;
}

export async function insertComment(
  tenureId: string,
  taskId: string,
  userId: string,
  content: string,
): Promise<void> {
  const { error } = await supabase
    .from('task_comments')
    .insert({ tenure_id: tenureId, task_id: taskId, user_id: userId, content });
  if (error) throw error;
}

/**
 * Removes a task and everything hanging off it.
 *
 * The assignees, checklist, links, comments and activity all cascade in the
 * schema, so this is one statement rather than six. Row level security decides
 * whether it is allowed — `task.delete` is a super admin key.
 */
export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw error;
}

/**
 * Replaces who is on a task.
 *
 * Delete-then-insert rather than working out the difference, for the same
 * reason `savePermissions` does it: the list is short, the caller already knows
 * the answer it wants, and diffing would be three round trips to save one.
 *
 * `is_primary` follows position, so the order the caller passes is the order
 * the board leads with — reordering is a reassignment, not a special case.
 *
 * Not a transaction, because PostgREST has no way to ask for one. The window
 * between the two statements is a task that briefly has nobody on it; under the
 * read policy that makes it briefly visible to its whole domain rather than
 * invisible, which is the safer of the two ways to be wrong for 40ms.
 *
 * WHO MAY CALL THIS
 * -----------------
 * Only somebody who holds `task.assign`, or who raised the task. Not merely an
 * assignee — and that is not a policy preference, it is the delete above.
 * `may_edit_task` grants an assignee the right to edit their own task by virtue
 * of being on it, so an assignee who takes themselves off has, between these
 * two statements, destroyed the thing that made them allowed to run the second
 * one. The insert is refused and the task is left with nobody on it.
 *
 * `task.assign` and `created_by` both survive the delete, so callers holding
 * either can never land in that state. TaskBody gates the control on exactly
 * that, and the server refuses anyone else regardless.
 */
export async function replaceAssignees(
  tenureId: string,
  taskId: string,
  userIds: string[],
): Promise<void> {
  const { error: clearError } = await supabase
    .from('task_assignees')
    .delete()
    .eq('task_id', taskId);

  if (clearError) throw clearError;
  if (userIds.length === 0) return;

  const { error } = await supabase.from('task_assignees').insert(
    userIds.map((userId, index) => ({
      tenure_id: tenureId,
      task_id: taskId,
      user_id: userId,
      is_primary: index === 0,
    })),
  );

  if (error) throw error;
}

/* ----------------------------------------------------------------- viewers */

export interface InviteResult {
  /** False when the account was made but the reset mail did not go out. */
  emailed: boolean;
  /** Set only when `emailed` is false — what to tell the person who invited. */
  warning?: string;
}

/**
 * Issues a read-only account to a faculty coordinator or support-committee
 * member, and mails them a link to set their own password.
 *
 * Goes through an edge function because creating an account needs the service
 * role, which the browser must never hold. The function checks that the caller
 * is a super admin against the database rather than trusting the token's claim,
 * so this being callable is not the thing keeping it safe.
 */
export async function inviteViewer(input: {
  name: string;
  email: string;
  viewerKind: 'faculty_coordinator' | 'support_committee';
}): Promise<InviteResult> {
  const { data, error } = await supabase.functions.invoke('invite-viewer', {
    body: input,
  });

  /*
    `functions.invoke` reports a non-2xx as a FunctionsHttpError whose message
    is "Edge Function returned a non-2xx status code" — true, and useless to
    whoever pressed the button. The function puts the real reason in the body,
    so it is read back out here.
  */
  if (error) {
    const response = (error as { context?: Response }).context;
    if (response) {
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (body?.error) throw new Error(body.error);
    }
    throw error;
  }

  const result = data as { emailed?: boolean; warning?: string };
  return { emailed: result?.emailed ?? false, warning: result?.warning };
}

export async function deleteTaskLink(linkId: string): Promise<void> {
  const { error } = await supabase.from('task_links').delete().eq('id', linkId);
  if (error) throw error;
}

/* ------------------------------------------------------------- permissions */

export async function fetchPermissions(tenureId: string): Promise<UserPermissionRow[]> {
  const { data, error } = await supabase
    .from('user_permissions')
    .select('id, user_id, permission_key, effect')
    .eq('tenure_id', tenureId);

  if (error) throw error;
  return (data ?? []) as UserPermissionRow[];
}

/** Replaces one person's overrides in a single write (§9.17 wants it atomic). */
export async function savePermissions(
  tenureId: string,
  userId: string,
  entries: Array<{ key: string; effect: 'grant' | 'revoke' | 'inherit' }>,
): Promise<void> {
  const { error: clearError } = await supabase
    .from('user_permissions')
    .delete()
    .eq('tenure_id', tenureId)
    .eq('user_id', userId);

  if (clearError) throw clearError;

  const keep = entries.filter((entry) => entry.effect !== 'inherit');
  if (keep.length === 0) return;

  const { error } = await supabase.from('user_permissions').insert(
    keep.map((entry) => ({
      tenure_id: tenureId,
      user_id: userId,
      permission_key: entry.key,
      effect: entry.effect,
    })),
  );

  if (error) throw error;
}

/* ------------------------------------------------------------------ people */

export async function fetchDirectory(
  tenureId: string,
  domains: DomainRow[] = [],
): Promise<Member[]> {
  const { data, error } = await supabase
    .from('member_directory')
    .select(
      'id, name, email, domain_id, domain_name, role_label, birthday, avatar_url, linked_user_id',
    )
    .eq('tenure_id', tenureId)
    .order('name');

  if (error) throw error;

  const slugById = new Map(domains.map((domain) => [domain.id, toDomain(domain.slug)]));
  const domainSlug = (id: string | null) => (id ? slugById.get(id) : undefined);

  return ((data ?? []) as MemberDirectoryRow[]).map((row) =>
    directoryToMember(row, domainSlug),
  );
}

/* ---------------------------------------------------------------- meetings */

export async function fetchMeetings(
  tenureId: string,
  contextName: (type: string | null, id: string | null) => string,
): Promise<Meeting[]> {
  const { data, error } = await supabase
    .from('meetings')
    .select(
      'id, title, description, scheduled_at, location, context_type, context_id, created_by, attendance ( id, meeting_id, user_id, status, notes, users(*) )',
    )
    .eq('tenure_id', tenureId)
    .order('scheduled_at', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as MeetingRow[]).map((row) => toMeeting(row, contextName));
}

export async function insertMeeting(input: {
  tenureId: string;
  title: string;
  scheduledAt: string;
  location: string | null;
  description: string | null;
  createdBy: string | null;
}): Promise<void> {
  const { error } = await supabase.from('meetings').insert({
    tenure_id: input.tenureId,
    title: input.title,
    scheduled_at: input.scheduledAt,
    location: input.location,
    description: input.description,
    context_type: 'all',
    created_by: input.createdBy,
  });

  if (error) throw error;
}

/**
 * Minutes are written back into `description`, which is also where the join
 * link lives until the table has a column of its own — so the link is carried
 * across rather than being overwritten by the minutes.
 */
export async function saveMinutes(
  meetingId: string,
  minutes: string,
  link: string | undefined,
): Promise<void> {
  const body =
    link && !minutes.includes(link) ? [link, '', minutes].join('\n') : minutes;

  const { error } = await supabase
    .from('meetings')
    .update({ description: body })
    .eq('id', meetingId);

  if (error) throw error;
}

/** One row per person marked, replacing whatever the meeting had before. */
export async function saveAttendance(
  tenureId: string,
  meetingId: string,
  marks: Array<{ userId: string; status: 'present' | 'absent' | 'excused' }>,
): Promise<void> {
  const cleared = await supabase.from('attendance').delete().eq('meeting_id', meetingId);
  if (cleared.error) throw cleared.error;

  if (marks.length === 0) return;

  const { error } = await supabase.from('attendance').insert(
    marks.map((mark) => ({
      tenure_id: tenureId,
      meeting_id: meetingId,
      user_id: mark.userId,
      status: mark.status,
    })),
  );

  if (error) throw error;
}

/* ----------------------------------------------------------- notifications */

export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, user_id, title, body, link, is_read, read_at, type, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return ((data ?? []) as NotificationRow[]).map(toNotification);
}

/* ---------------------------------------------------- notification prefs */

/**
 * The §9.14 matrix: which events reach someone on which channel.
 *
 * Null means they have never opened Settings, which is not the same as wanting
 * nothing — the caller falls back to the defaults the screen shows.
 */
export async function fetchNotificationPrefs(
  userId: string,
): Promise<Record<string, Record<string, boolean>> | null> {
  const { data, error } = await supabase
    .from('notification_prefs')
    .select('matrix')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  const matrix = data?.matrix as Record<string, Record<string, boolean>> | undefined;
  return matrix && Object.keys(matrix).length > 0 ? matrix : null;
}

/**
 * Writes the whole matrix back.
 *
 * Upsert rather than update: most people have no row until the first time they
 * change something, and the row's absence is the default rather than an error.
 */
export async function saveNotificationPrefs(
  tenureId: string,
  userId: string,
  matrix: Record<string, Record<string, boolean>>,
): Promise<void> {
  const { error } = await supabase
    .from('notification_prefs')
    .upsert({ tenure_id: tenureId, user_id: userId, matrix }, { onConflict: 'tenure_id,user_id' });

  if (error) throw error;
}

/** A person's own display name. The server refuses anything else (§12). */
export async function saveOwnName(userId: string, name: string): Promise<void> {
  const { error } = await supabase.from('users').update({ name }).eq('id', userId);
  if (error) throw error;
}

export async function markNotificationsRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .in('id', ids);
  if (error) throw error;
}

/* ---------------------------------------------------------- announcements */

export async function fetchAnnouncements(tenureId: string) {
  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, body, author_id, is_pinned, published_at, users:author_id(*)')
    .eq('tenure_id', tenureId)
    .eq('is_pinned', true)
    .order('published_at', { ascending: false })
    .limit(5);

  if (error) throw error;
  return ((data ?? []) as unknown as AnnouncementRow[]).map(toAnnouncement);
}

/* ------------------------------------------------------------------ admin */

export async function fetchRecurringRules(tenureId: string): Promise<RecurringRuleRow[]> {
  const { data, error } = await supabase
    .from('recurring_rules')
    .select(
      'id, title, description, context_type, context_id, frequency, cron_expression, priority, default_assignee_id, is_active, next_run_at',
    )
    .eq('tenure_id', tenureId)
    .order('title');

  if (error) throw error;
  return (data ?? []) as RecurringRuleRow[];
}

/**
 * The schedule is stored as a cron expression, because that is what the job
 * that fires these rules reads. The builder's weekday/month-day controls are
 * folded into one here rather than being kept as separate columns nobody else
 * would look at.
 */
export function cronFor(frequency: RecurringRuleRow['frequency'], weekday: number, monthDay: number): string | null {
  if (frequency === 'weekly' || frequency === 'biweekly') return `0 9 * * ${weekday}`;
  if (frequency === 'monthly') return `0 9 ${monthDay} * *`;
  if (frequency === 'daily') return '0 9 * * *';
  return null;
}

/** Reads a weekday and a month-day back out of a cron expression. */
export function scheduleFromCron(cron: string | null): { weekday: number; monthDay: number } {
  const parts = (cron ?? '').trim().split(/\s+/);
  const monthDay = Number(parts[2]);
  const weekday = Number(parts[4]);

  return {
    weekday: Number.isInteger(weekday) && weekday >= 0 && weekday <= 6 ? weekday : 1,
    monthDay: Number.isInteger(monthDay) && monthDay >= 1 && monthDay <= 28 ? monthDay : 1,
  };
}

export async function insertRecurringRule(input: {
  tenureId: string;
  title: string;
  frequency: RecurringRuleRow['frequency'];
  cron: string | null;
  contextId: string;
  active: boolean;
}): Promise<RecurringRuleRow> {
  const { data, error } = await supabase
    .from('recurring_rules')
    .insert({
      tenure_id: input.tenureId,
      title: input.title,
      context_type: 'domain',
      context_id: input.contextId,
      frequency: input.frequency,
      cron_expression: input.cron,
      is_active: input.active,
    })
    .select(
      'id, title, description, context_type, context_id, frequency, cron_expression, priority, default_assignee_id, is_active, next_run_at',
    )
    .single();

  if (error) throw error;
  return data as RecurringRuleRow;
}

export async function setRecurringRuleActive(ruleId: string, active: boolean): Promise<void> {
  const { error } = await supabase
    .from('recurring_rules')
    .update({ is_active: active })
    .eq('id', ruleId);

  if (error) throw error;
}

/* -------------------------------------------------------------- occasions */

const OCCASION_SELECT =
  'id, tenure_id, name, occasion_type, occasion_date, confirmed_date, confirmed_year, ' +
  'output_domain_id, lead_days, assignment_strategy, is_active, directory_member_id';

export async function fetchOccasions(
  tenureId: string,
  domains: DomainRow[],
): Promise<OccasionRule[]> {
  const { data, error } = await supabase
    .from('occasions')
    .select(OCCASION_SELECT)
    .eq('tenure_id', tenureId)
    .eq('is_active', true)
    .order('name');

  if (error) throw error;

  const slugById = new Map(domains.map((domain) => [domain.id, toDomain(domain.slug)]));
  const domainSlug = (id: string | null) => (id && slugById.get(id)) || 'core';

  return ((data ?? []) as unknown as OccasionRow[]).map((row) => toOccasion(row, domainSlug));
}

/**
 * Pins a lunar occasion to a date for one year.
 *
 * The year is stored alongside the date so next year's queue knows this
 * confirmation has expired — without it, a date set once would silently stand
 * for every year after, which is the exact mistake a lunar calendar punishes.
 */
export async function confirmOccasionDate(occasionId: string, date: string): Promise<void> {
  const { error } = await supabase
    .from('occasions')
    .update({ confirmed_date: date, confirmed_year: Number(date.slice(0, 4)) })
    .eq('id', occasionId);

  if (error) throw error;
}

/** The outputs sub-panel: which domain picks the work up, and how. */
export async function updateOccasionOutputs(
  occasionId: string,
  patch: {
    outputDomainId?: string | null;
    leadDays?: number;
    strategy?: AssignmentStrategy;
  },
): Promise<void> {
  const row: Record<string, unknown> = {};
  if ('outputDomainId' in patch) row.output_domain_id = patch.outputDomainId;
  if (patch.leadDays !== undefined) row.lead_days = patch.leadDays;
  if (patch.strategy !== undefined) row.assignment_strategy = patch.strategy;

  const { error } = await supabase.from('occasions').update(row).eq('id', occasionId);
  if (error) throw error;
}

/* ----------------------------------------------------------- integrations */

export async function fetchIntegrations(tenureId: string): Promise<Integration[]> {
  const { data, error } = await supabase
    .from('integrations')
    .select(
      'id, tenure_id, key, name, status, note, last_synced_at, last_error, sync_requested_at, ' +
        'integration_conflicts ( id, integration_id, summary, resolved_at, created_at )',
    )
    .eq('tenure_id', tenureId)
    .order('name');

  if (error) throw error;
  return ((data ?? []) as unknown as IntegrationRow[]).map(toIntegration);
}

/**
 * Asks an integration to sync now.
 *
 * There is no job runner in front of this yet, so what it can honestly do is
 * record that someone asked. The screen says as much rather than flipping the
 * bar green — a sync that has not happened must not look like one that has.
 */
export async function requestIntegrationSync(integrationId: string): Promise<void> {
  const { error } = await supabase
    .from('integrations')
    .update({ sync_requested_at: new Date().toISOString() })
    .eq('id', integrationId);

  if (error) throw error;
}

export async function fetchAudit(tenureId: string): Promise<AuditRow[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('id, actor_id, action, entity_type, entity_id, created_at, users:actor_id(*)')
    .eq('tenure_id', tenureId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data ?? []) as unknown as AuditRow[];
}

export async function fetchTenures(): Promise<TenureRow[]> {
  const { data, error } = await supabase
    .from('tenures')
    .select('id, name, start_date, end_date, is_active')
    .order('start_date', { ascending: false });

  if (error) throw error;
  return (data ?? []) as TenureRow[];
}

/** Domain slug → its row id, which inserts need. */
export function domainIdBySlug(domains: DomainRow[], slug: Domain): string | null {
  return domains.find((row) => toDomain(row.slug) === slug)?.id ?? null;
}
