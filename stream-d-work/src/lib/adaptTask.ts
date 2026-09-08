// Read-path adapter — maps a Supabase `tasks` row (plus its resolved domain
// slug, resolved committee name, joined task_assignees, and joined
// task_links) onto the existing frontend Task shape from taskStore.tsx, so
// screens don't need to know whether data came from the mock store or a
// live query.
//
// Reconciled against the REAL migration in THIS checkout
// (supabase/migrations/20260907000000_foundation_schema.sql) — this is a
// different schema than a prior reconciliation pass was done against, and
// several column names/shapes differ from that earlier pass:
//   - `task_number` is a real stored TEXT column (e.g. "#0117"). No
//     formatting needed here.
//   - `due_date`, `due_label`, `is_overdue`, and `is_blocked` are ALL stored
//     directly on the row (seed.sql populates them precomputed). This
//     adapter TRUSTS them as-is rather than recomputing client-side — there
//     is no trigger/cron in this schema that keeps them fresh as real time
//     passes, so a stale `due_label`/`is_overdue` on an old row is a
//     backend-refresh gap for another stream, not something to paper over
//     by silently recomputing against a column that exists for exactly this
//     purpose.
//   - The tags column is `tags` (TEXT[]), not renamed.
//   - Domain/committee resolution: `tasks.domain_id` has a real FK to
//     `domains`, so the caller can embed it directly in the query
//     (`domains(slug)`) — that's the `domain` param below. `context_id`
//     (domain-or-committee) has NO FK (polymorphic), so resolving a
//     committee name needs a separate id->name lookup the caller builds —
//     this module never queries the database itself.

import type { Assignee, Domain, Priority, Task, TaskLink, TaskStatus } from '../store/taskStore';

export interface TaskRow {
  id: string;
  tenure_id: string;
  task_number: string;
  title: string;
  description: string | null;
  context_type: 'domain' | 'committee';
  context_id: string;
  domain_id: string | null;
  status: TaskStatus;
  priority: Priority;
  due_date: string | null;
  due_label: string | null;
  is_overdue: boolean;
  is_blocked: boolean;
  blocked_reason: string | null;
  tags: string[];
  created_at: string;
}

/**
 * @param domain Resolved from the embedded `domains.slug` FK join
 * (`tasks.domain_id -> domains.id`). The caller must supply a fallback
 * (e.g. 'core') if `domain_id` was null — that's a real possibility per the
 * schema's nullable FK, even though seed data always populates it.
 * @param committee Resolved by the caller from `context_id -> committees.id
 * -> committees.name`, ONLY when `row.context_type === 'committee'`.
 * Undefined for domain-context tasks.
 * @param assignees Pre-ordered by the caller so the primary assignee
 * (`task_assignees.is_primary`) is first — this function just takes [0].
 * @param links Pre-built by the caller (provider detected via
 * `detectProvider(url)`, since `task_links` has no provider column in this
 * schema).
 */
export function adaptTaskRow(
  row: TaskRow,
  domain: Domain,
  committee: string | undefined,
  assignees: Assignee[],
  links: TaskLink[]
): Task {
  return {
    id: row.id,
    taskNumber: row.task_number,
    title: row.title,
    description: row.description ?? '',
    domain,
    committee,
    status: row.status,
    priority: row.priority,
    assignee: assignees[0] ?? { name: 'Unassigned', initials: '—' },
    dueLabel: row.due_label ?? 'NO DUE DATE',
    isOverdue: row.is_overdue,
    isBlocked: row.is_blocked,
    blockedReason: row.blocked_reason ?? undefined,
    tags: row.tags.length > 0 ? row.tags : undefined,
    links: links.length > 0 ? links : undefined,
    // task_checklist / task_activity exist in the schema but aren't sourced
    // here — checklist wiring is out of scope for this read-path pass.
    checklist: [],
    activityLogs: [],
    createdAt: row.created_at,
  };
}
