import { useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useTasks } from '../../store/taskStore';
import { useIsDesktop } from '../../hooks/useBreakpoint';
import { useToast } from '../../hooks/useToast';
import { useOpenTask } from '../../hooks/useOpenTask';
import { BOARDS } from '../../lib/mockTasks';
import {
  BOARD_STATES, DOMAIN_LABELS, LEGAL_TRANSITIONS, STATE_LABELS, daysUntil,
  type Task, type TaskState,
} from '../../lib/tasks';
import { Chip } from '../../ui/primitives/Chip';
import { Tag } from '../../ui/primitives/Tag';
import { Card, EmptyState, SearchBar } from '../../ui/patterns';
import { StickerClipboard } from '../../ui/stickers';
import { StateSheet } from '../my-day/StateSheet';
import { BoardKanban } from './BoardKanban';
import { BoardList } from './BoardList';
import './Board.css';

/** The filter chips above the columns. `all` is the resting state. */
const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'mine', label: 'Committee' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'urgent', label: 'Urgent' },
] as const;

type FilterId = (typeof FILTERS)[number]['id'];

/**
 * §9.7 — the board, at `/board/:slug`.
 *
 * This is responsive fork #2 (§8): a real Kanban on desktop with drag and drop,
 * and a grouped vertical list on mobile whose state changes go through a bottom
 * sheet. They are separate components, not one squashed layout — but both are
 * driven from the header and handlers here, so neither can drift out of parity.
 */
export function Board() {
  const { slug } = useParams<{ slug: string }>();
  const { forBoard, setState } = useTasks();
  const isDesktop = useIsDesktop();
  const toast = useToast();
  const openTask = useOpenTask();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterId>('all');
  const [sheetTask, setSheetTask] = useState<Task | null>(null);
  /** Cards that just moved, so they can flash once (§9.7). */
  const [flashed, setFlashed] = useState<string[]>([]);

  const board = BOARDS.find((b) => b.slug === slug);
  const tasks = forBoard(slug ?? '');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return tasks.filter((task) => {
      if (needle && !`${task.title} ${task.number}`.toLowerCase().includes(needle)) return false;

      if (filter === 'mine') return Boolean(task.committee);
      if (filter === 'urgent') return task.priority === 'urgent';
      if (filter === 'overdue') {
        return Boolean(task.due) && daysUntil(task.due!) < 0 && task.state !== 'done';
      }
      return true;
    });
  }, [tasks, query, filter]);

  const byState = useMemo(() => {
    const map = {} as Record<TaskState, Task[]>;
    for (const state of BOARD_STATES) map[state] = [];
    for (const task of visible) map[task.state]?.push(task);
    return map;
  }, [visible]);

  // BLOCKED appears only when occupied (§9.7).
  const columns = BOARD_STATES.filter(
    (state) => state !== 'blocked' || byState.blocked.length > 0,
  );

  if (!slug) return <Navigate to={`/board/${BOARDS[0].slug}`} replace />;
  if (!board) return <Navigate to="/404" replace />;

  function move(task: Task, next: TaskState) {
    if (!LEGAL_TRANSITIONS[task.state].includes(next)) return;

    const undo = setState(task.id, next);
    setFlashed((current) => [...current, task.id]);
    window.setTimeout(() => {
      setFlashed((current) => current.filter((id) => id !== task.id));
    }, 400);

    toast.show(`${task.number} moved to ${STATE_LABELS[next]}`, {
      tone: 'success',
      action: { label: 'Undo', onAction: undo },
    });
  }

  const shared = {
    byState,
    columns,
    flashed,
    onOpen: openTask,
  };

  return (
    <div className="board">
      <header className="board__head">
        <div className="board__title-row">
          <h2 className="display-2 board__title">{board.name}</h2>
          <Tag channel={board.domain}>{DOMAIN_LABELS[board.domain]}</Tag>
          <span className="board__members micro">{board.members} members</span>
        </div>

        {/* The 4px underline in the domain channel colour (§9.7). */}
        <span
          className="board__rule"
          style={{ background: `var(--dom-${board.domain})` }}
          aria-hidden="true"
        />

        <div className="board__controls">
          <SearchBar
            className="board__search"
            label={`Search ${board.name}`}
            value={query}
            onChange={setQuery}
          />

          <div className="board__filters no-scrollbar" role="group" aria-label="Filter tasks">
            {FILTERS.map((option) => (
              <Chip
                key={option.id}
                variant="toggle"
                tone="ink"
                selected={filter === option.id}
                onClick={() => setFilter(option.id)}
              >
                {option.label}
              </Chip>
            ))}
          </div>
        </div>
      </header>

      {visible.length === 0 ? (
        <Card className="board__empty">
          <EmptyState
            sticker={<StickerClipboard size="empty" />}
            title={query || filter !== 'all' ? 'Nothing matches' : 'No active tasks'}
            line={
              query || filter !== 'all'
                ? 'try a different filter, or clear the search'
                : 'nothing has been assigned to this board yet'
            }
          />
        </Card>
      ) : isDesktop ? (
        <BoardKanban {...shared} onMove={move} />
      ) : (
        <BoardList {...shared} onChangeState={setSheetTask} />
      )}

      <StateSheet
        task={sheetTask}
        onClose={() => setSheetTask(null)}
        onPick={(task, next) => {
          setSheetTask(null);
          move(task, next);
        }}
      />
    </div>
  );
}
