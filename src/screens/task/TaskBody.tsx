import { useState, type FormEvent } from 'react';
import { useTasks } from '../../store/taskStore';
import type { PermissionKey } from '../../lib/permissions';
import {
  DOMAIN_LABELS, LEGAL_TRANSITIONS, STATE_LABELS, checklistProgress, dueInfo,
  primaryAction, type Person, type Task, type TaskState,
} from '../../lib/tasks';
import { cn } from '../../lib/cn';
import { IconChevronLeft, IconPlus } from '../../ui/icons';
import { Button } from '../../ui/primitives/Button';
import { IconButton } from '../../ui/primitives/IconButton';
import { Input } from '../../ui/primitives/Input';
import { Textarea } from '../../ui/primitives/Textarea';
import { Checkbox } from '../../ui/primitives/Checkbox';
import { ProgressBar } from '../../ui/primitives/ProgressBar';
import { StatePill } from '../../ui/primitives/StatePill';
import { AvatarStack } from '../../ui/primitives/AvatarStack';
import { Avatar } from '../../ui/primitives/Avatar';
import { Tag } from '../../ui/primitives/Tag';
import { Chip } from '../../ui/primitives/Chip';
import { Menu, type MenuItem } from '../../ui/primitives/Menu';
import {
  ActivityRow, Breadcrumb, Card, CommentItem, LinkChip, TabPanel, Tabs,
} from '../../ui/patterns';

/** Beyond this many words the title stops being Anton and becomes Inter (§9.8). */
const ANTON_WORD_LIMIT = 6;

export interface TaskBodyProps {
  task: Task;
  me?: Person;
  can: (key: PermissionKey) => boolean;
  onMove: (state: TaskState) => void;
  onBack: () => void;
  /** The mobile route needs a back chevron; the drawer has its own ✕. */
  showBack: boolean;
}

/**
 * §9.8's contents, shared by the desktop drawer and the mobile route so the two
 * halves of fork #3 cannot drift apart.
 */
export function TaskBody({ task, me, can, onMove, onBack, showBack }: TaskBodyProps) {
  const { rename, toggleChecklistItem, addChecklistItem, addComment, removeDeliverable } = useTasks();

  // Activity leads for anyone who reviews; comments for everyone else (§9.8).
  const [tab, setTab] = useState<'activity' | 'comments'>(
    can('approvals.review') ? 'activity' : 'comments',
  );
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(task.title);
  const [newItem, setNewItem] = useState('');
  const [draftComment, setDraftComment] = useState('');

  const due = dueInfo(task);
  const progress = checklistProgress(task);
  const primary = primaryAction(task, can('approvals.review'));
  const editable = can('task.assign');

  /** Every legal move that is not already the primary button (§9.8). */
  const overflowItems: MenuItem[] = LEGAL_TRANSITIONS[task.state]
    .filter((state) => state !== primary?.to)
    .map((state) => ({
      id: state,
      label: `Move to ${STATE_LABELS[state]}`,
      onSelect: () => onMove(state),
    }));

  const longTitle = task.title.split(/\s+/).length > ANTON_WORD_LIMIT;

  function commitTitle() {
    setEditingTitle(false);
    const next = draftTitle.trim();
    if (next && next !== task.title) rename(task.id, next);
    else setDraftTitle(task.title);
  }

  function submitChecklistItem(event: FormEvent) {
    event.preventDefault();
    const text = newItem.trim();
    if (!text) return;
    addChecklistItem(task.id, text);
    setNewItem('');
  }

  function submitComment(event: FormEvent) {
    event.preventDefault();
    const body = draftComment.trim();
    if (!body || !me) return;
    addComment(task.id, me, body);
    setDraftComment('');
  }

  return (
    <article className="task">
      <header className="task__head">
        <div className="task__crumbs">
          {showBack && (
            <IconButton
              label="Back"
              icon={<IconChevronLeft />}
              tone="ink"
              onClick={onBack}
            />
          )}
          <Breadcrumb
            tone="ink"
            items={[
              { label: DOMAIN_LABELS[task.domain], to: `/board/${task.boardSlug}` },
              { label: task.boardName },
            ]}
          />
          <span className="task__number micro">{task.number}</span>
        </div>

        <div className="task__state-row">
          <StatePill state={task.state} tone="ink" />
          {task.committee && <Tag channel={task.domain}>{task.committee}</Tag>}

          {overflowItems.length > 0 && (
            <Menu label="Task actions" items={overflowItems} tone="ink" className="task__overflow" />
          )}
        </div>

        {editingTitle ? (
          <Input
            label="Title"
            tone="ink"
            autoFocus
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            onBlur={commitTitle}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitTitle();
              if (event.key === 'Escape') {
                setDraftTitle(task.title);
                setEditingTitle(false);
              }
            }}
          />
        ) : (
          <h2
            className={cn('task__title', longTitle ? 'task__title--long' : 'display-3')}
            /*
              Inline-editable for those permitted (§9.8): click turns it into an
              input in place, Escape cancels, blur or Enter saves. It is a button
              rather than a contenteditable so it is reachable by keyboard.
            */
            onClick={editable ? () => setEditingTitle(true) : undefined}
            role={editable ? 'button' : undefined}
            tabIndex={editable ? 0 : undefined}
            onKeyDown={
              editable
                ? (event) => {
                    if (event.key === 'Enter') setEditingTitle(true);
                  }
                : undefined
            }
          >
            {task.title}
          </h2>
        )}
      </header>

      {/* The chained-task strip (§9.8). */}
      {task.source?.kind === 'task' && (
        <Card surface="mint" className="task__chain">
          <p className="body-sm">
            Generated from <strong>{task.source.ref}</strong> — {task.source.label}
          </p>
        </Card>
      )}

      <div className="task__stack">
        <Card>
          <p className="body read-width task__description">{task.description}</p>

          {task.blockedReason && (
            <p className="task__blocked body-sm" role="note">
              <strong>Blocked:</strong> {task.blockedReason}
            </p>
          )}

          <dl className="task__meta">
            <div className="task__meta-row">
              <dt className="label">Assignees</dt>
              <dd>
                {task.assignees.length > 0 ? (
                  <AvatarStack
                    people={task.assignees.map((p) => ({
                      name: p.name, initials: p.initials, channel: p.domain,
                    }))}
                  />
                ) : (
                  <Avatar size={24} unassigned />
                )}
              </dd>
            </div>

            <div className="task__meta-row">
              <dt className="label">Due</dt>
              <dd className={cn('body-sm', due.overdue && 'task__due--late')}>
                {due.text || 'No due date'}
              </dd>
            </div>

            <div className="task__meta-row">
              <dt className="label">Priority</dt>
              <dd className="body-sm task__priority">{task.priority}</dd>
            </div>

            {task.labels.length > 0 && (
              <div className="task__meta-row">
                <dt className="label">Labels</dt>
                <dd className="task__labels">
                  {task.labels.map((label) => (
                    <Chip key={label} variant="static">{label}</Chip>
                  ))}
                </dd>
              </div>
            )}

            {task.source && task.source.kind !== 'task' && (
              <div className="task__meta-row">
                <dt className="label">Source</dt>
                <dd>
                  <Chip variant="static">{task.source.label}</Chip>
                </dd>
              </div>
            )}
          </dl>
        </Card>

        {(progress || editable) && (
          <Card
            surface="mint"
            title="Checklist"
            aside={progress && <span className="tnum micro">{progress.done}/{progress.total}</span>}
          >
            {progress && (
              <ProgressBar
                value={(progress.done / progress.total) * 100}
                label={`${progress.done} of ${progress.total} done`}
              />
            )}

            <ul className="task__checklist" role="list">
              {task.checklist.map((item) => (
                <li key={item.id}>
                  <Checkbox
                    label={item.text}
                    checked={item.done}
                    onChange={() => toggleChecklistItem(task.id, item.id)}
                  />
                </li>
              ))}
            </ul>

            {editable && (
              <form className="task__add" onSubmit={submitChecklistItem}>
                <Input
                  label="Add a checklist item"
                  value={newItem}
                  onChange={(event) => setNewItem(event.target.value)}
                />
                <Button type="submit" variant="outline" size="sm" icon={<IconPlus />}>
                  Add
                </Button>
              </form>
            )}
          </Card>
        )}

        {task.deliverables.length > 0 && (
          <Card title="Deliverables">
            <div className="task__links">
              {task.deliverables.map((deliverable) => (
                <LinkChip
                  key={deliverable.id}
                  deliverable={deliverable}
                  onRemove={editable ? (id) => removeDeliverable(task.id, id) : undefined}
                />
              ))}
            </div>
            <p className="task__hint body-sm">
              Make sure sharing is set to anyone-with-the-link — reviewers can't
              open a restricted file.
            </p>
          </Card>
        )}

        <Card>
          <Tabs
            label="Task history"
            value={tab}
            onChange={setTab}
            items={[
              { id: 'activity', label: 'Activity', count: task.activity.length },
              { id: 'comments', label: 'Comments', count: task.comments.length },
            ]}
          />

          {tab === 'activity' ? (
            <TabPanel id="activity">
              {task.activity.length === 0 ? (
                <p className="task__none body-sm">Nothing has happened yet.</p>
              ) : (
                <ul className="task__feed" role="list">
                  {task.activity.map((entry) => (
                    <ActivityRow key={entry.id} entry={entry} />
                  ))}
                </ul>
              )}
            </TabPanel>
          ) : (
            <TabPanel id="comments">
              {task.comments.length === 0 ? (
                <p className="task__none body-sm">No comments yet.</p>
              ) : (
                <ul className="task__feed" role="list">
                  {task.comments.map((comment) => (
                    <CommentItem key={comment.id} comment={comment} />
                  ))}
                </ul>
              )}

              {me && (
                <form className="task__comment-form" onSubmit={submitComment}>
                  <Textarea
                    label="Add a comment"
                    value={draftComment}
                    onChange={(event) => setDraftComment(event.target.value)}
                  />
                  <Button type="submit" variant="outline" size="sm" disabled={!draftComment.trim()}>
                    Comment
                  </Button>
                </form>
              )}
            </TabPanel>
          )}
        </Card>
      </div>

      {/* §9.8 — sticky, and exactly one primary action, or none. */}
      {primary && (
        <div className="task__bar">
          <Button variant="brush" fullWidth onClick={() => onMove(primary.to)}>
            {primary.label}
          </Button>
        </div>
      )}
    </article>
  );
}
