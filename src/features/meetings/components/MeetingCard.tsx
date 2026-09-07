import { useState, useMemo } from 'react';
import { Panel } from '../../../components/Panel';
import { Pill, type Status } from '../../../components/Pill';
import type { Meeting } from '../types';

interface MeetingCardProps {
  meeting: Meeting;
  onSelect: (meeting: Meeting) => void;
}

function formatMeetingDateTime(heldAtStr: string): string {
  try {
    const d = new Date(heldAtStr);
    const dateFormatted = d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const timeStart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${dateFormatted} · ${timeStart}`;
  } catch {
    return heldAtStr;
  }
}

export function MeetingCard({ meeting, onSelect }: MeetingCardProps) {
  const [now] = useState(() => Date.now());
  const isConcluded = useMemo(() => {
    return new Date(meeting.held_at).getTime() < now || Boolean(meeting.minutes);
  }, [meeting.held_at, meeting.minutes, now]);
  const pillStatus: Status = isConcluded ? 'done' : 'todo';
  const statusLabel = isConcluded ? 'COMPLETED' : 'SCHEDULED';
  const scopeBadge = meeting.scope === 'domain' && meeting.scope_id
    ? meeting.scope_id.toUpperCase()
    : meeting.scope.toUpperCase();

  return (
    <Panel
      className="meeting-card"
      onClick={() => onSelect(meeting)}
      style={{ cursor: 'pointer' }}
    >
      <div className="meeting-card-header">
        <div className="meeting-meta-left">
          <span
            className="meeting-domain-tag"
            style={{
              color: 'var(--chan)',
              borderColor: 'rgba(255, 179, 71, 0.3)',
            }}
          >
            {scopeBadge}
          </span>
          <span className="meeting-organizer">VENUE: {meeting.venue}</span>
        </div>

        <div className="meeting-meta-right">
          <Pill status={pillStatus} label={statusLabel} />
        </div>
      </div>

      <h3 className="meeting-title">{meeting.title}</h3>

      <div className="meeting-footer">
        <div className="meeting-footer-info">
          <div className="meeting-time-row">
            <span className="info-icon">⏱</span>
            <span className="info-val">{formatMeetingDateTime(meeting.held_at)}</span>
          </div>
          <div className="meeting-venue-row">
            <span className="info-icon">📍</span>
            <span className="info-val">{meeting.venue}</span>
          </div>
        </div>

        <div className="meeting-card-action">
          {meeting.minutes ? (
            <span className="minutes-badge">✓ MINUTES LOGGED</span>
          ) : (
            <span className="open-brief-btn">ROSTER &amp; MINUTES ▸</span>
          )}
        </div>
      </div>
    </Panel>
  );
}
