import { useMemo, useState } from 'react';
import { useTasks } from '../../store/taskStore';
import { useAssignment } from '../../hooks/useAssignment';
import { useToast } from '../../hooks/useToast';
import { useBoards, useClub } from '../../store/ClubProvider';
import { candidatesForDomain } from '../../lib/club';
import { DOMAIN_LABELS, type Domain, type Person, type Task } from '../../lib/tasks';
import { Button } from '../../ui/primitives/Button';
import { Chip } from '../../ui/primitives/Chip';
import { DatePicker } from '../../ui/primitives/DatePicker';
import { Input } from '../../ui/primitives/Input';
import { Select } from '../../ui/primitives/Select';
import { Textarea } from '../../ui/primitives/Textarea';
import { Modal } from '../../ui/patterns';
import './NewTask.css';

export interface NewTaskProps {
  open: boolean;
  onClose: () => void;
  onCreated: (task: Task) => void;
  /** Preselects the target when opened from a domain or committee board. */
  preset?: { kind: 'domain'; domain: Domain } | { kind: 'committee'; id: string };
}

const PRIORITIES = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

/**
 * Raising a task, for yourself or for a domain or committee you may assign to.
 *
 * Which targets appear is not this form's decision — it asks `useAssignment`,
 * which reads the scoped `task.assign` grant a super admin sets on §9.17's
 * screen. A domain nobody granted is absent from the list, not disabled: the
 * form never offers a target the server would refuse (§14 item 13).
 */
export function NewTask({ open, onClose, onCreated, preset }: NewTaskProps) {
  const { create } = useTasks();
  const { me, domains, committees, selfOnly, canAssignAnyone } = useAssignment();
  const { members } = useClub();
  const boards = useBoards();
  const toast = useToast();

  /** "me", a domain id, or "committee:<id>". */
  const initialTarget =
    preset?.kind === 'domain' && domains.includes(preset.domain)
      ? preset.domain
      : preset?.kind === 'committee' && committees.some((c) => c.id === preset.id)
        ? `committee:${preset.id}`
        : /*
             Opened from no particular board, it lands on your own domain. The
             list is ordered by name, so falling back to its first entry used to
             mean whatever sorted first — now that core ops is a board, that is
             Core, which is the wrong guess for most of the club.
           */
          (me && domains.includes(me.domain) ? me.domain : undefined) ??
          domains[0] ??
          (committees[0] ? `committee:${committees[0].id}` : 'me');

  const [target, setTarget] = useState<string>(initialTarget);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [due, setDue] = useState<string | null>(null);
  /*
    Several people, in the order they were added. `task_assignees` has always
    been a many-to-many table and `insertTask` has always taken a list — this
    form was the only thing in the stack that could hold one name, and a poster
    that needs an illustrator and a copywriter had to be raised twice.

    Order is kept because `insertTask` writes `is_primary` for the first of
    them, so whoever is named first is the one the board leads with.
  */
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);

  const targets = useMemo(
    () => [
      { value: 'me', label: 'Myself', group: 'Me' },
      ...domains.map((domain) => ({
        value: domain,
        label: DOMAIN_LABELS[domain],
        group: 'Domains',
        dot: `var(--dom-${domain})`,
      })),
      ...committees.map((c) => ({
        value: `committee:${c.id}`,
        label: c.name,
        group: 'Committees',
        dot: `var(--dom-${c.domains[0]})`,
      })),
    ],
    [domains, committees],
  );

  /** Who can be put on it, given where it is going. */
  const candidates = useMemo(() => {
    if (target === 'me') return me ? [me] : [];

    if (target.startsWith('committee:')) {
      const committee = committees.find((c) => `committee:${c.id}` === target);
      return committee?.members ?? [];
    }

    return candidatesForDomain(members, target, canAssignAnyone);
  }, [target, committees, me, members, canAssignAnyone]);

  /*
    The people actually put on it, in the order they were added — mapped from
    the ids rather than filtered out of `candidates`, because filtering would
    hand back the candidate list's order and the first name is not arbitrary:
    `insertTask` writes it as the primary assignee.

    Changing the target empties `assigneeIds`, so a stale id cannot survive
    here; the `filter` is for the race where the club list reloads underneath
    an open form.
  */
  const chosen = useMemo(
    () =>
      assigneeIds
        .map((id) => candidates.find((person) => person.id === id))
        .filter((person): person is Person => Boolean(person)),
    [assigneeIds, candidates],
  );

  function reset() {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDue(null);
    setAssigneeIds([]);
    setTarget(initialTarget);
  }

  async function submit() {
    const trimmed = title.trim();
    if (!trimmed) return;

    const committee = target.startsWith('committee:')
      ? committees.find((c) => `committee:${c.id}` === target)
      : undefined;

    // A committee's work still lives on a domain board — its first domain, so
    // it turns up somewhere rather than on a board that does not exist.
    const domain: Domain =
      target === 'me'
        ? (me?.domain ?? 'core')
        : committee
          ? committee.domains[0]
          : (target as Domain);

    const board = boards.find((b) => b.domain === domain);

    const assignees: Person[] = target === 'me' && me ? [me] : chosen;

    const task = await create({
      title: trimmed,
      description: description.trim(),
      domain,
      boardSlug: board?.slug ?? domain,
      boardName: board?.name ?? DOMAIN_LABELS[domain],
      committee: committee?.name,
      priority: priority as Task['priority'],
      assignees,
      due,
    });

    if (!task) {
      toast.show('Could not raise that task.', { tone: 'error' });
      return;
    }

    reset();
    onCreated(task);
    toast.show(`${task.number} raised on ${task.boardName}.`, { tone: 'success' });
  }

  const dirty = title.trim().length > 0 || description.trim().length > 0;

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      dirty={dirty}
      title="New task"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button variant="brush" disabled={!title.trim()} onClick={() => void submit()}>
            Create
          </Button>
        </>
      }
    >
      <div className="new-task">
        <Input
          label="Title"
          placeholder="What needs doing?"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />

        <Textarea
          label="Description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />

        <Select
          label="Raise it for"
          value={target}
          options={targets}
          onChange={(value) => {
            setTarget(value as string);
            // The old assignees may not be on the new target.
            setAssigneeIds([]);
          }}
        />

        {/*
          Said plainly rather than left as an empty list: a person who may only
          file work against themselves should know that is the rule, not think
          the screen is broken.
        */}
        {selfOnly && (
          <p className="body-sm new-task__note">
            You can raise work for yourself. A super admin decides which domains
            you can assign into.
          </p>
        )}

        {target !== 'me' && candidates.length > 0 && (
          <div className="new-task__assignees">
            {/*
              The select adds; it never holds the answer. Its value is pinned
              empty so it reads as "add someone" every time it is opened, and
              whoever has already been added is shown below as chips rather than
              hidden inside a closed dropdown.
            */}
            <Select
              label="Assign to"
              value=""
              placeholder={chosen.length === 0 ? 'Leave unassigned' : 'Add someone else'}
              options={candidates
                .filter((person) => !assigneeIds.includes(person.id))
                .map((person) => ({
                  value: person.id,
                  // Anyone from another domain is named with it, so a Management
                  // person in a Design list reads as deliberate, not as a stray.
                  label:
                    person.domain === target
                      ? person.name
                      : `${person.name} — ${DOMAIN_LABELS[person.domain]}`,
                  dot: `var(--dom-${person.domain})`,
                }))}
              onChange={(value) => {
                const id = value as string;
                if (id) setAssigneeIds((current) => [...current, id]);
              }}
            />

            {chosen.length > 0 && (
              <ul className="new-task__chips">
                {chosen.map((person, index) => (
                  <li key={person.id}>
                    <Chip
                      variant="removable"
                      removeLabel={`Take ${person.name} off this task`}
                      onRemove={() =>
                        setAssigneeIds((current) => current.filter((id) => id !== person.id))
                      }
                    >
                      {/*
                        The first name added is the primary assignee — that is
                        what `insertTask` writes and what the board card leads
                        with — so the form says so rather than leaving the order
                        looking incidental.
                      */}
                      {index === 0 && chosen.length > 1 ? `${person.name} · lead` : person.name}
                    </Chip>
                  </li>
                ))}
              </ul>
            )}

            {chosen.length === 0 && (
              <p className="body-sm new-task__note">
                Left unassigned, this goes to everyone on the board and anyone
                there can pick it up.
              </p>
            )}
          </div>
        )}

        <div className="new-task__row">
          <Select
            label="Priority"
            value={priority}
            options={PRIORITIES}
            onChange={(value) => setPriority(value as string)}
          />
          <DatePicker label="Due" value={due} onChange={setDue} />
        </div>
      </div>
    </Modal>
  );
}
