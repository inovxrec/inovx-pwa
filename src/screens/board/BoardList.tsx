import { useState } from 'react';
import { cn } from '../../lib/cn';
import { STATE_LABELS, type Task, type TaskState } from '../../lib/tasks';
import { IconChevronDown } from '../../ui/icons';
import { TaskCard } from '../../ui/patterns';

export interface BoardListProps {
  byState: Record<TaskState, Task[]>;
  columns: TaskState[];
  flashed: string[];
  onOpen: (task: Task) => void;
  /** Opens the state sheet — the mobile way to move a task (§9.7). */
  onChangeState: (task: Task) => void;
}

/**
 * The mobile half of fork #2 (§8): a vertical list grouped by state with
 * sticky, collapsible group headers.
 *
 * A long press on a card opens the state sheet, which is the mobile equivalent
 * of dragging between columns — both halves expose the same actions (§8).
 */
export function BoardList({
  byState, columns, flashed, onOpen, onChangeState,
}: BoardListProps) {
  const [collapsed, setCollapsed] = useState<TaskState[]>([]);

  function toggle(state: TaskState) {
    setCollapsed((current) =>
      current.includes(state) ? current.filter((s) => s !== state) : [...current, state],
    );
  }

  return (
    <div className="board__groups">
      {columns.map((state) => {
        const tasks = byState[state] ?? [];
        if (tasks.length === 0) return null;

        const isCollapsed = collapsed.includes(state);

        return (
          <section key={state} className="board__group">
            <h3 className="board__group-head">
              <button
                type="button"
                className="board__group-trigger"
                aria-expanded={!isCollapsed}
                aria-controls={`group-${state}`}
                onClick={() => toggle(state)}
                style={{ '--state': `var(--st-${state})` } as React.CSSProperties}
              >
                <span className="board__group-dot" aria-hidden="true" />
                <span className="board__group-name display-4">{STATE_LABELS[state]}</span>
                <span className="board__group-count tnum micro">{tasks.length}</span>
                <span
                  className={cn('board__group-chevron', isCollapsed && 'board__group-chevron--closed')}
                  aria-hidden="true"
                >
                  <IconChevronDown />
                </span>
              </button>
            </h3>

            {!isCollapsed && (
              <ul id={`group-${state}`} className="board__group-list stagger" role="list">
                {tasks.map((task) => (
                  <li key={task.id}>
                    <LongPressCard
                      task={task}
                      onOpen={onOpen}
                      onLongPress={onChangeState}
                      flashed={flashed.includes(task.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

const LONG_PRESS_MS = 500;

/** A card that opens on tap and offers the state sheet on a long press. */
function LongPressCard({
  task, onOpen, onLongPress, flashed,
}: {
  task: Task;
  onOpen: (task: Task) => void;
  onLongPress: (task: Task) => void;
  flashed: boolean;
}) {
  const [timer, setTimer] = useState<number | null>(null);

  function clear() {
    if (timer !== null) window.clearTimeout(timer);
    setTimer(null);
  }

  return (
    <div
      onTouchStart={() => setTimer(window.setTimeout(() => onLongPress(task), LONG_PRESS_MS))}
      onTouchMove={clear}
      onTouchEnd={clear}
      onTouchCancel={clear}
    >
      <TaskCard
        task={task}
        variant="compact"
        onOpen={onOpen}
        justChanged={flashed}
        overflow={
          <button
            type="button"
            className="board__group-move micro"
            aria-label={`Move ${task.number}`}
            onClick={(event) => {
              event.stopPropagation();
              onLongPress(task);
            }}
          >
            Move
          </button>
        }
      />
    </div>
  );
}
