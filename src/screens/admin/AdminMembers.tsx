import { useMemo, useState } from 'react';
import { useTasks } from '../../store/taskStore';
import { useToast } from '../../hooks/useToast';
import {
  openCountFor, VIEWER_KIND_LABELS, type Member, type ViewerKind,
} from '../../lib/club';
import { useClub } from '../../store/ClubProvider';
import { inviteViewer } from '../../lib/db/queries';
import { describeError } from '../../lib/supabase';
import { DOMAIN_LABELS } from '../../lib/tasks';
import { Avatar } from '../../ui/primitives/Avatar';
import { Button } from '../../ui/primitives/Button';
import { Input } from '../../ui/primitives/Input';
import { Select } from '../../ui/primitives/Select';
import { Tag } from '../../ui/primitives/Tag';
import { Card, DataView, EmptyState, Modal, type Column } from '../../ui/patterns';
import { StickerCloudOff } from '../../ui/stickers';
import { SkeletonTaskCard } from '../../ui/primitives/Skeleton';
import { ADMIN_SCREENS, AdminPage } from './AdminFrame';
import './Admin.css';

const SCREEN = ADMIN_SCREENS.find((s) => s.id === 'members')!;

/** §9.15 — the member list, and the provisioning flow behind it. */
export function AdminMembers() {
  const { tasks } = useTasks();
  const { members, loading, error, reload } = useClub();
  const toast = useToast();

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [viewerKind, setViewerKind] = useState<ViewerKind>('faculty_coordinator');
  const [inviting, setInviting] = useState(false);

  const columns: Column<Member>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'Member',
        render: (row) => (
          <span className="admin__cell-person">
            <Avatar size={24} name={row.name} initials={row.initials} channel={row.domain} />
            {row.name}
          </span>
        ),
      },
      {
        id: 'title',
        header: 'Position',
        /*
          A viewer has no position in the club — that is what being a viewer
          means — so the column says which kind of watcher they are instead of
          falling through to the directory's "Member" default, which would read
          as a claim that a faculty coordinator sits on the committee.
        */
        render: (row) =>
          row.viewerKind ? VIEWER_KIND_LABELS[row.viewerKind] : row.title,
      },
      {
        id: 'domain',
        header: 'Domain',
        render: (row) => <Tag channel={row.domain}>{DOMAIN_LABELS[row.domain]}</Tag>,
      },
      {
        id: 'committees',
        header: 'Committees',
        numeric: true,
        render: (row) => row.committees.length,
      },
      {
        id: 'open',
        header: 'Open',
        numeric: true,
        render: (row) => openCountFor(row, tasks),
      },
    ],
    [tasks],
  );

  /*
    Inviting a viewer, for real.

    Issuing an account needs the service role and the browser must never hold
    that key, so this is the one thing on the screen that goes through an edge
    function. No password is minted here or shown to whoever pressed the button:
    the invitee gets a reset link and chooses their own.

    Committee members are still issued in bulk by scripts/provision-roster.mjs.
    That is 39 accounts handed out on paper at the start of a tenure, which is a
    different problem from adding one person, and this screen does not pretend
    to solve it.
  */
  async function invite() {
    setInviting(true);
    try {
      const result = await inviteViewer({ name: name.trim(), email: email.trim(), viewerKind });

      setAdding(false);
      setName('');
      setEmail('');
      await reload();

      toast.show(
        result.emailed
          ? `${name.trim()} has been invited — they will get a link to set a password.`
          : (result.warning ?? 'Account created, but the email did not send.'),
        { tone: result.emailed ? 'success' : 'error' },
      );
    } catch (caught) {
      // Left open, so the address can be corrected without retyping the name.
      toast.show(describeError(caught), { tone: 'error' });
    } finally {
      setInviting(false);
    }
  }

  return (
    <AdminPage
      screen={SCREEN}
      actions={
        <>
          <Button
            variant="outline-light"
            size="sm"
            onClick={() => toast.show('CSV import is not wired up yet.')}
          >
            Import CSV
          </Button>
          <Button variant="brush" size="sm" onClick={() => setAdding(true)}>
            Invite viewer
          </Button>
        </>
      }
    >
      <Card>
        {loading ? (
          <SkeletonTaskCard />
        ) : error ? (
          <EmptyState
            sticker={<StickerCloudOff size="empty" />}
            title="Could not read the roster"
            line={error}
          />
        ) : (
          <DataView
            label="All members"
            rows={members}
            columns={columns}
            rowKey={(row) => row.id}
            actions={() => (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toast.show('Editing a member is not wired up yet.')}
              >
                Edit
              </Button>
            )}
          />
        )}
      </Card>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        dirty={name.trim().length > 0 || email.trim().length > 0}
        title="Invite a viewer"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button
              variant="brush"
              loading={inviting}
              disabled={!name.trim() || !email.trim()}
              onClick={() => void invite()}
            >
              Send invite
            </Button>
          </>
        }
      >
        <div className="admin__form">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            hint="This is the account. It cannot be changed by the member."
          />
          <Select
            label="They are a"
            value={viewerKind}
            options={(Object.keys(VIEWER_KIND_LABELS) as ViewerKind[]).map((kind) => ({
              value: kind,
              label: VIEWER_KIND_LABELS[kind],
            }))}
            onChange={(value) => setViewerKind(value as ViewerKind)}
          />
          <p className="body-sm admin__note">
            A viewer reads everything the club is doing and changes none of it —
            no boards to move, no approvals, no members. They will be emailed a
            link to set their own password; nobody here sees it.
          </p>
        </div>
      </Modal>
    </AdminPage>
  );
}
