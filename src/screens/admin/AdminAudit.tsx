import { useEffect, useMemo, useState } from 'react';
import { useClub } from '../../store/ClubProvider';
import { describeError } from '../../lib/supabase';
import { fetchAudit } from '../../lib/db/queries';
import { toPerson } from '../../lib/db/map';
import type { AuditEntry } from '../../lib/admin';
import { relativeTime } from '../../lib/tasks';
import { Avatar } from '../../ui/primitives/Avatar';
import { Select } from '../../ui/primitives/Select';
import { Card, DataView, EmptyState, SearchBar, type Column } from '../../ui/patterns';
import { StickerClipboard } from '../../ui/stickers';
import { SkeletonTaskCard } from '../../ui/primitives/Skeleton';
import { ADMIN_SCREENS, AdminPage } from './AdminFrame';
import './Admin.css';

const SCREEN = ADMIN_SCREENS.find((s) => s.id === 'audit')!;

/** §9.15 — a filterable DataView; on mobile each entry becomes a card. */
export function AdminAudit() {
  const { tenureId, members } = useClub();

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [actor, setActor] = useState('all');

  useEffect(() => {
    if (!tenureId) return;
    let cancelled = false;

    setLoading(true);
    fetchAudit(tenureId)
      .then((rows) => {
        if (cancelled) return;
        setEntries(
          rows.map((row) => ({
            id: row.id,
            actor: row.users ? toPerson(row.users) : undefined,
            action: row.action,
            // The log records what changed by id; the type reads better first.
            target: `${row.entity_type}${row.entity_id ? ` ${row.entity_id}` : ''}`,
            at: row.created_at,
          })),
        );
      })
      .catch((caught) => !cancelled && setError(describeError(caught)))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [tenureId]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return entries.filter((entry) => {
      if (actor !== 'all' && entry.actor?.id !== actor) return false;
      if (!needle) return true;
      return `${entry.action} ${entry.target}`.toLowerCase().includes(needle);
    });
  }, [entries, query, actor]);

  const columns: Column<AuditEntry>[] = [
    {
      id: 'actor',
      header: 'Who',
      render: (row) =>
        row.actor ? (
          <span className="admin__cell-person">
            <Avatar
              size={24}
              name={row.actor.name}
              initials={row.actor.initials}
              channel={row.actor.domain}
            />
            {row.actor.name}
          </span>
        ) : (
          // A deleted account still leaves its trail behind.
          <span className="admin__cell-person">Removed account</span>
        ),
    },
    { id: 'action', header: 'Action', render: (row) => row.action },
    { id: 'target', header: 'What', render: (row) => row.target },
    {
      id: 'at',
      header: 'When',
      numeric: true,
      render: (row) => <time dateTime={row.at}>{relativeTime(row.at)} ago</time>,
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
            ...members.map((member) => ({ value: member.id, label: member.name })),
          ]}
          onChange={(value) => setActor(value as string)}
        />
      </div>

      <Card>
        {loading ? (
          <SkeletonTaskCard />
        ) : error ? (
          <EmptyState
            sticker={<StickerClipboard size="empty" />}
            title="Could not read the log"
            line={error}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            sticker={<StickerClipboard size="empty" />}
            title={entries.length === 0 ? 'Nothing logged yet' : 'Nothing matches'}
            line={
              entries.length === 0
                ? 'changes will show up here as people make them'
                : 'try a different person, or clear the search'
            }
          />
        ) : (
          <DataView label="Audit log" rows={rows} columns={columns} rowKey={(row) => row.id} />
        )}
      </Card>
    </AdminPage>
  );
}
