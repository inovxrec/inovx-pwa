import { useMemo, useState } from 'react';
import { useTasks } from '../../store/taskStore';
import { useToast } from '../../hooks/useToast';
import { openCountFor, type Member } from '../../lib/club';
import { useBoards, useClub } from '../../store/ClubProvider';
import { DOMAIN_LABELS, type Domain } from '../../lib/tasks';
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
  const { members, loading, error } = useClub();
  const boards = useBoards();
  const toast = useToast();

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [domain, setDomain] = useState<Domain>(boards[0]?.domain ?? 'design');

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
      { id: 'title', header: 'Position', render: (row) => row.title },
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
    Issuing an account means creating an auth user and a temporary password,
    which needs the service role — the browser must never hold that key. It
    belongs to the bulk-import function, so this form stops here rather than
    minting a password the server never saw.
  */
  function provision() {
    setAdding(false);
    setName('');
    setEmail('');
    toast.show('Issuing accounts runs on the server — that endpoint is not wired up yet.');
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
            Add member
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
        title="Add a member"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button
              variant="brush"
              disabled={!name.trim() || !email.trim()}
              onClick={provision}
            >
              Issue account
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
            label="Domain"
            value={domain}
            options={boards.map((board) => ({
              value: board.domain,
              label: board.name,
              dot: `var(--dom-${board.domain})`,
            }))}
            onChange={(value) => setDomain(value as Domain)}
          />
          <p className="body-sm admin__note">
            Accounts are issued by the server, which generates the temporary
            password. That endpoint is not wired up yet.
          </p>
        </div>
      </Modal>
    </AdminPage>
  );
}
