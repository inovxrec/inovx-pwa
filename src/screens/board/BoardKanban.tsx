import { useState } from 'react';
import { daysUntil, type Task, type TaskState } from '../../lib/tasks';
import { Button } from '../../ui/primitives/Button';
import { BoardColumn, TaskCard } from '../../ui/patterns';

export interface BoardKanbanProps {
  byState: Record<TaskState, Task[]>;
  columns: TaskState[];
  /** Ids flashing because they just moved (§9.7). */
  flashed: string[];
  onOpen: (task: Task) => void;
  onMove: (task: Task, state: TaskState) => void;
}

/** DONE collapses to the last seven days, with an expander (§9.7). */
const DONE_WINDOW_DAYS = 7;

/**
 * The desktop half of fork #2 (§8): a real Kanban with drag and drop and a
 * dashed flame drop indicator.
 *
 * Drag is a convenience, not the only way — every card opens to a detail screen
 * whose action bar moves it too, so a keyboard user is never stuck (§8).
 */
export function BoardKanban({ byState, columns, flashed, onOpen, onMove }: BoardKanbanProps) {
  const [dragging, setDragging] = useState<Task | null>(null);
  const [showAllDone, setShowAllDone] = useState(false);

  function visibleFor(state: TaskState): Task[] {
    const tasks = byState[state] ?? [];
    if (state !== 'done' || showAllDone) return tasks;
    return tasks.filter((task) => !task.due || -daysUntil(task.due) <= DONE_WINDOW_DAYS);
  }

  return (
    <div className="board__columns no-scrollbar">
      {columns.map((state) => {
        const all = byState[state] ?? [];
        const shown = visibleFor(state);
        const hidden = all.length - shown.length;

        return (
          <BoardColumn
            key={state}
            state={state}
            count={all.length}
            dragActive={Boolean(dragging)}
            onDrop={(next) => {
              if (dragging) onMove(dragging, next);
              setDragging(null);
            }}
            footer={
              state === 'done' && (hidden > 0 || showAllDone) ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllDone((v) => !v)}
                >
                  {showAllDone ? 'Show the last 7 days' : `Show ${hidden} older`}
                </Button>
              ) : undefined
            }
          >
            {shown.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onOpen={onOpen}
                draggable
                onDragStart={setDragging}
                onDragEnd={() => setDragging(null)}
                justChanged={flashed.includes(task.id)}
              />
            ))}
          </BoardColumn>
        );
      })}
    </div>
  );
}
