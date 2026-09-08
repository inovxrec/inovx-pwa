// Shared contract — Streams A & B enforce this server-side.
// FR-TASK state machine: which TaskStatus a task may move to from its current
// status. The board and task-detail screens use canTransition() to decide
// which action buttons/drop targets to show — this is the single source of
// truth for that logic on the frontend.
//
// FLAG: the real `tasks.status` CHECK constraint in this schema
// (supabase/migrations/20260907000000_foundation_schema.sql) is
// ('todo','progress','review','done','blocked','proposed') — it does NOT
// include 'cancelled'. This map still includes 'cancelled' as a frontend
// status/transition target because that's Stream D's existing contract, but
// a live write attempting to set status='cancelled' would fail at the DB
// CHECK level (in addition to the RLS write block) until Stream A/B add it.

import type { TaskStatus } from '../store/taskStore';

export const TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  todo: ['progress', 'blocked', 'cancelled'],
  progress: ['review', 'done', 'blocked', 'cancelled'],
  review: ['done', 'progress', 'blocked'],
  blocked: ['todo', 'progress', 'review', 'cancelled'],
  proposed: ['todo', 'cancelled'],
  done: [],
  cancelled: [],
};

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return TASK_TRANSITIONS[from].includes(to);
}
