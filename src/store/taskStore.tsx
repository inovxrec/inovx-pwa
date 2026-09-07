import {
  createContext, useCallback, useContext, useMemo, useState, type ReactNode,
} from 'react';
import { MOCK_TASKS } from '../lib/mockTasks';
import type { ChecklistItem, Deliverable, Domain, Person, Task, TaskState } from '../lib/tasks';
import { STATE_LABELS } from '../lib/tasks';

/**
 * The task layer every Phase 4 screen reads.
 *
 * TEMP: seeded from lib/mockTasks. Once the backend exists, replace the seed
 * with a fetch and the mutations with calls into lib/api — the shapes here are
 * what the screens are written against, so they should not need to change.
 *
 * Mutations are applied locally and immediately (§9.4's swipe-to-advance needs
 * the row to move before any round trip); each returns an `undo` so the caller
 * can put it back from a toast.
 */

/** What the new-task form supplies; the store fills in the rest. */
export interface NewTask {
  title: string;
  description: string;
  domain: Domain;
  boardSlug: string;
  boardName: string;
  committee?: string;
  priority: Task['priority'];
  assignees: Person[];
  due: string | null;
}

export interface TaskContextValue {
  tasks: Task[];
  byId: (id: string) => Task | undefined;
  byNumber: (number: string) => Task | undefined;
  /** Everything on one board, in the order the board should show it. */
  forBoard: (slug: string) => Task[];
  /** Raises a new task and returns it, so the caller can open it. */
  create: (input: NewTask) => Task;
  /** Moves a task and returns a function that puts it back. */
  setState: (id: string, state: TaskState) => () => void;
  toggleChecklistItem: (taskId: string, itemId: string) => void;
  addChecklistItem: (taskId: string, text: string) => void;
  addDeliverable: (taskId: string, deliverable: Omit<Deliverable, 'id'>) => void;
  removeDeliverable: (taskId: string, deliverableId: string) => void;
  addComment: (taskId: string, author: Person, body: string) => void;
  rename: (taskId: string, title: string) => void;
  setDue: (taskId: string, due: string | null) => void;
}

const TaskContext = createContext<TaskContextValue | null>(null);

/** Ordering within a board column and within a My Day group. */
const PRIORITY_RANK = { urgent: 0, high: 1, medium: 2, low: 3 } as const;

function compareTasks(a: Task, b: Task): number {
  const priority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (priority !== 0) return priority;
  if (a.due && b.due) return a.due.localeCompare(b.due);
  if (a.due) return -1;
  if (b.due) return 1;
  return a.number.localeCompare(b.number);
}

let sequence = 0;
function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${sequence}`;
}

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);

  /** Applies `patch` to one task and leaves the rest untouched. */
  const patch = useCallback((id: string, apply: (task: Task) => Task) => {
    setTasks((current) => current.map((task) => (task.id === id ? apply(task) : task)));
  }, []);

  const byId = useCallback((id: string) => tasks.find((t) => t.id === id), [tasks]);
  const byNumber = useCallback((n: string) => tasks.find((t) => t.number === n), [tasks]);

  const forBoard = useCallback(
    (slug: string) => tasks.filter((t) => t.boardSlug === slug).sort(compareTasks),
    [tasks],
  );

  /**
   * The next task number. Derived from what exists rather than from a counter,
   * so it stays right after an undo and after the seed changes.
   */
  const create = useCallback(
    (input: NewTask) => {
      const highest = tasks.reduce((max, task) => {
        const n = Number(task.number.replace('#', ''));
        return Number.isFinite(n) && n > max ? n : max;
      }, 0);

      const task: Task = {
        ...input,
        id: nextId('t'),
        number: `#${String(highest + 1).padStart(4, '0')}`,
        state: 'todo',
        labels: [],
        checklist: [],
        deliverables: [],
        comments: [],
        activity: [{ id: nextId('v'), text: 'created', at: new Date().toISOString() }],
        createdAt: new Date().toISOString().slice(0, 10),
      };

      setTasks((current) => [...current, task]);
      return task;
    },
    [tasks],
  );

  const setState = useCallback(
    (id: string, state: TaskState) => {
      const previous = tasks.find((t) => t.id === id)?.state;

      patch(id, (task) => ({
        ...task,
        state,
        activity: [
          { id: nextId('v'), text: `moved to ${STATE_LABELS[state]}`, at: new Date().toISOString() },
          ...task.activity,
        ],
      }));

      // The undo drops the activity entry the move added, so an undone move
      // leaves no trace — it did not happen.
      return () => {
        if (!previous) return;
        patch(id, (task) => ({ ...task, state: previous, activity: task.activity.slice(1) }));
      };
    },
    [patch, tasks],
  );

  const toggleChecklistItem = useCallback(
    (taskId: string, itemId: string) => {
      patch(taskId, (task) => ({
        ...task,
        checklist: task.checklist.map((item) =>
          item.id === itemId ? { ...item, done: !item.done } : item,
        ),
      }));
    },
    [patch],
  );

  const addChecklistItem = useCallback(
    (taskId: string, text: string) => {
      const item: ChecklistItem = { id: nextId('c'), text, done: false };
      patch(taskId, (task) => ({ ...task, checklist: [...task.checklist, item] }));
    },
    [patch],
  );

  const addDeliverable = useCallback(
    (taskId: string, deliverable: Omit<Deliverable, 'id'>) => {
      patch(taskId, (task) => ({
        ...task,
        deliverables: [...task.deliverables, { ...deliverable, id: nextId('d') }],
      }));
    },
    [patch],
  );

  const removeDeliverable = useCallback(
    (taskId: string, deliverableId: string) => {
      patch(taskId, (task) => ({
        ...task,
        deliverables: task.deliverables.filter((d) => d.id !== deliverableId),
      }));
    },
    [patch],
  );

  const addComment = useCallback(
    (taskId: string, author: Person, body: string) => {
      patch(taskId, (task) => ({
        ...task,
        comments: [
          ...task.comments,
          { id: nextId('m'), author, body, at: new Date().toISOString() },
        ],
      }));
    },
    [patch],
  );

  const rename = useCallback(
    (taskId: string, title: string) => patch(taskId, (task) => ({ ...task, title })),
    [patch],
  );

  const setDue = useCallback(
    (taskId: string, due: string | null) => patch(taskId, (task) => ({ ...task, due })),
    [patch],
  );

  const value = useMemo(
    () => ({
      tasks, byId, byNumber, forBoard, create, setState, toggleChecklistItem,
      addChecklistItem, addDeliverable, removeDeliverable, addComment, rename, setDue,
    }),
    [
      tasks, byId, byNumber, forBoard, create, setState, toggleChecklistItem,
      addChecklistItem, addDeliverable, removeDeliverable, addComment, rename, setDue,
    ],
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks(): TaskContextValue {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error('useTasks must be used within a TaskProvider');
  return ctx;
}
