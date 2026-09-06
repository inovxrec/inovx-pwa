import { cn } from '../../lib/cn';
import './StatePill.css';

export type TaskState =
  | 'todo' | 'progress' | 'review' | 'done' | 'blocked' | 'proposed' | 'cancelled';

const STATE_WORD: Record<TaskState, string> = {
  todo: 'To do',
  progress: 'In progress',
  review: 'In review',
  done: 'Done',
  blocked: 'Blocked',
  proposed: 'Proposed',
  cancelled: 'Cancelled',
};

export interface StatePillProps {
  state: TaskState;
  tone?: 'paper' | 'ink';
  className?: string;
}

/**
 * §7.4 — carries three signals so it never depends on colour alone (§11):
 * a dot, the state word, and a shape hint for the two confusable states
 * (blocked gets a ring, done gets a filled background).
 */
export function StatePill({ state, tone = 'paper', className }: StatePillProps) {
  return (
    <span
      className={cn('state-pill', `state-pill--${state}`, `state-pill--on-${tone}`, className)}
      style={{ '--state': `var(--st-${state})` } as React.CSSProperties}
    >
      <span className="state-pill__dot" aria-hidden="true" />
      <span className="state-pill__word micro">{STATE_WORD[state]}</span>
    </span>
  );
}
