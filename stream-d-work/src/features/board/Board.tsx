import { useState } from 'react';
import { TaskCard } from '../../components/TaskCard';
import { useTasks, type Task, type TaskStatus } from '../../store/taskStore';
import { useDragDrop } from '../../hooks/useDragDrop';
import './Board.css';

type ColumnId = 'todo' | 'progress' | 'review' | 'done';

const COLUMNS: { id: ColumnId; label: string; colorVar: string }[] = [
  { id: 'todo', label: 'To Do', colorVar: 'var(--st-todo)' },
  { id: 'progress', label: 'In Progress', colorVar: 'var(--st-progress)' },
  { id: 'review', label: 'In Review', colorVar: 'var(--st-review)' },
  { id: 'done', label: 'Done', colorVar: 'var(--st-done)' },
];

export function Board() {
  const { columns, updateTaskStatus, tasksLoading, tasksError } = useTasks();
  const [search, setSearch] = useState('');
  const { draggedId, dragProps, dropZoneProps } = useDragDrop<Task>((taskId, columnId) =>
    updateTaskStatus(taskId, columnId as TaskStatus)
  );

  const filterTasks = (tasks: Task[]) =>
    search.trim()
      ? tasks.filter(
          (t) =>
            t.title.toLowerCase().includes(search.toLowerCase()) ||
            t.taskNumber.toLowerCase().includes(search.toLowerCase())
        )
      : tasks;

  return (
    <div>
      <div className="board-toolbar">
        <h1 className="st">Board</h1>
        <input
          className="board-search"
          type="text"
          placeholder="Search tasks…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {tasksError && (
        <div className="empty">
          <div className="l1">&gt; LIVE TASKS FAILED TO LOAD</div>
          {tasksError}
        </div>
      )}

      {tasksLoading && !tasksError && (
        <div className="empty">
          <div className="l1">&gt; LOADING LIVE TASKS…</div>
        </div>
      )}

      {!tasksLoading && (
        <div className="board-columns">
          {COLUMNS.map((col) => {
            const colTasks = filterTasks(columns[col.id]);
            return (
              <section key={col.id} className="board-column" {...dropZoneProps(col.id)}>
                <div className="board-column-header" style={{ borderBottomColor: col.colorVar, color: col.colorVar }}>
                  <span>{col.label}</span>
                  <span className="board-column-count">{String(colTasks.length).padStart(2, '0')}</span>
                </div>
                <div className="board-column-body">
                  {colTasks.map((task) => (
                    <div key={task.id} style={{ opacity: draggedId === task.id ? 0.4 : 1 }}>
                      <TaskCard task={task} draggable {...dragProps(task)} />
                    </div>
                  ))}
                  {colTasks.length === 0 && (
                    <div className="empty">
                      <div className="l1">&gt; NO TASKS</div>
                      Drop a task here.
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
