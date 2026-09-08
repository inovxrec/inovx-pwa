import { createContext, useContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { detectProvider, type LinkProvider } from '../lib/linkProvider';
import { adaptTaskRow, type TaskRow } from '../lib/adaptTask';
import { useToast } from '../components/Toast';

export type Domain = 'technical' | 'management' | 'events' | 'media' | 'design' | 'core';
export type TaskStatus = 'todo' | 'progress' | 'review' | 'done' | 'blocked' | 'proposed' | 'cancelled';
export type Priority = 'urgent' | 'high' | 'medium' | 'low';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Assignee {
  name: string;
  initials: string;
}

export interface TaskLink {
  id: string;
  url: string;
  label?: string;
  provider: LinkProvider;
}

export interface Task {
  id: string;
  taskNumber: string;
  title: string;
  description: string;
  domain: Domain;
  status: TaskStatus;
  priority: Priority;
  assignee: Assignee;
  dueLabel: string;
  isOverdue?: boolean;
  isBlocked?: boolean;
  blockedReason?: string;
  committee?: string;
  tags?: string[];
  links?: TaskLink[];
  checklist: ChecklistItem[];
  activityLogs: string[];
  createdAt: string;
}

export interface Occasion {
  id: string;
  name: string;
  avatarText: string;
}

export const DOMAIN_COLORS: Record<Domain, string> = {
  technical: 'var(--chan-technical)',
  management: 'var(--chan-management)',
  events: 'var(--chan-events)',
  media: 'var(--chan-media)',
  design: 'var(--chan-design)',
  core: 'var(--chan-core)',
};

export const DOMAIN_LABELS: Record<Domain, string> = {
  technical: 'Technical',
  management: 'Management',
  events: 'Events',
  media: 'Media',
  design: 'Design',
  core: 'Core Ops',
};

// TEMP: mock seed data merged from the Board prototype and the deck prototypes.
// Swap for a real fetch via lib/api.ts once the backend endpoint exists — keep
// the Task shape the same so screens barely have to change.
const INITIAL_TASKS: Task[] = [
  {
    id: 't-0117', taskNumber: '#0117',
    title: 'Confirm auditorium booking and get written approval',
    description: 'Coordinate with Campus Admin for the main-stage auditorium reservation. Requires a formal signature and stamped requisition slip.',
    domain: 'events', status: 'blocked', priority: 'urgent',
    assignee: { name: 'Karan M.', initials: 'KM' },
    dueLabel: 'OVERDUE 3D · 19 AUG', isOverdue: true, isBlocked: true,
    blockedReason: "Admin office pending Dean's stamp", committee: 'TECHFEST',
    checklist: [
      { id: 'c1', text: 'Submit requisition form', completed: true },
      { id: 'c2', text: 'Get Dean endorsement', completed: true },
      { id: 'c3', text: 'Receive written confirmation & stamp', completed: false },
    ],
    activityLogs: ['19 Aug 10:00 — Flagged as BLOCKED: Admin office pending Dean stamp', '18 Aug 16:30 — Dean endorsement acquired'],
    createdAt: '2026-08-15',
  },
  {
    id: 't-0142', taskNumber: '#0142',
    title: 'Birthday poster — Ananya Rao',
    description: 'Design a phosphor-styled birthday card for the People page and the announcement feed.',
    domain: 'design', status: 'progress', priority: 'medium',
    assignee: { name: 'Ananya R.', initials: 'AR' },
    dueLabel: 'DUE TODAY', committee: 'OCCASION', tags: ['OCCASION'],
    checklist: [
      { id: 'c4', text: 'Pull photo from directory', completed: true },
      { id: 'c5', text: 'Draft layout', completed: false },
      { id: 'c6', text: 'Get review from lead', completed: false },
    ],
    activityLogs: ['28 Aug 09:00 — Task spawned automatically by Occasion Engine', '28 Aug 11:15 — Directory photo asset attached'],
    createdAt: '2026-08-20',
  },
  {
    id: 't-0188', taskNumber: '#0188',
    title: 'Techfest key visual — v2',
    description: 'Incorporate typography revisions and render 4K variants for the print banner and Instagram story formats.',
    domain: 'design', status: 'review', priority: 'high',
    assignee: { name: 'Isha S.', initials: 'IS' },
    dueLabel: 'SUBMITTED 20 AUG', committee: 'TECHFEST',
    checklist: [
      { id: 'c7', text: 'Revise grid typography', completed: true },
      { id: 'c8', text: 'Export 9:16 reels canvas', completed: true },
      { id: 'c9', text: 'Export 300dpi print poster', completed: true },
    ],
    activityLogs: ['20 Aug 18:20 — Submitted for review by Isha S.'],
    createdAt: '2026-08-10',
  },
  {
    id: 't-0201', taskNumber: '#0201',
    title: 'Redesign the People page avatar grid',
    description: 'Implement dynamic domain-accented borders and a monospace initials grid with fallback avatars.',
    domain: 'technical', status: 'todo', priority: 'medium',
    assignee: { name: 'Mayank K.', initials: 'MK' },
    dueLabel: 'DUE 30 AUG',
    checklist: [
      { id: 'c10', text: 'Wireframe responsive CSS grid', completed: false },
      { id: 'c11', text: 'Implement domain color mapping', completed: false },
    ],
    activityLogs: ['24 Aug 14:00 — Task created by Lead'],
    createdAt: '2026-08-24',
  },
  {
    id: 't-0203', taskNumber: '#0203',
    title: 'Onam poster set',
    description: 'Create multi-language celebratory banners for the club social media handles.',
    domain: 'design', status: 'todo', priority: 'medium',
    assignee: { name: 'Rahul L.', initials: 'RL' },
    dueLabel: 'DUE 02 SEP', committee: 'OCCASION', tags: ['OCCASION'],
    checklist: [{ id: 'c12', text: 'Select color palette and vector motifs', completed: false }],
    activityLogs: ['25 Aug 10:00 — Scheduled via Occasion Engine'],
    createdAt: '2026-08-25',
  },
  {
    id: 't-0150', taskNumber: '#0150',
    title: 'Orientation banner',
    description: 'Main atrium backdrop for fresher welcome week.',
    domain: 'design', status: 'done', priority: 'high',
    assignee: { name: 'Mayank K.', initials: 'MK' },
    dueLabel: '25 AUG',
    checklist: [{ id: 'c14', text: 'Finalize vector graphic', completed: true }],
    activityLogs: ['25 Aug 17:00 — Marked as DONE by Mayank K.'],
    createdAt: '2026-08-18',
  },
  {
    id: 't-0301', taskNumber: '#0301',
    title: 'Reel for orientation week',
    description: 'Fast-paced club intro reel showcasing hackathon wins, workshops, and the recruitment timeline.',
    domain: 'media', status: 'proposed', priority: 'high',
    assignee: { name: 'Sanya D.', initials: 'SD' },
    dueLabel: 'WAITING 4D',
    checklist: [{ id: 'c16', text: 'Compile archive footage', completed: true }],
    activityLogs: ['24 Aug 11:00 — Proposed by Media team'],
    createdAt: '2026-08-24',
  },
  {
    id: 't-0302', taskNumber: '#0302',
    title: 'Sponsorship tier brochure update',
    description: 'Update the sponsor deliverables table and footfall stats for Techfest sponsor pitching.',
    domain: 'management', status: 'proposed', priority: 'high',
    assignee: { name: 'Tanya P.', initials: 'TP' },
    dueLabel: 'WAITING 2D',
    checklist: [{ id: 'c18', text: 'Verify alumni sponsor packages', completed: true }],
    activityLogs: ['26 Aug 15:30 — Proposed by Management team'],
    createdAt: '2026-08-26',
  },
  {
    id: 't-0088', taskNumber: '#0088',
    title: 'Setup container cluster for hackathon CI/CD',
    description: 'Configure autoscaling runners on the campus server node to run sandboxed code evaluation for the 36-hour hackathon.',
    domain: 'technical', status: 'todo', priority: 'urgent',
    assignee: { name: 'Alex Rivera', initials: 'AR' },
    dueLabel: 'DUE 01 SEP', tags: ['DOCKER', 'INFRA'],
    checklist: [
      { id: 'c20', text: 'Isolate network namespaces for sandboxes', completed: false },
      { id: 'c21', text: 'Test load with 500 concurrent evaluations', completed: false },
    ],
    activityLogs: ['22 Aug 09:00 — Task created'],
    createdAt: '2026-08-22',
  },
];

const INITIAL_OCCASIONS: Occasion[] = [
  { id: 'occ-1', name: 'Ananya Rao — birthday tomorrow, 04 Sep', avatarText: '🎂' },
  { id: 'occ-2', name: 'Techfest 2026 — 06 Sep', avatarText: '🚀' },
  { id: 'occ-3', name: 'Founding Day — 14 Sep', avatarText: '🏛' },
];

const ALL_DOMAINS: Domain[] = ['technical', 'management', 'events', 'media', 'design', 'core'];

// Read-path-only feature flag. When true, `tasks` is populated from Supabase
// (read policy is open) instead of INITIAL_TASKS, and every mutator below
// attempts a real write and surfaces a toast on failure instead of silently
// no-opping. Writes are expected to fail today — tasks' RLS write policy is
// `USING (FALSE)` for everyone until Stream B lands real policies.
const USE_LIVE_TASKS = import.meta.env.VITE_FEATURE_LIVE_TASKS === 'true';

// No domain-selection/tenure-selection UI exists yet (that's tied to real
// auth, which is blocked). Resolving "the current tenure" via the one row
// flagged `is_active = true` is a guess standing in for that — flagged here
// and in the handoff notes.
const FALLBACK_DOMAIN: Domain = 'core';

interface LiveTaskRow extends TaskRow {
  domains: { slug: string } | null;
  task_assignees: { user_id: string; is_primary: boolean; users: { name: string; initials: string | null } | null }[];
  task_links: { id: string; url: string; title: string }[];
}

const TASK_SELECT =
  '*, domains(slug), task_assignees(user_id, is_primary, users(name, initials)), task_links(id, url, title)';

async function fetchLiveTasks(tenureId: string): Promise<Task[]> {
  const [{ data: committeeRows, error: committeeErr }, { data: taskRows, error: taskErr }] = await Promise.all([
    supabase.from('committees').select('id, name').eq('tenure_id', tenureId),
    supabase.from('tasks').select(TASK_SELECT).eq('tenure_id', tenureId).returns<LiveTaskRow[]>(),
  ]);
  if (committeeErr) throw committeeErr;
  if (taskErr) throw taskErr;

  const committeeNameById = new Map((committeeRows ?? []).map((c) => [c.id as string, c.name as string]));

  return (taskRows ?? []).map((row) => {
    const domain = (row.domains?.slug as Domain | undefined) ?? FALLBACK_DOMAIN;
    const committee = row.context_type === 'committee' ? committeeNameById.get(row.context_id) : undefined;

    const assignees: Assignee[] = [...row.task_assignees]
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
      .map((a) => ({ name: a.users?.name ?? 'Unknown', initials: a.users?.initials ?? '—' }));

    const links: TaskLink[] = row.task_links.map((l) => ({
      id: l.id,
      url: l.url,
      label: l.title,
      provider: detectProvider(l.url).provider,
    }));

    return adaptTaskRow(row, domain, committee, assignees, links);
  });
}

interface TaskContextValue {
  tasks: Task[];
  occasions: Occasion[];
  overdueTasks: Task[];
  dueTodayTasks: Task[];
  awaitingReviewTasks: Task[];
  proposedTasks: Task[];
  domainMetrics: { domain: Domain; label: string; completionRate: number; overdueCount: number; statusText: string }[];
  kpis: { openTasks: number; overdueTasks: number; awaitingApproval: number; weeklyCompletionRate: number };
  columns: Record<'todo' | 'progress' | 'review' | 'done', Task[]>;
  /** True only when USE_LIVE_TASKS is on and the initial live fetch hasn't resolved yet. Always false in mock mode. */
  tasksLoading: boolean;
  /** Set when the initial live fetch or a Realtime refresh fails. Always null in mock mode. */
  tasksError: string | null;
  getTask: (id: string) => Task | undefined;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  submitForReview: (taskId: string) => void;
  approveTask: (taskId: string) => void;
  rejectTask: (taskId: string, reason?: string) => void;
  /** FR-TASK-7 — sends a task back from review to progress with a required reason. Status becomes 'progress', never 'todo' or 'rejected'; user-facing wording is always "changes requested". */
  requestChanges: (taskId: string, reason: string) => void;
  deleteTask: (taskId: string) => void;
  toggleChecklistItem: (taskId: string, itemId: string) => void;
  addChecklistItem: (taskId: string, text: string) => void;
  /** FR-LINK-2 — attaches a deliverable link to a task; provider is auto-detected from the URL. */
  addLink: (taskId: string, url: string, label?: string) => void;
}

const TaskContext = createContext<TaskContextValue | null>(null);

/**
 * Wraps the authed part of the app once. Any feature screen calls useTasks()
 * to read/mutate the shared task list — no prop drilling between My Day,
 * Board, Task Detail, Command Deck and Oversight Deck.
 */
export function TaskProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>(USE_LIVE_TASKS ? [] : INITIAL_TASKS);
  const [tasksLoading, setTasksLoading] = useState(USE_LIVE_TASKS);
  const [tasksError, setTasksError] = useState<string | null>(null);
  // task_checklist/task_links both have a NOT NULL tenure_id column with no
  // default — inserts into them need it, so it's tracked here once resolved.
  const [liveTenureId, setLiveTenureId] = useState<string | null>(null);

  // Live fetch + Realtime subscription. No-op entirely when USE_LIVE_TASKS is
  // false — the mock branch below is untouched by any of this.
  useEffect(() => {
    if (!USE_LIVE_TASKS) return;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function init() {
      setTasksLoading(true);
      setTasksError(null);
      try {
        const { data: tenureRow, error: tenureErr } = await supabase
          .from('tenures')
          .select('id')
          .eq('is_active', true)
          .single();
        if (tenureErr || !tenureRow) throw tenureErr ?? new Error('No active tenure found');
        const tenureId = tenureRow.id as string;

        const live = await fetchLiveTasks(tenureId);
        if (cancelled) return;
        setTasks(live);
        setTasksLoading(false);
        setLiveTenureId(tenureId);

        channel = supabase
          .channel(`tasks-tenure-${tenureId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'tasks', filter: `tenure_id=eq.${tenureId}` },
            () => {
              // Simplest-correct approach: any change re-fetches the full
              // joined set rather than patching one row in place, since a
              // bare `tasks` row payload doesn't carry its assignees/links.
              void fetchLiveTasks(tenureId).then((refreshed) => {
                if (!cancelled) setTasks(refreshed);
              });
            }
          )
          .subscribe();
      } catch (err) {
        if (!cancelled) {
          // Supabase's PostgrestError is a plain object, not `instanceof
          // Error` — check for a `.message` string on either shape so the
          // real reason (e.g. a PGRST205 "table not found") reaches the UI
          // instead of a generic fallback.
          const message =
            typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string'
              ? err.message
              : 'Failed to load live tasks';
          setTasksError(message);
          setTasksLoading(false);
        }
      }
    }

    void init();
    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  // Shared write-guard for the live path: attempt the real Supabase write,
  // and if (as expected today) RLS rejects it, surface a clear toast rather
  // than silently no-op-ing or leaving local state out of sync with the
  // server. No local mutation happens here on either outcome — a successful
  // write is picked up by the Realtime subscription above, same as any
  // other client's write would be.
  const attemptLiveWrite = useCallback(
    async (label: string, run: () => PromiseLike<{ error: { message: string } | null }>) => {
      const { error } = await run();
      if (error) {
        toast(`SAVE FAILED — ${label}: ${error.message}`);
      }
    },
    [toast]
  );

  const logAndUpdate = useCallback((taskId: string, patch: Partial<Task>, logMsg?: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, ...patch, activityLogs: logMsg ? [logMsg, ...t.activityLogs] : t.activityLogs }
          : t
      )
    );
  }, []);

  const updateTaskStatus = useCallback(
    (taskId: string, status: TaskStatus) => {
      if (USE_LIVE_TASKS) {
        // Cast: frontend TaskStatus includes 'cancelled', which the DB CHECK
        // constraint (and generated types) don't accept yet — see
        // lib/taskTransitions.ts. The write is expected to fail on RLS
        // regardless; this cast just lets us attempt it instead of the
        // generated type statically forbidding the attempt.
        void attemptLiveWrite(`status → ${status.toUpperCase()}`, () =>
          supabase.from('tasks').update({ status } as never).eq('id', taskId)
        );
        return;
      }
      logAndUpdate(taskId, { status }, `Status changed to ${status.toUpperCase()}`);
    },
    [attemptLiveWrite, logAndUpdate]
  );
  const submitForReview = useCallback((taskId: string) => updateTaskStatus(taskId, 'review'), [updateTaskStatus]);
  const approveTask = useCallback((taskId: string) => updateTaskStatus(taskId, 'done'), [updateTaskStatus]);
  const rejectTask = useCallback(
    (taskId: string, reason?: string) => {
      if (USE_LIVE_TASKS) {
        void attemptLiveWrite('return proposal', () => supabase.from('tasks').update({ status: 'todo' }).eq('id', taskId));
        return;
      }
      logAndUpdate(taskId, { status: 'todo' }, `RETURNED: ${reason || 'Needs revision'}`);
    },
    [attemptLiveWrite, logAndUpdate]
  );
  const requestChanges = useCallback(
    (taskId: string, reason: string) => {
      if (USE_LIVE_TASKS) {
        void attemptLiveWrite('request changes', () =>
          supabase.from('tasks').update({ status: 'progress' }).eq('id', taskId)
        );
        return;
      }
      logAndUpdate(taskId, { status: 'progress' }, `CHANGES REQUESTED: ${reason}`);
    },
    [attemptLiveWrite, logAndUpdate]
  );
  const deleteTask = useCallback(
    (taskId: string) => {
      if (USE_LIVE_TASKS) {
        void attemptLiveWrite('delete task', () => supabase.from('tasks').delete().eq('id', taskId));
        return;
      }
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    },
    [attemptLiveWrite]
  );

  const toggleChecklistItem = useCallback(
    (taskId: string, itemId: string) => {
      if (USE_LIVE_TASKS) {
        void attemptLiveWrite('toggle checklist item', () =>
          supabase.from('task_checklist').update({ completed: true }).eq('id', itemId)
        );
        return;
      }
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, checklist: t.checklist.map((c) => (c.id === itemId ? { ...c, completed: !c.completed } : c)) }
            : t
        )
      );
    },
    [attemptLiveWrite]
  );

  const addChecklistItem = useCallback(
    (taskId: string, text: string) => {
      if (!text.trim()) return;
      if (USE_LIVE_TASKS) {
        if (!liveTenureId) {
          toast('SAVE FAILED — add checklist item: tenure not resolved yet');
          return;
        }
        void attemptLiveWrite('add checklist item', () =>
          supabase.from('task_checklist').insert({ tenure_id: liveTenureId, task_id: taskId, text: text.trim() })
        );
        return;
      }
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, checklist: [...t.checklist, { id: `c_${Date.now().toString().slice(-5)}`, text: text.trim(), completed: false }] }
            : t
        )
      );
    },
    [attemptLiveWrite, liveTenureId, toast]
  );

  const addLink = useCallback(
    (taskId: string, url: string, label?: string) => {
      const trimmedUrl = url.trim();
      if (!trimmedUrl) return;
      if (USE_LIVE_TASKS) {
        if (!liveTenureId) {
          toast('SAVE FAILED — add link: tenure not resolved yet');
          return;
        }
        void attemptLiveWrite('add link', () =>
          supabase
            .from('task_links')
            .insert({ tenure_id: liveTenureId, task_id: taskId, url: trimmedUrl, title: label?.trim() || trimmedUrl })
        );
        return;
      }
      const { provider } = detectProvider(trimmedUrl);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                links: [
                  ...(t.links ?? []),
                  { id: `lnk_${Date.now().toString().slice(-6)}`, url: trimmedUrl, label: label?.trim() || undefined, provider },
                ],
              }
            : t
        )
      );
    },
    [attemptLiveWrite, liveTenureId, toast]
  );

  const getTask = useCallback((id: string) => tasks.find((t) => t.id === id), [tasks]);

  const overdueTasks = useMemo(() => tasks.filter((t) => t.isOverdue || t.status === 'blocked'), [tasks]);
  const dueTodayTasks = useMemo(() => tasks.filter((t) => t.dueLabel.includes('TODAY') || t.status === 'progress'), [tasks]);
  const awaitingReviewTasks = useMemo(() => tasks.filter((t) => t.status === 'review'), [tasks]);
  const proposedTasks = useMemo(() => tasks.filter((t) => t.status === 'proposed'), [tasks]);

  const columns = useMemo(
    () => ({
      todo: tasks.filter((t) => t.status === 'todo' || t.status === 'proposed'),
      progress: tasks.filter((t) => t.status === 'progress'),
      review: tasks.filter((t) => t.status === 'review'),
      done: tasks.filter((t) => t.status === 'done'),
    }),
    [tasks]
  );

  const domainMetrics = useMemo(
    () =>
      ALL_DOMAINS.map((domain) => {
        const dTasks = tasks.filter((t) => t.domain === domain);
        const total = dTasks.length;
        const done = dTasks.filter((t) => t.status === 'done').length;
        const overdueCount = dTasks.filter((t) => t.isOverdue || t.status === 'blocked').length;
        const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
        return {
          domain,
          label: DOMAIN_LABELS[domain],
          completionRate,
          overdueCount,
          statusText: overdueCount > 0 ? `${overdueCount} overdue` : `${completionRate}%`,
        };
      }),
    [tasks]
  );

  const kpis = useMemo(
    () => ({
      openTasks: tasks.filter((t) => t.status !== 'done').length,
      overdueTasks: overdueTasks.length,
      awaitingApproval: proposedTasks.length,
      weeklyCompletionRate:
        tasks.length > 0 ? Math.round((tasks.filter((t) => t.status === 'done').length / tasks.length) * 100) : 0,
    }),
    [tasks, overdueTasks, proposedTasks]
  );

  const value: TaskContextValue = {
    tasks,
    occasions: INITIAL_OCCASIONS,
    overdueTasks,
    dueTodayTasks,
    awaitingReviewTasks,
    proposedTasks,
    domainMetrics,
    kpis,
    columns,
    tasksLoading,
    tasksError,
    getTask,
    updateTaskStatus,
    submitForReview,
    approveTask,
    rejectTask,
    requestChanges,
    deleteTask,
    toggleChecklistItem,
    addChecklistItem,
    addLink,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks(): TaskContextValue {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error('useTasks must be used within a TaskProvider');
  return ctx;
}
