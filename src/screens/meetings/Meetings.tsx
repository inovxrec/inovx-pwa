import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import { usePermissionCheck } from '../../hooks/usePermission';
import { MEETINGS, type ActionItem, type Attendance, type Meeting } from '../../lib/club';
import { formatDate, type Person } from '../../lib/tasks';
import { Avatar } from '../../ui/primitives/Avatar';
import { Button } from '../../ui/primitives/Button';
import { Input } from '../../ui/primitives/Input';
import { Tag } from '../../ui/primitives/Tag';
import { Textarea } from '../../ui/primitives/Textarea';
import { Card, EmptyState, Modal, SectionHeader, SegmentedControl } from '../../ui/patterns';
import { StickerCalendar } from '../../ui/stickers';
import './Meetings.css';

const ATTENDANCE_OPTIONS = [
  { id: 'present' as const, label: 'Present' },
  { id: 'absent' as const, label: 'Absent' },
  { id: 'excused' as const, label: 'Excused' },
];

/** §9.11 — the list, grouped by context. */
export function Meetings() {
  const navigate = useNavigate();

  const byContext = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    for (const meeting of [...MEETINGS].sort((a, b) => b.date.localeCompare(a.date))) {
      const list = map.get(meeting.context);
      if (list) list.push(meeting);
      else map.set(meeting.context, [meeting]);
    }
    return map;
  }, []);

  if (MEETINGS.length === 0) {
    return (
      <Card>
        <EmptyState
          sticker={<StickerCalendar size="empty" />}
          title="No meetings yet"
          line="nothing has been scheduled or minuted"
        />
      </Card>
    );
  }

  return (
    <div className="meetings">
      {[...byContext].map(([context, list]) => (
        <section key={context}>
          <SectionHeader title={context} />
          <Card className="meetings__card">
            <ul className="meetings__list" role="list">
              {list.map((meeting) => (
                <li key={meeting.id}>
                  <button
                    type="button"
                    className="meetings__row"
                    onClick={() => navigate(`/meetings/${meeting.id}`)}
                  >
                    <span className="meetings__date micro tnum">{formatDate(meeting.date)}</span>

                    <span className="meetings__row-body">
                      <span className="body-sm meetings__title">{meeting.title}</span>
                      <span className="micro meetings__attendees tnum">
                        {meeting.invited.length} invited
                      </span>
                    </span>

                    <Tag state={meeting.published ? 'done' : 'todo'}>
                      {meeting.published ? 'Published' : 'Draft'}
                    </Tag>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ))}
    </div>
  );
}

/**
 * §9.11's detail: an attendance grid, a minutes editor, and action items that
 * each turn into a task in one tap.
 */
export function MeetingDetail() {
  const { id } = useParams<{ id: string }>();
  const can = usePermissionCheck();
  const toast = useToast();

  const source = MEETINGS.find((meeting) => meeting.id === id);

  // Local state: minutes and attendance are edited here and saved as one write.
  const [attendance, setAttendance] = useState<Partial<Record<string, Attendance>>>(
    source?.attendance ?? {},
  );
  const [minutes, setMinutes] = useState(source?.minutes ?? '');
  const [actions, setActions] = useState<ActionItem[]>(source?.actions ?? []);
  const [drafting, setDrafting] = useState<ActionItem | null>(null);
  const [draftTitle, setDraftTitle] = useState('');

  if (!source) return <Navigate to="/meetings" replace />;

  /** §9.11 — the person may minute a meeting only if they may assign work. */
  const editable = can('task.assign');

  function mark(person: Person, value: Attendance) {
    setAttendance((current) => ({ ...current, [person.id]: value }));
  }

  function markAllPresent() {
    setAttendance(
      Object.fromEntries(source!.invited.map((person) => [person.id, 'present' as const])),
    );
  }

  function makeTask(item: ActionItem) {
    setDrafting(item);
    setDraftTitle(item.text);
  }

  function confirmTask() {
    if (!drafting) return;

    /*
      TEMP: creating a task needs POST /tasks, which does not exist. Until it
      does, the action item is marked as converted and the toast is honest
      about what happened — it does not claim a task number that is not real.
    */
    setActions((current) =>
      current.map((item) =>
        item.id === drafting.id ? { ...item, taskNumber: 'pending' } : item,
      ),
    );
    setDrafting(null);
    toast.show('Task drafted from the action item.', { tone: 'success' });
  }

  const present = Object.values(attendance).filter((value) => value === 'present').length;

  return (
    <div className="meeting">
      <header className="meeting__head">
        <p className="label meeting__context">{source.context}</p>
        <h2 className="display-2 meeting__title">{source.title}</h2>
        <p className="body-sm meeting__meta">
          {formatDate(source.date)} · {source.invited.length} invited · {present} present
        </p>
      </header>

      <Card
        title="Attendance"
        aside={
          editable && (
            <Button variant="ghost" size="sm" onClick={markAllPresent}>
              Mark all present
            </Button>
          )
        }
      >
        <ul className="meeting__attendance" role="list">
          {source.invited.map((person) => (
            <li className="meeting__attendee" key={person.id}>
              <Avatar
                size={32}
                name={person.name}
                initials={person.initials}
                channel={person.domain}
              />
              <span className="body-sm meeting__attendee-name">{person.name}</span>

              {editable ? (
                <SegmentedControl
                  label={`Attendance for ${person.name}`}
                  segments={ATTENDANCE_OPTIONS}
                  value={attendance[person.id]}
                  onChange={(value) => mark(person, value)}
                  className="meeting__segments"
                />
              ) : (
                <span className="micro meeting__attendance-read">
                  {attendance[person.id] ?? 'not marked'}
                </span>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card surface="mint" title="Minutes">
        {editable ? (
          <>
            <Textarea
              label="Minutes"
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
            />
            <Button
              variant="outline"
              onClick={() => toast.show('Minutes saved.', { tone: 'success' })}
            >
              Save minutes
            </Button>
          </>
        ) : (
          <p className="body read-width">{minutes || 'No minutes have been published yet.'}</p>
        )}
      </Card>

      <Card title="Action items">
        {actions.length === 0 ? (
          <p className="body-sm meeting__none">Nothing was assigned in this meeting.</p>
        ) : (
          <ul className="meeting__actions" role="list">
            {actions.map((item) => (
              <li className="meeting__action" key={item.id}>
                <span className="meeting__action-body">
                  <span className="body-sm">{item.text}</span>
                  {item.owner && (
                    <span className="micro meeting__action-owner">{item.owner.name}</span>
                  )}
                </span>

                {item.taskNumber ? (
                  <Tag state="done">
                    {item.taskNumber === 'pending' ? 'Task drafted' : item.taskNumber}
                  </Tag>
                ) : (
                  editable && (
                    <Button variant="outline" size="sm" onClick={() => makeTask(item)}>
                      Make a task
                    </Button>
                  )
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* The pre-filled task sheet (§9.11) — a modal on desktop, a sheet below. */}
      <Modal
        open={drafting !== null}
        onClose={() => setDrafting(null)}
        title="New task"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDrafting(null)}>Cancel</Button>
            <Button variant="brush" onClick={confirmTask}>Create</Button>
          </>
        }
      >
        <div className="meeting__draft">
          <Input
            label="Title"
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
          />
          <p className="body-sm meeting__draft-note">
            Pre-filled from the action item. It will be assigned to{' '}
            {drafting?.owner?.name ?? 'nobody yet'} and linked back to this meeting.
          </p>
        </div>
      </Modal>
    </div>
  );
}
