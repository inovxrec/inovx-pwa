import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import { usePermissionCheck } from '../../hooks/usePermission';
import { useMeetings } from '../../hooks/useMeetings';
import { useClub } from '../../store/ClubProvider';
import { useAuth } from '../../store/authStore';
import { describeError } from '../../lib/supabase';
import { insertMeeting, saveAttendance, saveMinutes } from '../../lib/db/queries';
import { useTasks } from '../../store/taskStore';
import { useBoards } from '../../store/ClubProvider';
import { type ActionItem, type Attendance, type Meeting } from '../../lib/club';
import { formatDate, type Person } from '../../lib/tasks';
import { Avatar } from '../../ui/primitives/Avatar';
import { Button } from '../../ui/primitives/Button';
import { Input } from '../../ui/primitives/Input';
import { Tag } from '../../ui/primitives/Tag';
import { Textarea } from '../../ui/primitives/Textarea';
import { DatePicker } from '../../ui/primitives/DatePicker';
import { Card, EmptyState, LinkChip, Modal, SectionHeader, SegmentedControl } from '../../ui/patterns';
import { StickerCalendar } from '../../ui/stickers';
import { SkeletonTaskCard } from '../../ui/primitives/Skeleton';
import './Meetings.css';

const ATTENDANCE_OPTIONS = [
  { id: 'present' as const, label: 'Present' },
  { id: 'absent' as const, label: 'Absent' },
  { id: 'excused' as const, label: 'Excused' },
];

/** §9.11 — the list, grouped by context, and the scheduling flow above it. */
export function Meetings() {
  const navigate = useNavigate();
  const toast = useToast();
  const can = usePermissionCheck();
  const { tenureId } = useClub();
  const { session } = useAuth();
  const { meetings, loading, error, reload } = useMeetings();

  const [scheduling, setScheduling] = useState(false);
  const [draft, setDraft] = useState({
    title: '',
    context: 'Core team',
    date: null as string | null,
    location: '',
    link: '',
  });

  const byContext = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    for (const meeting of [...meetings].sort((a, b) => b.date.localeCompare(a.date))) {
      const list = map.get(meeting.context);
      if (list) list.push(meeting);
      else map.set(meeting.context, [meeting]);
    }
    return map;
  }, [meetings]);

  async function schedule() {
    const title = draft.title.trim();
    if (!title || !draft.date || !tenureId) return;

    const link = draft.link.trim();

    try {
      await insertMeeting({
        tenureId,
        title,
        // The picker gives a date; meetings are stored to the minute, so it is
        // widened here rather than the column being narrowed.
        scheduledAt: `${draft.date}T09:00:00Z`,
        // Empty strings are absent, not empty — a meeting with no location
        // should not render a chip pointing nowhere.
        location: draft.location.trim() || null,
        // The join link rides in the description until the table has a column
        // for it; `toMeeting` reads it back out.
        description: link || null,
        createdBy: session?.userId ?? null,
      });
    } catch (caught) {
      toast.show(describeError(caught), { tone: 'error' });
      return;
    }

    setScheduling(false);
    setDraft({ title: '', context: 'Core team', date: null, location: '', link: '' });
    await reload();
    toast.show(`${title} scheduled for ${formatDate(draft.date)}.`, { tone: 'success' });
  }

  if (loading) return <SkeletonTaskCard />;

  if (error) {
    return (
      <Card>
        <EmptyState
          sticker={<StickerCalendar size="empty" />}
          title="Could not read the meetings"
          line={error}
        />
      </Card>
    );
  }

  if (meetings.length === 0) {
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
      {/* Scheduling is assigning work of a sort, so it takes the same key. */}
      {can('task.assign') && (
        <div className="meetings__actions">
          <Button variant="brush" size="sm" onClick={() => setScheduling(true)}>
            Schedule a meeting
          </Button>
        </div>
      )}

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

                    {/*
                      Where it is, at a glance. A meeting with both shows both:
                      a hybrid is a real thing and picking one would be a guess.
                    */}
                    {(meeting.location || meeting.link) && (
                      <span className="micro meetings__where">
                        {meeting.location}
                        {meeting.location && meeting.link ? ' · ' : ''}
                        {meeting.link ? 'online' : ''}
                      </span>
                    )}

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

      <Modal
        open={scheduling}
        onClose={() => setScheduling(false)}
        dirty={draft.title.trim().length > 0}
        title="Schedule a meeting"
        footer={
          <>
            <Button variant="ghost" onClick={() => setScheduling(false)}>Cancel</Button>
            <Button
              variant="brush"
              disabled={!draft.title.trim() || !draft.date}
              onClick={() => void schedule()}
            >
              Schedule
            </Button>
          </>
        }
      >
        <div className="meeting__draft">
          <Input
            label="Title"
            placeholder="Core team weekly"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          />
          <Input
            label="Context"
            hint="The group this meeting belongs to."
            value={draft.context}
            onChange={(e) => setDraft((d) => ({ ...d, context: e.target.value }))}
          />
          <DatePicker
            label="Date"
            value={draft.date}
            onChange={(value) => setDraft((d) => ({ ...d, date: value }))}
          />
          <Input
            label="Location"
            placeholder="Seminar hall 2"
            value={draft.location}
            onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
          />
          <Input
            label="Join link"
            type="url"
            placeholder="https://meet.google.com/..."
            value={draft.link}
            onChange={(e) => setDraft((d) => ({ ...d, link: e.target.value }))}
          />
          <p className="body-sm meeting__draft-note">
            Either is enough, and both is fine — a hybrid meeting has a room and
            a link.
          </p>
        </div>
      </Modal>
    </div>
  );
}

/**
 * §9.11's detail: an attendance grid, a minutes editor, and action items that
 * each turn into a task in one tap.
 */
export function MeetingDetail() {
  const { id } = useParams<{ id: string }>();
  const { meetings, loading, error } = useMeetings();

  const source = meetings.find((meeting) => meeting.id === id);

  if (loading) return <SkeletonTaskCard />;

  if (error) {
    return (
      <Card>
        <EmptyState
          sticker={<StickerCalendar size="empty" />}
          title="Could not read this meeting"
          line={error}
        />
      </Card>
    );
  }

  if (!source) return <Navigate to="/meetings" replace />;

  // Keyed on the meeting so the editor's local state is initialised from the
  // fetched minutes rather than from an empty placeholder.
  return <MeetingEditor key={source.id} source={source} />;
}

function MeetingEditor({ source }: { source: Meeting }) {
  const can = usePermissionCheck();
  const toast = useToast();
  const { tenureId } = useClub();
  const { create } = useTasks();
  const boards = useBoards();

  // Local state: minutes and attendance are edited here and saved as one write.
  const [attendance, setAttendance] = useState<Partial<Record<string, Attendance>>>(
    source.attendance,
  );
  const [minutes, setMinutes] = useState(source.minutes);
  const [actions, setActions] = useState<ActionItem[]>(source.actions);
  const [drafting, setDrafting] = useState<ActionItem | null>(null);
  const [draftTitle, setDraftTitle] = useState('');

  /** §9.11 — the person may minute a meeting only if they may assign work. */
  const editable = can('task.assign');

  function mark(person: Person, value: Attendance) {
    setAttendance((current) => ({ ...current, [person.id]: value }));
  }

  function markAllPresent() {
    setAttendance(
      Object.fromEntries(source.invited.map((person) => [person.id, 'present' as const])),
    );
  }

  function makeTask(item: ActionItem) {
    setDrafting(item);
    setDraftTitle(item.text);
  }

  async function confirmTask() {
    if (!drafting) return;

    const title = draftTitle.trim();
    if (!title) return;

    /*
      An action item belongs to whoever was given it, so the task lands on
      their domain. With nobody named it goes to the first board rather than to
      a domain that does not exist.
    */
    const domain = drafting.owner?.domain ?? boards[0]?.domain ?? 'design';
    const board = boards.find((each) => each.domain === domain);

    const task = await create({
      title,
      description: `From the minutes of ${source.title}, ${formatDate(source.date)}.`,
      domain,
      boardSlug: board?.slug ?? domain,
      boardName: board?.name ?? domain,
      priority: 'medium',
      assignees: drafting.owner ? [drafting.owner] : [],
      due: null,
    });

    if (!task) {
      toast.show('Could not raise that task.', { tone: 'error' });
      return;
    }

    setActions((current) =>
      current.map((item) =>
        item.id === drafting.id ? { ...item, taskNumber: task.number } : item,
      ),
    );
    setDrafting(null);
    toast.show(`${task.number} raised from the action item.`, { tone: 'success' });
  }

  async function publish() {
    if (!tenureId) return;

    try {
      await saveMinutes(source.id, minutes, source.link);
      await saveAttendance(
        tenureId,
        source.id,
        Object.entries(attendance)
          .filter((entry): entry is [string, Attendance] => Boolean(entry[1]))
          .map(([userId, status]) => ({ userId, status })),
      );
      toast.show('Minutes and attendance saved.', { tone: 'success' });
    } catch (caught) {
      toast.show(describeError(caught), { tone: 'error' });
    }
  }

  const present = Object.values(attendance).filter((value) => value === 'present').length;

  return (
    <div className="meeting">
      <header className="meeting__head">
        <p className="label meeting__context">{source.context}</p>
        <h2 className="display-2 meeting__title title-reveal">{source.title}</h2>
        <p className="body-sm meeting__meta">
          {formatDate(source.date)} · {source.invited.length} invited · {present} present
        </p>

        {/*
          Where to actually go, at the top where someone arriving five minutes
          late will look. The link opens in a new tab and says so.
        */}
        {(source.location || source.link) && (
          <div className="meeting__where">
            {source.location && (
              <span className="meeting__place body-sm">
                <span className="label meeting__place-key">Room</span>
                {source.location}
              </span>
            )}

            {source.link && (
              <LinkChip
                deliverable={{
                  id: 'join',
                  url: source.link,
                  label: 'Join online',
                  provider: 'link',
                  shared: true,
                }}
              />
            )}
          </div>
        )}
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
              onClick={() => void publish()}
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
                  <Tag state="done">{item.taskNumber}</Tag>
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
            <Button
              variant="brush"
              disabled={!draftTitle.trim()}
              onClick={() => void confirmTask()}
            >
              Create
            </Button>
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
