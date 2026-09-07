import { supabase } from '../../../lib/supabase';
import type { Task, Domain, Priority } from '../../../store/taskStore';

export type AssigneeStrategy = 'fixed' | 'round-robin' | 'whole-group' | 'unassigned';

export interface RecurringRule {
  id: string;
  title_template: string;
  description_template: string;
  context_type: 'domain' | 'committee';
  context_id: string; // Target domain or committee ID
  priority: Priority;
  lead_time_days: number;
  approval_required: boolean;
  creator_id?: string | null;
  tenure_id?: string | null;
  assignee_strategy: AssigneeStrategy;
  fixed_assignee_ids?: string[];
  candidate_user_ids?: string[];
  last_assigned_user_id?: string | null;
  skip_next_occurrence?: boolean;
  is_birthday?: boolean;
  birthday_person_name?: string;
  labels?: string[];
}

export interface GenerationCandidateUser {
  id: string;
  name: string;
  initials: string;
  status: 'active' | 'inactive' | 'deactivated';
  domain_id?: string | null;
}

export interface GeneratedTaskResult {
  taskRecord: {
    id: string;
    title: string;
    description: string;
    context_type: 'domain' | 'committee';
    context_id: string;
    priority: Priority;
    due_at: string;
    status: 'todo';
    recurring_rule_id: string;
    approval_required: boolean;
    creator_id: string | null;
    tenure_id: string | null;
    labels?: string[];
  };
  assigneeIds: string[];
  clientTask: Task;
  skipped: boolean;
}

/**
 * Resolves the assignees according to the strict recurring rule strategy contract:
 * - fixed
 * - round-robin (MUST skip deactivated members)
 * - whole-group
 * - unassigned queue
 */
export function resolveAssignees(
  rule: RecurringRule,
  availableUsers: GenerationCandidateUser[]
): string[] {
  // Filter only active users (Contract: round-robin MUST skip deactivated members)
  const activeUsers = availableUsers.filter((u) => u.status === 'active');

  switch (rule.assignee_strategy) {
    case 'fixed':
      return rule.fixed_assignee_ids || [];

    case 'round-robin': {
      if (activeUsers.length === 0) return [];

      const candidateIds = (rule.candidate_user_ids && rule.candidate_user_ids.length > 0)
        ? rule.candidate_user_ids
        : activeUsers.map((u) => u.id);

      // Only consider candidates who are currently active
      const activeCandidates = candidateIds.filter((cid) =>
        activeUsers.some((u) => u.id === cid)
      );

      if (activeCandidates.length === 0) return [];

      const lastIndex = rule.last_assigned_user_id
        ? activeCandidates.indexOf(rule.last_assigned_user_id)
        : -1;

      const nextIndex = (lastIndex + 1) % activeCandidates.length;
      const chosenUserId = activeCandidates[nextIndex];
      return chosenUserId ? [chosenUserId] : [];
    }

    case 'whole-group':
      return activeUsers.map((u) => u.id);

    case 'unassigned':
    default:
      return [];
  }
}

/**
 * Calculates due date using lead_time_days
 */
export function calculateDueAt(leadTimeDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + (leadTimeDays || 0));
  return d.toISOString();
}

/**
 * Generates a task instance from a recurring/birthday rule strictly conforming
 * to the team database contract and Part F specifications:
 *
 * Generated tasks must use:
 * context_type = domain or committee
 * context_id = target domain/committee ID
 * title/description = rule templates
 * priority = rule priority, otherwise medium
 * due_at = calculated using lead_time_days
 * status = todo
 * recurring_rule_id = rule ID
 * approval_required = inherited from rule
 * creator_id = rule owner/system user if available
 *
 * Do NOT:
 * - create task_links during generation
 * - manually create task_activity (handled by DB trigger)
 * - manually create realtime task events
 * - manually duplicate notification fan-out
 * - create generated tasks with status proposed
 *
 * Skip occurrence:
 * - do not create a task instance for a skipped occurrence
 */
export async function generateRecurringTask(
  rule: RecurringRule,
  availableUsers: GenerationCandidateUser[] = []
): Promise<GeneratedTaskResult | null> {
  // Contract: Skip occurrence -> do not create a task instance
  if (rule.skip_next_occurrence) {
    return null;
  }

  const taskId = crypto.randomUUID();
  const dueAt = calculateDueAt(rule.lead_time_days);

  // Template string variable replacement
  let title = rule.title_template;
  let description = rule.description_template;

  if (rule.is_birthday && rule.birthday_person_name) {
    title = title.replace(/\{\{name\}\}/gi, rule.birthday_person_name);
    description = description.replace(/\{\{name\}\}/gi, rule.birthday_person_name);
  }

  const resolvedAssigneeIds = resolveAssignees(rule, availableUsers);

  // Payload for team database 'tasks' table
  const taskRecord = {
    id: taskId,
    title,
    description,
    context_type: rule.context_type,
    context_id: rule.context_id,
    priority: rule.priority || 'medium',
    due_at: dueAt,
    status: 'todo' as const, // Strictly 'todo', NEVER 'proposed'
    recurring_rule_id: rule.id,
    approval_required: Boolean(rule.approval_required),
    creator_id: rule.creator_id || null,
    tenure_id: rule.tenure_id || null,
    labels: rule.labels || ['recurring'],
  };

  // Persist to Supabase if available
  try {
    const { error: taskError } = await supabase.from('tasks').insert(taskRecord);

    if (!taskError && resolvedAssigneeIds.length > 0) {
      // Contract: task_assignees M:N relationship
      const assigneeRows = resolvedAssigneeIds.map((userId) => ({
        task_id: taskId,
        user_id: userId,
        assigned_by: rule.creator_id || null,
        assigned_at: new Date().toISOString(),
      }));

      await supabase.from('task_assignees').insert(assigneeRows);
    }
  } catch {
    // Database table may be pending schema migration
  }

  // Derive client Task shape matching taskStore Task[]
  const primaryAssigneeUser = availableUsers.find((u) => u.id === resolvedAssigneeIds[0]);
  const safeDomain: Domain =
    rule.context_type === 'domain' && ['technical', 'management', 'events', 'media', 'design', 'core'].includes(rule.context_id)
      ? (rule.context_id as Domain)
      : 'technical';

  const clientTask: Task = {
    id: taskId,
    taskNumber: `TSK-${Math.floor(100 + Math.random() * 900)}`,
    title,
    description,
    domain: safeDomain,
    status: 'todo',
    priority: rule.priority || 'medium',
    assignee: {
      name: primaryAssigneeUser?.name || 'Unassigned',
      initials: primaryAssigneeUser?.initials || 'UN',
    },
    dueLabel: new Date(dueAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    isOverdue: false,
    isBlocked: false,
    checklist: [],
    activityLogs: [
      `Generated by recurring rule [${rule.id}] on ${new Date().toLocaleDateString()}`,
    ],
    createdAt: new Date().toISOString(),
  };

  return {
    taskRecord,
    assigneeIds: resolvedAssigneeIds,
    clientTask,
    skipped: false,
  };
}
