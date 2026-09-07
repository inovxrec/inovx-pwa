import { useMemo, useState } from 'react';
import { useCommittees, domainsOf } from '../../store/committeeStore';
import { useToast } from '../../hooks/useToast';
import { MEMBERS } from '../../lib/club';
import { BOARDS } from '../../lib/mockTasks';
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
}

/**
 * Creates a committee by picking people from more than one domain (§0).
 *
 * The roster is grouped by domain rather than listed flat, because the whole
 * point of a committee is that it crosses them — a flat list would hide the one
 * thing the person making it needs to see.
 */
export function NewCommittee({ open, onClose, onCreated }: NewCommitteeProps) {
  const { create } = useCommittees();
  const toast = useToast();

  const [name, setName] = useState('');
  const [picked, setPicked] = useState<Person[]>([]);

  const byDomain = useMemo(() => {
    const map = new Map<Domain, typeof MEMBERS>();
    for (const board of BOARDS) map.set(board.domain, []);
    for (const member of MEMBERS) {
      const list = map.get(member.domain);
      if (list) list.push(member);
      else map.set(member.domain, [member]);
    }
    return [...map].filter(([, list]) => list.length > 0);
  }, []);

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
    setName('');
    setPicked([]);
  }

  function submit() {
    if (!valid) return;
    const committee = create(name, picked);
    reset();
    onCreated(committee.id);
    toast.show(`${committee.name} created with ${picked.length} members.`, {
      tone: 'success',
    });
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      dirty={name.trim().length > 0 || picked.length > 0}
      title="New committee"
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
          <Button variant="brush" disabled={!valid} onClick={submit}>
            Create
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
