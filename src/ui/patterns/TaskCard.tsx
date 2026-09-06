import type { KeyboardEvent, ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { DOMAIN_LABELS, STATE_LABELS, dueInfo, type Task } from '../../lib/tasks';
import { AvatarStack } from '../primitives/AvatarStack';
import { StatePill } from '../primitives/StatePill';
import { Tag } from '../primitives/Tag';
import './TaskCard.css';

export interface TaskCardProps {
  task: Task;
  /**
   * `full` is the board card; `compact` is the 56px single row for dense lists
   * — My Day, the approval queue (§7.10).
   */
  variant?: 'full' | 'compact';
  onOpen: (task: Task) => void;
  /** The nested `⋯` button. It stops propagation so it never opens the task. */
  overflow?: ReactNode;
  /**
   * Flashes --flame-soft once for 400ms — someone else moved this card and the
   * change arrived while it was on screen (§9.7).
   */
  justChanged?: boolean;
  /** Drag props from the board. Omitted everywhere else. */
  draggable?: boolean;
  onDragStart?: (task: Task) => void;
  onDragEnd?: () => void;
  className?: string;
}

/**
 * §7.10 — the whole card is one button. The left edge carries a 4px bar in the
 * domain colour, which is how a member spots a committee task inside their own
 * board without reading anything.
 *
 * Overdue is the only card that ever gets a border, and that is the point.
 */
export function TaskCard({
  task,
  variant = 'full',
  onOpen,
  overflow,
  justChanged = false,
  draggable = false,
  onDragStart,
  onDragEnd,
  className,
}: TaskCardProps) {
  const due = dueInfo(task);
  const cancelled = task.state === 'cancelled';

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onOpen(task);
  }

  const shared = {
    role: 'button',
    tabIndex: 0,
    onClick: () => onOpen(task),
    onKeyDown,
    draggable: draggable || undefined,
    onDragStart: draggable ? () => onDragStart?.(task) : undefined,
    onDragEnd: draggable ? () => onDragEnd?.() : undefined,
    style: {
      '--domain': `var(--dom-${task.domain})`,
      '--state': `var(--st-${task.state})`,
    } as React.CSSProperties,
  };

  if (variant === 'compact') {
    return (
      <div
        {...shared}
        className={cn(
          'task-card', 'task-card--compact', 'surface-paper',
          due.overdue && 'task-card--overdue',
          cancelled && 'task-card--cancelled',
          justChanged && 'task-card--flash',
          className,
        )}
        aria-label={`${task.title}. ${task.state}. ${due.text || 'No due date'}`}
      >
        <span className="task-card__edge" aria-hidden="true" />

        <p className="task-card__title task-card__title--compact">{task.title}</p>

        {/*
          DEVIATION from §7.10, which gives the compact row a state dot alone.
          A dot is colour-only information, which §14 item 11 rules out, so the
          state word rides with it. It is short enough to fit at 375px.
        */}
        <span className="task-card__state" aria-hidden="true">
          <span className="task-card__dot" />
          <span className="micro">{STATE_LABELS[task.state]}</span>
        </span>

        {due.text && (
          <span className={cn('task-card__due micro', due.overdue && 'task-card__due--late')}>
            {due.text}
          </span>
        )}
        {overflow}
      </div>
    );
  }

  return (
    <div
      {...shared}
      className={cn(
        'task-card', 'surface-paper',
        due.overdue && 'task-card--overdue',
        cancelled && 'task-card--cancelled',
        justChanged && 'task-card--flash',
        className,
      )}
      aria-label={`${task.title}. ${task.state}. ${due.text || 'No due date'}`}
    >
      <span className="task-card__edge" aria-hidden="true" />

      <div className="task-card__meta">
        <Tag channel={task.domain}>{DOMAIN_LABELS[task.domain]}</Tag>
        {task.committee && <span className="task-card__crumb micro">{task.committee}</span>}
        {task.source && <span className="task-card__crumb micro">{task.source.kind}</span>}
        <span className="task-card__number micro">{task.number}</span>
        {overflow}
      </div>

      <p className="task-card__title">{task.title}</p>

      <div className="task-card__foot">
        <StatePill state={task.state} />
        {due.text && (
          <span className={cn('task-card__due micro', due.overdue && 'task-card__due--late')}>
            {due.text}
          </span>
        )}
        {task.assignees.length > 0 ? (
          <AvatarStack
            className="task-card__people"
            people={task.assignees.map((p) => ({
              name: p.name, initials: p.initials, channel: p.domain,
            }))}
          />
        ) : (
          <span className="task-card__people" />
        )}
      </div>
    </div>
  );
}
