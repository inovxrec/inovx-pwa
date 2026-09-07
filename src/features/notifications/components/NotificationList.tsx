import { useState } from 'react';
import { Button } from '../../../components/Button';
import { Panel } from '../../../components/Panel';
import { NotificationItem } from './NotificationItem';
import type { AppNotification } from '../types';

interface NotificationListProps {
  notifications: AppNotification[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onRefresh: () => void;
}

export function NotificationList({
  notifications,
  loading,
  error,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onRefresh,
}: NotificationListProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filtered = notifications.filter((item) => {
    if (filter === 'unread') return !item.is_read;
    return true;
  });

  return (
    <div className="notif-list-container">
      <div className="notif-controls">
        <div className="notif-filter-group">
          <button
            type="button"
            className={`notif-filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Transmissions ({notifications.length})
          </button>
          <button
            type="button"
            className={`notif-filter-btn ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread Alerts ({unreadCount})
          </button>
        </div>

        <div className="notif-control-actions">
          {unreadCount > 0 && (
            <Button
              variant="secondary"
              className="mark-all-btn"
              onClick={onMarkAllAsRead}
              title="Mark all notifications as read"
            >
              Mark All As Read
            </Button>
          )}
          <Button variant="ghost" className="refresh-btn" onClick={onRefresh} title="Refresh">
            ↻ Sync
          </Button>
        </div>
      </div>

      {loading && (
        <Panel className="notif-status-panel">
          <span className="notif-loading-text">&gt; SCANNING SUBSYSTEM TRANSMISSIONS...</span>
        </Panel>
      )}

      {error && (
        <Panel className="notif-error-panel" bracket bracketColor="var(--st-blocked)">
          <div className="error-title">COMMUNICATION LINK ERROR</div>
          <div className="error-body">{error}</div>
          <Button variant="secondary" onClick={onRefresh} style={{ marginTop: '12px' }}>
            Retry Sync
          </Button>
        </Panel>
      )}

      {!loading && !error && filtered.length === 0 && (
        <Panel className="notif-empty-panel">
          <div className="empty-glyph">⬡</div>
          <h3 className="empty-title">
            {filter === 'unread' ? 'ALL TRANSMISSIONS READ' : 'NO NOTIFICATIONS LOGGED'}
          </h3>
          <p className="empty-desc">
            {filter === 'unread'
              ? 'Your communications queue has no unread alerts. Switch to "All Transmissions" to review history.'
              : 'Station communications channel is clear. New task assignments, status shifts, and broadcasts will appear here.'}
          </p>
        </Panel>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="notif-items-wrap">
          {filtered.map((item) => (
            <NotificationItem key={item.id} notification={item} onMarkAsRead={onMarkAsRead} />
          ))}
        </div>
      )}
    </div>
  );
}
