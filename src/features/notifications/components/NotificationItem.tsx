import { Button } from '../../../components/Button';
import type { AppNotification } from '../types';

interface NotificationItemProps {
  notification: AppNotification;
  onMarkAsRead: (id: string) => void;
}

function formatRelativeTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const diffMs = Date.now() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return dateStr;
  }
}

const TYPE_BADGES: Record<string, { label: string; color: string }> = {
  task_assigned: { label: 'ASSIGNMENT', color: 'var(--chan-technical)' },
  task_status: { label: 'STATUS', color: 'var(--chan-management)' },
  deadline_reminder: { label: 'DEADLINE', color: 'var(--chan-events)' },
  announcement: { label: 'BROADCAST', color: 'var(--chan-design)' },
  mention: { label: 'MENTION', color: 'var(--chan-media)' },
  system: { label: 'SYSTEM', color: 'var(--ink-2)' },
};

export function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const badge = TYPE_BADGES[notification.type] || TYPE_BADGES.system;

  return (
    <div className={`notif-card ${notification.is_read ? 'is-read' : 'is-unread'}`}>
      <div className="notif-indicator">
        {!notification.is_read ? <span className="unread-dot" title="Unread alert" /> : null}
      </div>

      <div className="notif-body">
        <div className="notif-header">
          <span
            className="notif-type-tag"
            style={{ color: badge.color, borderColor: `${badge.color}44` }}
          >
            {badge.label}
          </span>
          <span className="notif-timestamp">{formatRelativeTime(notification.created_at)}</span>
        </div>

        <h4 className="notif-title">{notification.title}</h4>
        <p className="notif-message">{notification.message}</p>
      </div>

      <div className="notif-actions">
        {!notification.is_read && (
          <Button
            variant="ghost"
            className="notif-mark-btn"
            onClick={() => onMarkAsRead(notification.id)}
            title="Mark as read"
          >
            Mark Read
          </Button>
        )}
      </div>
    </div>
  );
}
