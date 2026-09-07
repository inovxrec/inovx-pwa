import { useMemo, useState } from 'react';
import { useTasks } from '../../store/taskStore';
import { useAssignment } from '../../hooks/useAssignment';
import { useToast } from '../../hooks/useToast';
import { MEMBERS } from '../../lib/club';
import { BOARDS } from '../../lib/mockTasks';
import { DOMAIN_LABELS, type Domain, type Person, type Task } from '../../lib/tasks';
import { Button } from '../../ui/primitives/Button';
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
  const { me, domains, committees, selfOnly } = useAssignment();
  const toast = useToast();

  /** "me", a domain id, or "committee:<id>". */
  const initialTarget =
    preset?.kind === 'domain' && domains.includes(preset.domain)
      ? preset.domain
      : preset?.kind === 'committee' && committees.some((c) => c.id === preset.id)
        ? `committee:${preset.id}`
        : domains[0] ?? (committees[0] ? `committee:${committees[0].id}` : 'me');

  const [target, setTarget] = useState<string>(initialTarget);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [due, setDue] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState<string>('');

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

    return MEMBERS.filter((member) => member.domain === target);
  }, [target, committees, me]);

  function reset() {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDue(null);
    setAssigneeId('');
    setTarget(initialTarget);
  }

  function submit() {
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

    const board = BOARDS.find((b) => b.domain === domain);

    const assignees: Person[] =
      target === 'me' && me
        ? [me]
        : candidates.filter((person) => person.id === assigneeId);

    const task = create({
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
          <Button variant="brush" disabled={!title.trim()} onClick={submit}>
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
            // The old assignee may not be on the new target.
            setAssigneeId('');
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
          <Select
            label="Assign to"
            value={assigneeId}
            placeholder="Leave unassigned"
            options={[
              { value: '', label: 'Leave unassigned' },
              ...candidates.map((person) => ({
                value: person.id,
                label: person.name,
                dot: `var(--dom-${person.domain})`,
              })),
            ]}
            onChange={(value) => setAssigneeId(value as string)}
          />
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
