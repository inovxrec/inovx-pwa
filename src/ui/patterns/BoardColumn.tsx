import { useState, type DragEvent, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { STATE_LABELS, type TaskState } from '../../lib/tasks';
import './BoardColumn.css';

export interface BoardColumnProps {
  state: TaskState;
  count: number;
  /** Fires when a card is dropped on this column. */
  onDrop?: (state: TaskState) => void;
  /** True while a card is being dragged anywhere on the board. */
  dragActive?: boolean;
  /** The DONE column collapses to the last seven days with an expander (§9.7). */
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * §9.7 — one Kanban column: Anton uppercase header, a count, a 2px underline in
 * the state colour, and a 2px dashed flame drop indicator while a card is over
 * it.
 *
 * Desktop only. The mobile board is a grouped list, not a squashed column.
 */
export function BoardColumn({
  state, count, onDrop, dragActive = false, footer, children, className,
}: BoardColumnProps) {
  const [over, setOver] = useState(false);

  function handleDragOver(event: DragEvent) {
    if (!onDrop) return;
    // Without this the browser refuses the drop.
    event.preventDefault();
    setOver(true);
  }

  return (
    <section
      className={cn('column', over && 'column--over', className)}
      style={{ '--state': `var(--st-${state})` } as React.CSSProperties}
      aria-label={`${STATE_LABELS[state]}, ${count} ${count === 1 ? 'task' : 'tasks'}`}
      onDragOver={handleDragOver}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        onDrop?.(state);
      }}
    >
      <header className="column__head">
        <h3 className="column__title display-4">{STATE_LABELS[state]}</h3>
        <span className="column__count tnum micro">{count}</span>
      </header>

      <div className={cn('column__body stagger', dragActive && 'column__body--armed')}>
        {children}
        {footer}
      </div>
    </section>
  );
}
