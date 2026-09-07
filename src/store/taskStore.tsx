import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import { describeError, isConfigured } from '../lib/supabase';
import {
  deleteTaskLink, domainIdBySlug, fetchTasks, insertChecklistItem, insertComment, insertTask,
  setChecklistItem, updateTask, updateTaskStatus,
} from '../lib/db/queries';
import type { TaskContext as MapContext } from '../lib/db/map';
import { STATE_LABELS, type Domain, type Person, type Task, type TaskState } from '../lib/tasks';
import { useAuth } from './authStore';
import { useClub } from './ClubProvider';

/**
 * The task layer every screen reads.
 *
 * Reads come from Supabase; writes go there first and the local copy follows,
 * so a failed write cannot leave the screen claiming something happened. The
 * one exception is a status change, which is applied locally first because
 * §9.4's swipe needs the row to move before any round trip — it is put back if
 * the write is refused.
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
  loading: boolean;
  /** Non-empty when the board could not be read. Not the same as "no tasks". */
  error: string;
  byId: (id: string) => Task | undefined;
  byNumber: (number: string) => Task | undefined;
  forBoard: (slug: string) => Task[];
  create: (input: NewTask) => Promise<Task | null>;
  /** Moves a task and returns a function that puts it back. */
  setState: (id: string, state: TaskState) => () => void;
  toggleChecklistItem: (taskId: string, itemId: string) => void;
  addChecklistItem: (taskId: string, text: string) => void;
  removeDeliverable: (taskId: string, deliverableId: string) => void;
  addComment: (taskId: string, author: Person, body: string) => void;
  rename: (taskId: string, title: string) => void;
  setDue: (taskId: string, due: string | null) => void;
  reload: () => Promise<void>;
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

export function TaskProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { tenureId, domains, committees, loading: clubLoading } = useClub();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /** Ids the mappers need to turn a task's context into a board. */
  const mapContext = useMemo<MapContext>(() => {
    const domainMap = new Map(domains.map((row) => [row.id, { slug: row.slug, name: row.name }]));
    const committeeMap = new Map(committees.map((c) => [c.id, c.name]));
    return { domains: domainMap, committees: committeeMap };
  }, [domains, committees]);

  const load = useCallback(async () => {
    if (!isConfigured || !tenureId) return;

    setLoading(true);
    setError('');

    try {
      setTasks(await fetchTasks(tenureId, mapContext));
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setLoading(false);
    }
  }, [tenureId, mapContext]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = useCallback((id: string, apply: (task: Task) => Task) => {
    setTasks((current) => current.map((task) => (task.id === id ? apply(task) : task)));
  }, []);

  const byId = useCallback((id: string) => tasks.find((t) => t.id === id), [tasks]);
  const byNumber = useCallback((n: string) => tasks.find((t) => t.number === n), [tasks]);

  const forBoard = useCallback(
    (slug: string) => tasks.filter((t) => t.boardSlug === slug).sort(compareTasks),
    [tasks],
  );

  const create = useCallback(
    async (input: NewTask) => {
      if (!tenureId) return null;

      const committee = input.committee
        ? committees.find((c) => c.name === input.committee)
        : undefined;
      const domainId = domainIdBySlug(domains, input.domain);

      try {
        const task = await insertTask(
          {
            tenureId,
            title: input.title,
            description: input.description,
            contextType: committee ? 'committee' : 'domain',
            contextId: committee?.id ?? domainId ?? '',
            domainId,
            priority: input.priority,
            due: input.due,
            assigneeIds: input.assignees.map((p) => p.id),
            createdBy: session?.userId ?? null,
          },
          mapContext,
        );

        setTasks((current) => [task, ...current]);
        return task;
      } catch (caught) {
        setError(describeError(caught));
        return null;
      }
    },
    [tenureId, committees, domains, session, mapContext],
  );

  const setState = useCallback(
    (id: string, state: TaskState) => {
      const previous = tasks.find((t) => t.id === id)?.state;

      // Local first — the swipe has to move the row now, not after a round trip.
      patch(id, (task) => ({
        ...task,
        state,
        activity: [
          { id: `local-${Date.now()}`, text: `moved to ${STATE_LABELS[state]}`, at: new Date().toISOString() },
          ...task.activity,
        ],
      }));

      void updateTaskStatus(id, state).catch((caught) => {
        // Refused: put it back rather than leave the screen telling a lie.
        setError(describeError(caught));
        if (previous) patch(id, (task) => ({ ...task, state: previous, activity: task.activity.slice(1) }));
      });

      return () => {
        if (!previous) return;
        patch(id, (task) => ({ ...task, state: previous, activity: task.activity.slice(1) }));
        void updateTaskStatus(id, previous).catch(() => undefined);
      };
    },
    [patch, tasks],
  );

  const toggleChecklistItem = useCallback(
    (taskId: string, itemId: string) => {
      const done = !tasks
        .find((t) => t.id === taskId)
        ?.checklist.find((item) => item.id === itemId)?.done;

      patch(taskId, (task) => ({
        ...task,
        checklist: task.checklist.map((item) =>
          item.id === itemId ? { ...item, done } : item,
        ),
      }));

      void setChecklistItem(itemId, done).catch((caught) => setError(describeError(caught)));
    },
    [patch, tasks],
  );

  const addChecklistItem = useCallback(
    (taskId: string, text: string) => {
      if (!tenureId) return;
      const position = tasks.find((t) => t.id === taskId)?.checklist.length ?? 0;

      void insertChecklistItem(tenureId, taskId, text, position)
        .then(load)
        .catch((caught) => setError(describeError(caught)));
    },
    [tenureId, tasks, load],
  );

  const removeDeliverable = useCallback(
    (taskId: string, deliverableId: string) => {
      patch(taskId, (task) => ({
        ...task,
        deliverables: task.deliverables.filter((d) => d.id !== deliverableId),
      }));
      void deleteTaskLink(deliverableId).catch((caught) => setError(describeError(caught)));
    },
    [patch],
  );

  const addComment = useCallback(
    (taskId: string, author: Person, body: string) => {
      if (!tenureId) return;
      void insertComment(tenureId, taskId, author.id, body)
        .then(load)
        .catch((caught) => setError(describeError(caught)));
    },
    [tenureId, load],
  );

  const rename = useCallback(
    (taskId: string, title: string) => {
      patch(taskId, (task) => ({ ...task, title }));
      void updateTask(taskId, { title }).catch((caught) => setError(describeError(caught)));
    },
    [patch],
  );

  const setDue = useCallback(
    (taskId: string, due: string | null) => {
      patch(taskId, (task) => ({ ...task, due }));
      void updateTask(taskId, { due_date: due ? `${due}T00:00:00Z` : null })
        .catch((caught) => setError(describeError(caught)));
    },
    [patch],
  );

  const value = useMemo(
    () => ({
      tasks,
      loading: loading || clubLoading,
      error,
      byId, byNumber, forBoard, create, setState, toggleChecklistItem, addChecklistItem,
      removeDeliverable, addComment, rename, setDue, reload: load,
    }),
    [
      tasks, loading, clubLoading, error, byId, byNumber, forBoard, create, setState,
      toggleChecklistItem, addChecklistItem, removeDeliverable, addComment, rename, setDue, load,
    ],
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks(): TaskContextValue {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error('useTasks must be used within a TaskProvider');
  return ctx;
}
