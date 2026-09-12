import { useMemo, useState, type FormEvent } from 'react';
import { useTasks } from '../../store/taskStore';
import { useClub } from '../../store/ClubProvider';
import { candidatesForDomain } from '../../lib/club';
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
import { Select } from '../../ui/primitives/Select';
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
  ActivityRow, Breadcrumb, Card, CommentItem, LinkChip, Modal, TabPanel, Tabs,
} from '../../ui/patterns';
import { useToast } from '../../hooks/useToast';
import { describeError } from '../../lib/supabase';

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
  const {
    rename, toggleChecklistItem, addChecklistItem, addComment, removeDeliverable, setAssignees,
  } = useTasks();
  const { members } = useClub();

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

  /*
    Reassignment, held as a draft so the sheet can be cancelled. Committing is
    one write; editing it name by name against the server would mean a task
    passing through states nobody chose — including, for a moment, nobody
    assigned at all, which under `tasks_read` changes who can see it.
  */
  const canAssign = can('task.assign');
  const [reassigning, setReassigning] = useState(false);
  const [draftAssignees, setDraftAssignees] = useState<Person[]>(task.assignees);
  const [savingAssignees, setSavingAssignees] = useState(false);

  const assignable = useMemo(
    () => candidatesForDomain(members, task.domain, canAssign),
    [members, task.domain, canAssign],
  );

  const { remove } = useTasks();
  const toast = useToast();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /*
    Deletion is confirmed, not undone. Everything else destructive in this app
    offers an Undo toast, but the comments and the activity log go with the task
    and an Undo could not put them back — so the question is asked first, and it
    names what is about to be lost.
  */
  async function confirmDelete() {
    setDeleting(true);
    try {
      await remove(task.id);
      toast.show(`${task.number} deleted.`, { tone: 'success' });
      setConfirmingDelete(false);
      onBack();
    } catch (caught) {
      toast.show(describeError(caught), { tone: 'error' });
      setDeleting(false);
    }
  }

  /*
    Kept open on failure. Reassigning is two statements behind PostgREST rather
    than one transaction, so a refusal can land after the old list is already
    gone — closing the sheet would hide the one control that can put it right.
  */
  async function commitAssignees() {
    setSavingAssignees(true);
    try {
      await setAssignees(task.id, draftAssignees);
      toast.show(
        draftAssignees.length === 0
          ? `${task.number} is unassigned.`
          : `${task.number} assigned to ${draftAssignees.map((p) => p.name).join(', ')}.`,
        { tone: 'success' },
      );
      setReassigning(false);
    } catch (caught) {
      toast.show(describeError(caught), { tone: 'error' });
    } finally {
      setSavingAssignees(false);
    }
  }

  /** Every legal move that is not already the primary button (§9.8). */
  const overflowItems: MenuItem[] = LEGAL_TRANSITIONS[task.state]
    .filter((state) => state !== primary?.to)
    .map((state) => ({
      id: state,
      label: `Move to ${STATE_LABELS[state]}`,
      onSelect: () => onMove(state),
    }));

  // §12: absent rather than disabled for anyone without the key.
  if (can('task.delete')) {
    overflowItems.push({
      id: 'delete',
      label: 'Delete task',
      destructive: true,
      onSelect: () => setConfirmingDelete(true),
    });
  }

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
          {/*
            §9.8 asks for `Domain / Board`. On a domain's own board those are
            the same word, so the duplicate crumb is dropped — it only earns its
            place on a committee board, where they differ.
          */}
          <Breadcrumb
            tone="ink"
            items={
              task.boardName === DOMAIN_LABELS[task.domain]
                ? [{ label: task.boardName }]
                : [
                    { label: DOMAIN_LABELS[task.domain], to: `/board/${task.boardSlug}` },
                    { label: task.boardName },
                  ]
            }
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
            /* The other half of the morph — see the note in useOpenTask. */
            style={{ viewTransitionName: `task-${task.id}` } as React.CSSProperties}
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
              <dd className="task__assignees">
                {task.assignees.length > 0 ? (
                  <AvatarStack
                    people={task.assignees.map((p) => ({
                      name: p.name, initials: p.initials, channel: p.domain,
                    }))}
                  />
                ) : (
                  <Avatar size={24} unassigned />
                )}

                {/*
                  Only for whoever may assign. Being ON a task is enough to edit
                  it, but not enough to rewrite who is on it: `replaceAssignees`
                  clears the table before refilling it, and an assignee removing
                  themselves would lose the right to finish the write halfway
                  through. `task.assign` survives it.
                */}
                {canAssign && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDraftAssignees(task.assignees);
                      setReassigning(true);
                    }}
                  >
                    {task.assignees.length > 0 ? 'Change' : 'Assign'}
                  </Button>
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

      <Modal
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        title={`Delete ${task.number}?`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleting} onClick={() => void confirmDelete()}>
              Delete
            </Button>
          </>
        }
      >
        <p className="body-sm">
          <strong>{task.title}</strong> and everything on it — its checklist, its
          links, its comments and its activity log — are removed for everyone.
          This cannot be undone.
        </p>
      </Modal>

      <Modal
        open={reassigning}
        onClose={() => setReassigning(false)}
        title={`Who is on ${task.number}?`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setReassigning(false)}>Cancel</Button>
            <Button variant="brush" loading={savingAssignees} onClick={() => void commitAssignees()}>
              Save
            </Button>
          </>
        }
      >
        <div className="task__reassign">
          <Select
            label="Add someone"
            value=""
            placeholder={draftAssignees.length === 0 ? 'Nobody yet' : 'Add someone else'}
            options={assignable
              .filter((person) => !draftAssignees.some((p) => p.id === person.id))
              .map((person) => ({
                value: person.id,
                label:
                  person.domain === task.domain
                    ? person.name
                    : `${person.name} — ${DOMAIN_LABELS[person.domain]}`,
                dot: `var(--dom-${person.domain})`,
              }))}
            onChange={(value) => {
              const person = assignable.find((p) => p.id === (value as string));
              if (person) setDraftAssignees((current) => [...current, person]);
            }}
          />

          {draftAssignees.length > 0 ? (
            <ul className="task__reassign-chips">
              {draftAssignees.map((person, index) => (
                <li key={person.id}>
                  <Chip
                    variant="removable"
                    removeLabel={`Take ${person.name} off ${task.number}`}
                    onRemove={() =>
                      setDraftAssignees((current) => current.filter((p) => p.id !== person.id))
                    }
                  >
                    {index === 0 && draftAssignees.length > 1
                      ? `${person.name} · lead`
                      : person.name}
                  </Chip>
                </li>
              ))}
            </ul>
          ) : (
            /*
              Said plainly, because under the current read policy an unassigned
              task is visible to its whole board while an assigned one is not.
              Emptying this list is a decision about who can see the task, and
              the sheet should not let someone make it by accident.
            */
            <p className="body-sm task__reassign-note">
              With nobody on it, {task.number} goes back to everyone on{' '}
              {DOMAIN_LABELS[task.domain]} and anyone there can pick it up.
            </p>
          )}
        </div>
      </Modal>

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
