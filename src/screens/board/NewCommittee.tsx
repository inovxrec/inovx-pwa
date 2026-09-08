import { useMemo, useState } from 'react';
import { useCommittees, domainsOf } from '../../store/committeeStore';
import { useToast } from '../../hooks/useToast';
import { useBoards, useClub } from '../../store/ClubProvider';
import type { Member } from '../../lib/club';
import { DOMAIN_LABELS, type Domain, type Person } from '../../lib/tasks';
import { Avatar } from '../../ui/primitives/Avatar';
import { Button } from '../../ui/primitives/Button';
import { Checkbox } from '../../ui/primitives/Checkbox';
import { Input } from '../../ui/primitives/Input';
import { Tag } from '../../ui/primitives/Tag';
import { Modal } from '../../ui/patterns';
import './NewCommittee.css';

export interface NewCommitteeProps {
  open: boolean;
  onClose: () => void;
  /** Fires with the new committee's id so the caller can navigate to its board. */
  onCreated: (id: string) => void;
  /**
   * The committee being edited, by slug. Absent when creating one.
   *
   * The same form does both because they ask the identical question — a name
   * and who is on it — and two forms would drift apart the first time either
   * changed.
   */
  editing?: string;
  /** Fires after an edited committee is deleted, so the caller can navigate away. */
  onDeleted?: () => void;
}

/**
 * Creates a committee by picking people from more than one domain (§0).
 *
 * The roster is grouped by domain rather than listed flat, because the whole
 * point of a committee is that it crosses them — a flat list would hide the one
 * thing the person making it needs to see.
 */
export function NewCommittee({ open, onClose, onCreated, editing, onDeleted }: NewCommitteeProps) {
  const { create, update, remove, byId } = useCommittees();
  const { members: roster } = useClub();
  const boards = useBoards();
  const toast = useToast();

  const existing = editing ? byId(editing) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [picked, setPicked] = useState<Person[]>(existing?.members ?? []);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  /*
    The committee arrives a moment after the modal opens on a cold load, so the
    form is seeded from it when it appears rather than in an effect that would
    fight whatever the person has already typed.
  */
  const [seeded, setSeeded] = useState<string | undefined>(undefined);
  if (existing && seeded !== existing.id) {
    setSeeded(existing.id);
    setName(existing.name);
    setPicked(existing.members);
  }

  const byDomain = useMemo(() => {
    const map = new Map<Domain, Member[]>();
    for (const board of boards) map.set(board.domain, []);
    for (const member of roster) {
      const list = map.get(member.domain);
      if (list) list.push(member);
      else map.set(member.domain, [member]);
    }
    return [...map].filter(([, list]) => list.length > 0);
  }, [boards, roster]);

  const spans = domainsOf(picked);
  /** A committee that draws from one domain is just that domain's board. */
  const crossDomain = spans.length > 1;
  const valid = name.trim().length > 1 && crossDomain;

  function toggle(person: Person) {
    setPicked((current) =>
      current.some((p) => p.id === person.id)
        ? current.filter((p) => p.id !== person.id)
        : [...current, person],
    );
  }

  function reset() {
    setName(existing?.name ?? '');
    setPicked(existing?.members ?? []);
    setConfirmingDelete(false);
  }

  async function submit() {
    if (!valid) return;
    setBusy(true);

    if (existing) {
      const saved = await update(existing.id, name, picked);
      setBusy(false);

      if (!saved) {
        toast.show('Could not save that committee.', { tone: 'error' });
        return;
      }

      onClose();
      toast.show(`${name.trim()} now has ${picked.length} members.`, { tone: 'success' });
      return;
    }

    const committee = await create(name, picked);
    setBusy(false);

    if (!committee) {
      // The write was refused. Say so rather than closing as though it worked.
      toast.show('Could not create that committee.', { tone: 'error' });
      return;
    }

    reset();
    onCreated(committee.id);
    toast.show(`${committee.name} created with ${picked.length} members.`, { tone: 'success' });
  }

  async function confirmDelete() {
    if (!existing) return;
    setBusy(true);

    const gone = await remove(existing.id);
    setBusy(false);

    if (!gone) {
      toast.show('Could not delete that committee.', { tone: 'error' });
      return;
    }

    setConfirmingDelete(false);
    onClose();
    onDeleted?.();
    toast.show(`${existing.name} deleted. Its tasks stay on their domain boards.`, {
      tone: 'success',
    });
  }

  if (confirmingDelete && existing) {
    return (
      <Modal
        open
        onClose={() => setConfirmingDelete(false)}
        title={`Delete ${existing.name}?`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={busy} onClick={() => void confirmDelete()}>
              Delete
            </Button>
          </>
        }
      >
        {/*
          Says what survives as well as what goes. A committee is a grouping,
          not a container: its work lives on the domain boards either way, and
          someone deleting one should not have to guess whether they are about
          to lose it.
        */}
        <p className="body-sm">
          The committee and its {existing.members.length} memberships are removed
          for everyone. Any task raised under it stays on its domain board.
        </p>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      dirty={
        existing
          ? name.trim() !== existing.name || picked.length !== existing.members.length
          : name.trim().length > 0 || picked.length > 0
      }
      title={existing ? `Edit ${existing.name}` : 'New committee'}
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
          {existing && (
            <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
              Delete
            </Button>
          )}
          <Button variant="brush" disabled={!valid} loading={busy} onClick={() => void submit()}>
            {existing ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <div className="committee-form">
        <Input
          label="Committee name"
          placeholder="Techfest, Alumni meet…"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <div className="committee-form__roster">
          <p className="label committee-form__legend">Members</p>

          {byDomain.map(([domain, members]) => (
            <fieldset className="committee-form__domain" key={domain}>
              <legend className="committee-form__domain-name">
                <Tag channel={domain}>{DOMAIN_LABELS[domain]}</Tag>
              </legend>

              <div className="committee-form__people">
                {members.map((member) => (
                  <label className="committee-form__person" key={member.id}>
                    <Checkbox
                      label={member.name}
                      className="committee-form__check"
                      checked={picked.some((p) => p.id === member.id)}
                      onChange={() => toggle(member)}
                    />
                    <Avatar
                      size={24}
                      name={member.name}
                      initials={member.initials}
                      channel={member.domain}
                    />
                    <span className="committee-form__title micro">{member.title}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        {/*
          Live, and phrased as what will happen rather than as an error, so the
          rule is learnable before it is enforced.
        */}
        <p className="committee-form__summary body-sm">
          {picked.length === 0
            ? 'Pick people from at least two domains.'
            : crossDomain
              ? `${picked.length} members across ${spans.map((d) => DOMAIN_LABELS[d]).join(', ')}.`
              : `${picked.length} from ${DOMAIN_LABELS[spans[0]]} only — a committee needs a second domain.`}
        </p>
      </div>
    </Modal>
  );
}
