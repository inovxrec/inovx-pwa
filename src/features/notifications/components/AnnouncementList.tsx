import { Panel } from '../../../components/Panel';
import { Button } from '../../../components/Button';
import type { Announcement } from '../types';

interface AnnouncementListProps {
  announcements: Announcement[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function AnnouncementList({
  announcements,
  loading,
  error,
  onRefresh,
}: AnnouncementListProps) {
  return (
    <div className="announcements-container">
      <div className="announcements-header">
        <div>
          <h3 className="section-title">STATION BROADCAST DIRECTIVES</h3>
          <p className="section-subtitle">
            System-wide operational announcements and command orders
          </p>
        </div>
        <Button variant="ghost" className="refresh-btn" onClick={onRefresh}>
          ↻ Refresh Broadcasts
        </Button>
      </div>

      {loading && (
        <Panel className="notif-status-panel">
          <span className="notif-loading-text">&gt; INTERCEPTING HIGH-PRIORITY BROADCASTS...</span>
        </Panel>
      )}

      {error && (
        <Panel className="notif-error-panel" bracket bracketColor="var(--st-blocked)">
          <div className="error-title">BROADCAST RETRIEVAL ERROR</div>
          <div className="error-body">{error}</div>
          <Button variant="secondary" onClick={onRefresh} style={{ marginTop: '12px' }}>
            Retry Sync
          </Button>
        </Panel>
      )}

      {!loading && !error && announcements.length === 0 && (
        <Panel className="notif-empty-panel">
          <div className="empty-glyph">📡</div>
          <h3 className="empty-title">NO ACTIVE BROADCASTS</h3>
          <p className="empty-desc">
            No active station directives are currently published or all prior announcements have
            reached expiration.
          </p>
        </Panel>
      )}

      {!loading && !error && announcements.length > 0 && (
        <div className="announcements-grid">
          {announcements.map((item) => (
            <Panel
              key={item.id}
              className={`announcement-card ${item.pinned ? 'is-pinned-card' : ''}`}
              bracket={item.pinned}
              bracketColor={item.pinned ? 'var(--phosphor)' : undefined}
            >
              <div className="announcement-top-bar">
                <div className="announcement-meta-left">
                  {item.pinned ? (
                    <span className="pinned-badge">
                      <span className="pin-icon">★</span> PINNED DIRECTIVE
                    </span>
                  ) : (
                    <span className="standard-broadcast-badge">BROADCAST</span>
                  )}
                  {item.sender_id && <span className="sender-tag">BY {item.sender_id}</span>}
                </div>

                <div className="announcement-meta-right">
                  <span className="date-tag">{formatDate(item.created_at)}</span>
                </div>
              </div>

              <h4 className="announcement-title">{item.title}</h4>
              <p className="announcement-body">{item.body}</p>

              {item.expires_at && (
                <div className="announcement-footer">
                  <span className="expiry-tag">
                    ⏱ EXPIRES: {formatDate(item.expires_at)}
                  </span>
                </div>
              )}
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
