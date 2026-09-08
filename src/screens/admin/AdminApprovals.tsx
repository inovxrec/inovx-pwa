import { useMemo, useState } from 'react';
import { useTasks } from '../../store/taskStore';
import { useToast } from '../../hooks/useToast';
import { useOpenTask } from '../../hooks/useOpenTask';
import { STATE_LABELS, daysUntil } from '../../lib/tasks';
import { Button } from '../../ui/primitives/Button';
import { Checkbox } from '../../ui/primitives/Checkbox';
import { Card, EmptyState, TaskCard } from '../../ui/patterns';
import { StickerCoffee } from '../../ui/stickers';
import { ADMIN_SCREENS, AdminPage } from './AdminFrame';
import './Admin.css';

const SCREEN = ADMIN_SCREENS.find((s) => s.id === 'approvals')!;

/** §9.15 — the full queue, with bulk selection and a sticky action bar. */
export function AdminApprovals() {
  const { tasks, setState } = useTasks();
  const toast = useToast();
  const openTask = useOpenTask();

  const [selected, setSelected] = useState<string[]>([]);

  const queue = useMemo(
    () =>
      tasks
        .filter((task) => task.state === 'review')
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [tasks],
  );

  const allSelected = queue.length > 0 && selected.length === queue.length;

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((s) => s !== id) : [...current, id],
    );
  }

  /**
   * One decision applied to everything selected. The undo puts every one of
   * them back, so a bulk mistake costs one tap rather than N.
   */
  function decideAll(approve: boolean) {
    const chosen = queue.filter((task) => selected.includes(task.id));
    if (chosen.length === 0) return;

    const undos = chosen.map((task) => setState(task.id, approve ? 'done' : 'progress'));
    setSelected([]);

    toast.show(
      `${chosen.length} ${chosen.length === 1 ? 'task' : 'tasks'} ${
        approve ? 'approved' : `sent back to ${STATE_LABELS.progress}`
      }`,
      {
        tone: 'success',
        action: { label: 'Undo', onAction: () => undos.forEach((undo) => undo()) },
      },
    );
  }

  if (queue.length === 0) {
    return (
      <AdminPage screen={SCREEN}>
        <Card>
          <EmptyState
            sticker={<StickerCoffee size="empty" />}
            title="Nothing to approve"
            line="the queue is clear — go and make something"
          />
        </Card>
      </AdminPage>
    );
  }

  return (
    <AdminPage screen={SCREEN}>
      <Card>
        <div className="admin__bulk-head">
          <Checkbox
            label={allSelected ? 'Clear selection' : `Select all ${queue.length}`}
            checked={allSelected}
            indeterminate={selected.length > 0 && !allSelected}
            onChange={() => setSelected(allSelected ? [] : queue.map((task) => task.id))}
          />
        </div>

        <ul className="admin__queue-list" role="list">
          {queue.map((task) => {
            const waiting = Math.max(1, -daysUntil(task.createdAt));

            return (
              <li className="admin__queue-item" key={task.id}>
                <Checkbox
                  label={`Select ${task.number}`}
                  labelHidden
                  checked={selected.includes(task.id)}
                  onChange={() => toggle(task.id)}
                />
                <TaskCard
                  task={task}
                  variant="compact"
                  onOpen={openTask}
                  className="admin__queue-card"
                />
                <span className={`micro admin__waiting${waiting > 3 ? ' admin__waiting--stale' : ''}`}>
                  waiting {waiting}d
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      {/*
        §9.15 — the bar appears the moment anything is selected, and says how
        many it is about to act on so a bulk decision is never a guess.
      */}
      {selected.length > 0 && (
        <div className="admin__bar" role="region" aria-label="Bulk actions">
          <p className="body-sm admin__bar-count">
            {selected.length} selected
          </p>
          <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
            Clear
          </Button>
          <Button variant="outline-light" size="sm" onClick={() => decideAll(false)}>
            Request changes
          </Button>
          <Button variant="brush" size="sm" onClick={() => decideAll(true)}>
            Approve {selected.length}
          </Button>
        </div>
      )}
    </AdminPage>
  );
}
