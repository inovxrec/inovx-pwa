import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTasks } from '../../store/taskStore';
import { useCommittees } from '../../store/committeeStore';
import { useIsDesktop } from '../../hooks/useBreakpoint';
import { useToast } from '../../hooks/useToast';
import { TASK_PARAM, useOpenTask } from '../../hooks/useOpenTask';
import { usePermissionCheck } from '../../hooks/usePermission';
import { useAssignment } from '../../hooks/useAssignment';
import { useBoards } from '../../store/ClubProvider';
import {
  BOARD_STATES, DOMAIN_LABELS, LEGAL_TRANSITIONS, STATE_LABELS, daysUntil,
  type Domain, type Task, type TaskState,
} from '../../lib/tasks';
import { Button } from '../../ui/primitives/Button';
import { Chip } from '../../ui/primitives/Chip';
import { Select } from '../../ui/primitives/Select';
import { Tag } from '../../ui/primitives/Tag';
import { AvatarStack } from '../../ui/primitives/AvatarStack';
import { Card, EmptyState, SearchBar } from '../../ui/patterns';
import { StickerClipboard } from '../../ui/stickers';
import { StateSheet } from '../my-day/StateSheet';
import { BoardKanban } from './BoardKanban';
import { BoardList } from './BoardList';
import { NewCommittee } from './NewCommittee';
import { NewTask } from './NewTask';
import './Board.css';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'committee', label: 'Committee' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'urgent', label: 'Urgent' },
] as const;

type FilterId = (typeof FILTERS)[number]['id'];

/**
 * §9.7 — the board, at `/board/:slug` and `/committee/:id`.
 *
 * `/board/all` is the default and shows the whole club's work; a domain board
 * narrows it to one domain, and a committee board to that committee. Only the
 * header differs — all three scopes share the Kanban on desktop and the grouped
 * list on mobile (fork #2, §8).
 */
export function Board() {
  const { slug, id } = useParams<{ slug?: string; id?: string }>();
  const { tasks: allTasks, setState } = useTasks();
  const { committees, byId } = useCommittees();
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();
  const openTask = useOpenTask();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const can = usePermissionCheck();
  const { canCreate } = useAssignment();
  const boards = useBoards();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterId>('all');
  const [sheetTask, setSheetTask] = useState<Task | null>(null);
  const [flashed, setFlashed] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [raising, setRaising] = useState(false);

  const committee = id ? byId(id) : undefined;
  const domainBoard = slug && slug !== 'all' ? boards.find((b) => b.slug === slug) : undefined;
  const domain: Domain | undefined = domainBoard?.domain;

  const scoped = useMemo(() => {
    if (committee) {
      const name = committee.name.toLowerCase();
      return allTasks.filter((task) => task.committee?.toLowerCase() === name);
    }
    if (domain) return allTasks.filter((task) => task.domain === domain);
    return allTasks;
  }, [allTasks, committee, domain]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return scoped.filter((task) => {
      if (needle && !`${task.title} ${task.number}`.toLowerCase().includes(needle)) return false;
      if (filter === 'committee') return Boolean(task.committee);
      if (filter === 'urgent') return task.priority === 'urgent';
      if (filter === 'overdue') {
        return Boolean(task.due) && daysUntil(task.due!) < 0 && task.state !== 'done';
      }
      return true;
    });
  }, [scoped, query, filter]);

  const byState = useMemo(() => {
    const map = {} as Record<TaskState, Task[]>;
    for (const state of BOARD_STATES) map[state] = [];
    for (const task of visible) map[task.state]?.push(task);
    return map;
  }, [visible]);

  const columns = BOARD_STATES.filter(
    (state) => state !== 'blocked' || byState.blocked.length > 0,
  );

  /** Every board the switcher offers, grouped so committees read as their own. */
  const options = useMemo(
    () => [
      { value: '/board/all', label: 'All boards', group: 'Club' },
      ...boards.map((board) => ({
        value: `/board/${board.slug}`,
        label: board.name,
        group: 'Domains',
        dot: `var(--dom-${board.domain})`,
      })),
      ...committees.map((c) => ({
        value: `/committee/${c.id}`,
        label: c.name,
        group: 'Committees',
        dot: `var(--dom-${c.domains[0]})`,
      })),
    ],
    [committees, boards],
  );

  const current = committee
    ? `/committee/${committee.id}`
    : domainBoard
      ? `/board/${domainBoard.slug}`
      : '/board/all';

  // A committee id that no longer exists must not render an empty board.
  if (id && !committee) return <Navigate to="/board/all" replace />;

  function move(task: Task, next: TaskState) {
    if (!LEGAL_TRANSITIONS[task.state].includes(next)) return;

    const undo = setState(task.id, next);
    setFlashed((flashing) => [...flashing, task.id]);
    window.setTimeout(() => {
      setFlashed((flashing) => flashing.filter((flashedId) => flashedId !== task.id));
    }, 400);

    toast.show(`${task.number} moved to ${STATE_LABELS[next]}`, {
      tone: 'success',
      action: { label: 'Undo', onAction: undo },
    });
  }

  const shared = { byState, columns, flashed, onOpen: openTask };
  const morphingId = searchParams.get(TASK_PARAM) ?? undefined;
  const title = committee ? committee.name : domainBoard ? domainBoard.name : 'All boards';

  return (
    <div className="board">
      <header className="board__head">
        <div className="board__title-row">
          <h2 className="display-2 board__title title-reveal">{title}</h2>

          {committee ? (
            <>
              {/* A committee is defined by the domains it spans (§0). */}
              {committee.domains.map((each) => (
                <Tag key={each} channel={each}>{DOMAIN_LABELS[each]}</Tag>
              ))}
              <AvatarStack
                people={committee.members.map((p) => ({
                  name: p.name, initials: p.initials, channel: p.domain,
                }))}
              />
            </>
          ) : domainBoard ? (
            <>
              <Tag channel={domainBoard.domain}>{DOMAIN_LABELS[domainBoard.domain]}</Tag>
              <span className="board__members micro">{domainBoard.members} members</span>
            </>
          ) : (
            <span className="board__members micro">
              every domain and committee · {allTasks.length} tasks
            </span>
          )}
        </div>

        {/*
          The rule takes the domain's colour on a domain board. Across all of
          them there is no one domain to name, so it is drawn in paper rather
          than picking a colour that would imply one.
        */}
        <span
          className="board__rule"
          style={{
            background: committee
              ? `var(--dom-${committee.domains[0]})`
              : domainBoard
                ? `var(--dom-${domainBoard.domain})`
                : 'var(--paper)',
          }}
          aria-hidden="true"
        />

        <div className="board__controls">
          <Select
            className="board__switcher"
            label="Board"
            labelHidden
            value={current}
            options={options}
            onChange={(value) => navigate(value as string)}
          />

          <SearchBar
            className="board__search"
            label="Search tasks"
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

          {/* Absent without the permission, not disabled (§14 item 13). */}
          {can('task.assign') && (
            <Button
              variant="outline-light"
              size="sm"
              className="board__new"
              onClick={() => setCreating(true)}
            >
              New committee
            </Button>
          )}

          {/*
            The board's one primary action (§1.2). Only admins and super admins
            raise work, so it is absent for everyone else.
          */}
          {canCreate && (
            <Button variant="brush" size="sm" onClick={() => setRaising(true)}>
              New task
            </Button>
          )}
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
                : committee
                  ? 'nothing has been assigned to this committee yet'
                  : 'nothing has been assigned to this board yet'
            }
          />
        </Card>
      ) : isDesktop ? (
        <BoardKanban {...shared} onMove={move} fadeKey={filter} morphingId={morphingId} />
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

      <NewTask
        open={raising}
        onClose={() => setRaising(false)}
        onCreated={(task) => {
          setRaising(false);
          openTask(task);
        }}
        preset={
          committee
            ? { kind: 'committee', id: committee.id }
            : domain
              ? { kind: 'domain', domain }
              : undefined
        }
      />

      <NewCommittee
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(newId) => {
          setCreating(false);
          navigate(`/committee/${newId}`);
        }}
      />
    </div>
  );
}
