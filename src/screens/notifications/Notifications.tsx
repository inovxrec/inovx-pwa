import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { useAuth } from '../../store/authStore';
import { describeError } from '../../lib/supabase';
import { fetchNotifications, markNotificationsRead } from '../../lib/db/queries';
import { type AppNotification } from '../../lib/club';
import { relativeTime } from '../../lib/tasks';
import { Avatar } from '../../ui/primitives/Avatar';
import { Button } from '../../ui/primitives/Button';
import { Card, EmptyState, SectionHeader } from '../../ui/patterns';
import { StickerBell } from '../../ui/stickers';
import { SkeletonTaskCard } from '../../ui/primitives/Skeleton';
import './Notifications.css';

/** Anything within this many hours is TODAY (§9.13). */
const TODAY_HOURS = 24;

/**
 * §9.13 — grouped TODAY / EARLIER, unread rows on --paper-hi with a flame dot
 * at the leading edge, and a "mark all read" ghost action.
 */
export function Notifications() {
  const navigate = useNavigate();
  const { session } = useAuth();

  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Read once at mount, so the grouping does not shift under a re-render.
  const [mountedAt] = useState(() => Date.now());

  const userId = session?.userId;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    setLoading(true);
    fetchNotifications(userId)
      .then((rows) => !cancelled && setItems(rows))
      .catch((caught) => !cancelled && setError(describeError(caught)))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const { today, earlier } = useMemo(() => {
    const cutoff = mountedAt - TODAY_HOURS * 3_600_000;
    return {
      today: items.filter((item) => new Date(item.at).getTime() >= cutoff),
      earlier: items.filter((item) => new Date(item.at).getTime() < cutoff),
    };
  }, [items, mountedAt]);

  const unread = items.filter((item) => !item.read).length;

  function open(item: AppNotification) {
    setItems((current) =>
      current.map((n) => (n.id === item.id ? { ...n, read: true } : n)),
    );
    // The row is already marked here; a failed write only means it comes back
    // unread on the next visit, which is the safer way round.
    if (!item.read) void markNotificationsRead([item.id]);
    if (item.to) navigate(item.to);
  }

  function markAllRead() {
    const ids = items.filter((n) => !n.read).map((n) => n.id);
    setItems((current) => current.map((n) => ({ ...n, read: true })));
    if (ids.length > 0) void markNotificationsRead(ids);
  }

  if (loading) return <SkeletonTaskCard />;

  if (error) {
    return (
      <Card>
        <EmptyState
          sticker={<StickerBell size="empty" />}
          title="Could not read your notifications"
          line={error}
        />
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <EmptyState
          sticker={<StickerBell size="empty" />}
          title="Nothing new"
          line="we'll tell you when something needs you"
        />
      </Card>
    );
  }

  function group(title: string, rows: AppNotification[]) {
    if (rows.length === 0) return null;

    return (
      <section>
        <SectionHeader title={title} />
        <Card className="alerts__card">
          <ul className="alerts__list" role="list">
            {rows.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={cn('alerts__row', !item.read && 'alerts__row--unread')}
                  onClick={() => open(item)}
                >
                  {/* The dot marks unread; the row's background says it too. */}
                  <span className="alerts__dot" aria-hidden="true" />
                  {!item.read && <span className="sr-only">Unread. </span>}

                  {item.actor ? (
                    <Avatar
                      size={32}
                      name={item.actor.name}
                      initials={item.actor.initials}
                      channel={item.actor.domain}
                    />
                  ) : (
                    <span className="alerts__sticker" aria-hidden="true">
                      <StickerBell size="inline" />
                    </span>
                  )}

                  <span className="alerts__body body-sm">
                    {item.actor && <strong className="alerts__actor">{item.actor.name}</strong>}
                    {item.actor ? ' ' : ''}
                    {item.message}
                    {/* What was said, under who said it. */}
                    {item.detail && <span className="alerts__detail">{item.detail}</span>}
                  </span>

                  <time className="alerts__age micro" dateTime={item.at}>
                    {relativeTime(item.at)}
                  </time>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    );
  }

  return (
    <div className="alerts">
      {unread > 0 && (
        <div className="alerts__head">
          <p className="body-sm alerts__count">
            {unread} unread
          </p>
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            Mark all read
          </Button>
        </div>
      )}

      {group('Today', today)}
      {group('Earlier', earlier)}
    </div>
  );
}
