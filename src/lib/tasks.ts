import type { TaskState } from '../ui/primitives/StatePill';

export type { TaskState };

export type Domain = 'technical' | 'management' | 'events' | 'media' | 'design' | 'core';
export type Priority = 'urgent' | 'high' | 'medium' | 'low';

export interface Person {
  id: string;
  name: string;
  initials: string;
  /** Decides the avatar's colour, which is what makes a board scannable (§7.9). */
  domain: Domain;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Deliverable {
  id: string;
  url: string;
  label: string;
  /** Drives the LinkChip's leading glyph. */
  provider: 'drive' | 'figma' | 'github' | 'link';
  /**
   * False when we could not confirm the link is open to anyone with it. It
   * draws a warning glyph, never an error — we cannot actually know (§9.8).
   */
  shared: boolean;
}

export interface Comment {
  id: string;
  author: Person;
  body: string;
  /** ISO timestamp. */
  at: string;
}

export interface ActivityEntry {
  id: string;
  text: string;
  at: string;
  actor?: Person;
}

/** Where a generated task came from — renders as the §9.8 mint strip. */
export interface TaskSource {
  kind: 'occasion' | 'recurring' | 'task';
  label: string;
  /** Task number for `task`, rule or occasion id otherwise. */
  ref: string;
}

export interface Task {
  id: string;
  /** The short id shown in `micro` — "#0142". */
  number: string;
  title: string;
  description: string;
  domain: Domain;
  boardSlug: string;
  boardName: string;
  /** Set when the task belongs to a cross-domain committee (§9.7). */
  committee?: string;
  state: TaskState;
  priority: Priority;
  assignees: Person[];
  /** ISO date, or null for no due date. */
  due: string | null;
  labels: string[];
  source?: TaskSource;
  checklist: ChecklistItem[];
  deliverables: Deliverable[];
  comments: Comment[];
  activity: ActivityEntry[];
  /** Why it is blocked. Required reading before anyone can unblock it. */
  blockedReason?: string;
  createdAt: string;
}

export const DOMAIN_LABELS: Record<Domain, string> = {
  technical: 'Technical',
  management: 'Management',
  events: 'Events',
  media: 'Media & PR',
  design: 'Design',
  core: 'Core',
};

/** Column order on the board (§9.7). BLOCKED only appears when occupied. */
export const BOARD_STATES: TaskState[] = ['todo', 'progress', 'review', 'blocked', 'done'];

export const STATE_LABELS: Record<TaskState, string> = {
  todo: 'To do',
  progress: 'In progress',
  review: 'In review',
  done: 'Done',
  blocked: 'Blocked',
  proposed: 'Proposed',
  cancelled: 'Cancelled',
};

/**
 * Which moves are legal from each state. The mobile state sheet renders only
 * these — an illegal transition is absent, never greyed out (§9.7).
 *
 * The server is the authority; this keeps the UI from offering moves it knows
 * will be refused.
 */
export const LEGAL_TRANSITIONS: Record<TaskState, TaskState[]> = {
  proposed: ['todo', 'cancelled'],
  todo: ['progress', 'blocked', 'cancelled'],
  progress: ['review', 'blocked', 'todo'],
  review: ['done', 'progress'],
  blocked: ['progress', 'todo'],
  done: ['progress'],
  cancelled: ['todo'],
};

/* ------------------------------------------------------------------ dates */

/** Today, normalised to midnight so day arithmetic is exact. */
export function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Whole days from today to `iso`. Negative means it is in the past. */
export function daysUntil(iso: string, from = startOfToday()): number {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  return Math.round((target.getTime() - from.getTime()) / 86_400_000);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]}`;
}

export interface DueInfo {
  /** "DUE 28 AUG", "OVERDUE 3D · 19 AUG", or "" when there is no due date. */
  text: string;
  overdue: boolean;
  /** True for today, which reads "DUE TODAY" rather than a date. */
  today: boolean;
}

/**
 * §7.10 — an overdue card says how overdue it is, because "19 Aug" alone does
 * not tell a person scanning a list how much trouble they are in.
 */
export function dueInfo(task: Pick<Task, 'due' | 'state'>): DueInfo {
  if (!task.due) return { text: '', overdue: false, today: false };

  const days = daysUntil(task.due);
  const settled = task.state === 'done' || task.state === 'cancelled';

  if (days < 0 && !settled) {
    return { text: `Overdue ${-days}d · ${formatDate(task.due)}`, overdue: true, today: false };
  }
  if (days === 0) return { text: 'Due today', overdue: false, today: true };
  return { text: `Due ${formatDate(task.due)}`, overdue: false, today: false };
}

export function isOverdue(task: Task): boolean {
  return dueInfo(task).overdue;
}

export function isDueToday(task: Task): boolean {
  return Boolean(task.due) && daysUntil(task.due!) === 0 && task.state !== 'done';
}

/** Progress through the checklist, or null when there is no checklist. */
export function checklistProgress(task: Task): { done: number; total: number } | null {
  if (task.checklist.length === 0) return null;
  return { done: task.checklist.filter((i) => i.done).length, total: task.checklist.length };
}

/** "just now", "4h", "3d" — the compact age a feed row shows. */
export function relativeTime(iso: string, now = Date.now()): string {
  const minutes = Math.round((now - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

/**
 * The one primary action for a task, computed from its state and the person's
 * permissions (§9.8). Exactly one, or none — everything else is in the overflow.
 */
export function primaryAction(
  task: Pick<Task, 'state'>,
  canReview: boolean,
): { label: string; to: TaskState } | null {
  switch (task.state) {
    case 'todo':
      return { label: 'Start', to: 'progress' };
    case 'progress':
      return { label: 'Submit for review', to: 'review' };
    case 'review':
      // Only a reviewer gets an action here. The author seeing none is the
      // honest answer to "what do I do next" while it sits with someone else.
      return canReview ? { label: 'Approve', to: 'done' } : null;
    case 'blocked':
      return { label: 'Unblock', to: 'progress' };
    case 'proposed':
      return canReview ? { label: 'Accept', to: 'todo' } : null;
    default:
      return null;
  }
}
