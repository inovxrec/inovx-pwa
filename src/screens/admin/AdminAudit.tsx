import { useMemo, useState } from 'react';
import { AUDIT, type AuditEntry } from '../../lib/admin';
import { MEMBERS } from '../../lib/club';
import { relativeTime } from '../../lib/tasks';
import { Avatar } from '../../ui/primitives/Avatar';
import { Select } from '../../ui/primitives/Select';
import { Card, DataView, EmptyState, SearchBar, type Column } from '../../ui/patterns';
import { StickerClipboard } from '../../ui/stickers';
import { ADMIN_SCREENS, AdminPage } from './AdminFrame';
import './Admin.css';

const SCREEN = ADMIN_SCREENS.find((s) => s.id === 'audit')!;

/** §9.15 — a filterable DataView; on mobile each entry becomes a card. */
export function AdminAudit() {
  const [query, setQuery] = useState('');
  const [actor, setActor] = useState('all');

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return AUDIT.filter((entry) => {
      if (actor !== 'all' && entry.actor.id !== actor) return false;
      if (!needle) return true;
      return `${entry.action} ${entry.target}`.toLowerCase().includes(needle);
    });
  }, [query, actor]);

  const columns: Column<AuditEntry>[] = [
    {
      id: 'actor',
      header: 'Who',
      render: (row) => (
        <span className="admin__cell-person">
          <Avatar
            size={24}
            name={row.actor.name}
            initials={row.actor.initials}
            channel={row.actor.domain}
          />
          {row.actor.name}
        </span>
      ),
    },
    { id: 'action', header: 'Action', render: (row) => row.action },
    { id: 'target', header: 'What', render: (row) => row.target },
    {
      id: 'at',
      header: 'When',
      numeric: true,
      render: (row) => (
        <time dateTime={row.at}>{relativeTime(row.at)} ago</time>
      ),
    },
  ];

  return (
    <AdminPage screen={SCREEN}>
      <div className="admin__controls">
        <SearchBar
          className="admin__search"
          label="Search the audit log"
          value={query}
          onChange={setQuery}
        />
        <Select
          className="admin__actor"
          label="Actor"
          labelHidden
          value={actor}
          options={[
            { value: 'all', label: 'Everyone' },
            ...MEMBERS.map((member) => ({ value: member.id, label: member.name })),
          ]}
          onChange={(value) => setActor(value as string)}
        />
      </div>

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            sticker={<StickerClipboard size="empty" />}
            title="Nothing matches"
            line="try a different person, or clear the search"
          />
        ) : (
          <DataView
            label="Audit log"
            rows={rows}
            columns={columns}
            rowKey={(row) => row.id}
          />
        )}
      </Card>
    </AdminPage>
  );
}
