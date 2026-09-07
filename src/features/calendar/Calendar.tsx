import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useMeetings } from '../meetings/hooks/useMeetings';
import { MeetingDetailModal } from '../meetings/components/MeetingDetailModal';
import { Button } from '../../components/Button';
import type { Meeting } from '../meetings/types';
import './Calendar.css';

interface CalEvent {
  id?: string;
  day?: number;
  dateLabel: string;
  label: string;
  color: string;
  time?: string;
  meeting?: Meeting;
  exactDate?: string;
}

// Preserved static prototype milestone events
const NON_MEETING_EVENTS: CalEvent[] = [
  { day: 24, dateLabel: '24 AUG', label: 'Poster due', color: 'var(--chan-design)' },
  { day: 28, dateLabel: '28 AUG', label: 'Birthday poster — Ananya Rao', color: 'var(--chan-design)' },
  { day: 4, dateLabel: '04 SEP', label: "Ananya Rao's birthday 🎂", color: '#FFB347' },
];

export function Calendar() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  const {
    meetings,
    loading,
    error,
    refresh,
    update,
    cancel,
  } = useMeetings();

  // Combine non-meeting events with scheduled meetings from meetingService
  const allEvents: CalEvent[] = useMemo(() => {
    const meetingEvents: CalEvent[] = meetings.map((m) => {
      const d = new Date(m.held_at);
      const day = d.getDate();
      const dateLabel = d
        .toLocaleDateString('en-US', { day: '2-digit', month: 'short' })
        .toUpperCase();
      const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

      return {
        id: m.id,
        day,
        dateLabel,
        label: m.title,
        color: m.domain ? `var(--chan-${m.domain}, var(--chan))` : 'var(--chan-technical)',
        time,
        meeting: m,
        exactDate: d.toISOString().slice(0, 10),
      };
    });

    return [...meetingEvents, ...NON_MEETING_EVENTS];
  }, [meetings]);

  // Compute 7 days for the displayed week based on weekOffset
  const gridDays = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const distanceToMon = (currentDay + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - distanceToMon + weekOffset * 7);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const isoDate = d.toISOString().slice(0, 10);
      const isToday = d.toDateString() === now.toDateString();

      days.push({
        date: d,
        isoDate,
        day: d.getDate(),
        dayLabel: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
        isToday,
      });
    }
    return days;
  }, [weekOffset]);

  const weekRangeLabel = useMemo(() => {
    if (gridDays.length < 7) return '';
    const start = gridDays[0].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end = gridDays[6].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${start} — ${end}`;
  }, [gridDays]);

  function getEventsForGridDay(dayNum: number, isoDate: string) {
    return allEvents.filter((e) => {
      if (e.exactDate) {
        return e.exactDate === isoDate;
      }
      return e.day === dayNum;
    });
  }

  const handleSaveMinutes = async (id: string, minutes: string) => {
    await update(id, { minutes });
    if (selectedMeeting?.id === id) {
      setSelectedMeeting((prev) => (prev ? { ...prev, minutes } : null));
    }
  };

  const handleCancelMeeting = async (id: string) => {
    await cancel(id);
    if (selectedMeeting?.id === id) {
      setSelectedMeeting(null);
    }
  };

  return (
    <div>
      <div className="cal-top-bar">
        <div>
          <h1 className="st" style={{ margin: 0 }}>Calendar</h1>
        </div>

        <div className="cal-nav-group">
          <button
            type="button"
            className="cal-nav-btn"
            onClick={() => setWeekOffset((prev) => prev - 1)}
            title="Previous Week"
          >
            ‹ Prev
          </button>
          <span className="cal-current-label">{weekRangeLabel}</span>
          <button
            type="button"
            className="cal-nav-btn"
            onClick={() => setWeekOffset((prev) => prev + 1)}
            title="Next Week"
          >
            Next ›
          </button>
          {weekOffset !== 0 && (
            <button
              type="button"
              className="cal-nav-btn"
              onClick={() => setWeekOffset(0)}
              title="Return to This Week"
            >
              Today
            </button>
          )}
          <Button
            variant="secondary"
            onClick={() => navigate('/meetings')}
            style={{ fontSize: '11px', padding: '3px 8px' }}
          >
            Briefings Deck ▸
          </Button>
        </div>
      </div>

      {loading && (
        <div className="cal-status-text">&gt; INTERCEPTING SCHEDULED BRIEFINGS &amp; SPRINT MILESTONES...</div>
      )}

      {error && (
        <div className="cal-status-text" style={{ borderColor: 'var(--st-blocked)', color: 'var(--st-blocked)' }}>
          CALENDAR SYNC WARNING: {error}
          <button type="button" onClick={refresh} className="cal-nav-btn" style={{ marginLeft: '8px' }}>
            Retry
          </button>
        </div>
      )}

      {!isMobile && (
        <div className="cal-grid">
          {gridDays.map((dayObj) => {
            const dayEvents = getEventsForGridDay(dayObj.day, dayObj.isoDate);
            return (
              <div className={`cal-cell ${dayObj.isToday ? 'is-today' : ''}`} key={dayObj.isoDate}>
                <div className="cal-cell-header">
                  <span className="cal-cell-day">{dayObj.day}</span>
                  <span className="cal-cell-weekday">{dayObj.dayLabel}</span>
                </div>

                {dayEvents.map((e) => (
                  <div
                    key={e.id || `${e.label}-${e.day}`}
                    className={`cal-event-item ${e.meeting ? 'is-meeting-event' : ''}`}
                    onClick={() => {
                      if (e.meeting) {
                        setSelectedMeeting(e.meeting);
                      }
                    }}
                    title={e.meeting ? `${e.label} (Click to view roster/minutes)` : e.label}
                  >
                    <span className="cal-dot" style={{ background: e.color }} />
                    <span>{e.label}</span>
                    {e.time && (
                      <span style={{ display: 'block', fontSize: '9px', color: 'var(--ink-3)', marginTop: '2px' }}>
                        {e.time}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {isMobile && (
        <div className="cal-agenda">
          {allEvents.length === 0 ? (
            <div className="cal-status-text">No events or briefings on the agenda.</div>
          ) : (
            allEvents.map((e) => (
              <div
                className={`agenda-row ${e.meeting ? 'is-meeting-clickable' : ''}`}
                key={e.id || `${e.label}-${e.dateLabel}`}
                onClick={() => {
                  if (e.meeting) {
                    setSelectedMeeting(e.meeting);
                  }
                }}
              >
                <div className="agenda-date">{e.dateLabel}</div>
                <div className="agenda-info">
                  <span className="cal-dot" style={{ background: e.color }} />
                  <span className="agenda-label">{e.label}</span>
                  {e.time && (
                    <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>({e.time})</span>
                  )}
                  {e.meeting && <span className="agenda-meeting-tag">BRIEFING ▸</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Part F Meeting Detail Modal */}
      {selectedMeeting && (
        <MeetingDetailModal
          meeting={selectedMeeting}
          onClose={() => setSelectedMeeting(null)}
          onEdit={() => {
            setSelectedMeeting(null);
            navigate('/meetings');
          }}
          onCancelMeeting={handleCancelMeeting}
          onSaveMinutes={handleSaveMinutes}
        />
      )}
    </div>
  );
}
