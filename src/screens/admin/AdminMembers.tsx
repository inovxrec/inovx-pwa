import { useMemo, useState } from 'react';
import { useTasks } from '../../store/taskStore';
import { useToast } from '../../hooks/useToast';
import { temporaryPassword } from '../../lib/admin';
import { MEMBERS, openCountFor, type Member } from '../../lib/club';
import { BOARDS } from '../../lib/mockTasks';
import { DOMAIN_LABELS, type Domain } from '../../lib/tasks';
import { Avatar } from '../../ui/primitives/Avatar';
import { Button } from '../../ui/primitives/Button';
import { Input } from '../../ui/primitives/Input';
import { Select } from '../../ui/primitives/Select';
import { Tag } from '../../ui/primitives/Tag';
import { Card, DataView, Modal, type Column } from '../../ui/patterns';
import { ADMIN_SCREENS, AdminPage } from './AdminFrame';
import './Admin.css';

const SCREEN = ADMIN_SCREENS.find((s) => s.id === 'members')!;

interface Provisioned {
  name: string;
  email: string;
  password: string;
}

/** §9.15 — the member list, and the provisioning flow behind it. */
export function AdminMembers() {
  const { tasks } = useTasks();
  const toast = useToast();

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [domain, setDomain] = useState<Domain>('design');
  /** The result card. Shown once, and never recoverable afterwards. */
  const [issued, setIssued] = useState<Provisioned | null>(null);

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

  function provision() {
    const trimmed = name.trim();
    if (!trimmed || !email.trim()) return;

    setIssued({ name: trimmed, email: email.trim(), password: temporaryPassword() });
    setAdding(false);
    setName('');
    setEmail('');
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
      {/*
        §9.15 — shown once, with a warning that says so. There is deliberately
        no way back to it: if it is lost the account is reset, not recovered.
      */}
      {issued && (
        <Card surface="mint" title="Account issued" className="admin__issued">
          <p className="body-sm">
            <strong>{issued.name}</strong> can sign in as {issued.email} with this
            password. It is shown once and cannot be looked up again — send it to
            them now.
          </p>

          <div className="admin__password">
            <code className="admin__password-value">{issued.password}</code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void navigator.clipboard?.writeText(issued.password);
                toast.show('Temporary password copied.', { tone: 'success' });
              }}
            >
              Copy
            </Button>
          </div>

          <Button variant="ghost" size="sm" onClick={() => setIssued(null)}>
            I have sent it
          </Button>
        </Card>
      )}

      <Card>
        <DataView
          label="All members"
          rows={MEMBERS}
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
            options={BOARDS.map((board) => ({
              value: board.domain,
              label: board.name,
              dot: `var(--dom-${board.domain})`,
            }))}
            onChange={(value) => setDomain(value as Domain)}
          />
          <p className="body-sm admin__note">
            A temporary password is generated when the account is issued, and
            shown to you once.
          </p>
        </div>
      </Modal>
    </AdminPage>
  );
}
