import { useIsMobile } from '../../hooks/useMediaQuery';
import './Calendar.css';

interface CalEvent {
  day: number;       // day-of-month for the grid
  dateLabel: string; // "28 AUG" for the agenda row
  label: string;
  color: string;      // CSS color value, e.g. 'var(--chan-design)'
}

// TEMP: swap for a real fetch('/api/events') once the backend endpoint exists.
const EVENTS: CalEvent[] = [
  { day: 24, dateLabel: '24 AUG', label: 'Poster due', color: 'var(--chan-design)' },
  { day: 28, dateLabel: '28 AUG', label: 'Birthday poster — Ananya Rao', color: 'var(--chan-design)' },
  { day: 30, dateLabel: '30 AUG', label: 'Core team meeting', color: '#9FA8FF' },
  { day: 4, dateLabel: "04 SEP", label: "Ananya Rao's birthday 🎂", color: '#FFB347' },
];

// Simple 7-day-wide grid starting at day 24 to match the prototype's sample week.
const GRID_DAYS = [24, 25, 26, 27, 28, 29, 30];

function eventsForDay(day: number) {
  return EVENTS.filter((e) => e.day === day);
}

export function Calendar() {
  const isMobile = useIsMobile();

  return (
    <div>
      <h1 className="st">Calendar</h1>

      {!isMobile && (
        <div className="cal-grid">
          {GRID_DAYS.map((day) => (
            <div className="cal-cell" key={day}>
              {day}
              {eventsForDay(day).map((e) => (
                <div key={e.label}>
                  <span className="cal-dot" style={{ background: e.color }} />
                  {e.label}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {isMobile && (
        <div className="cal-agenda">
          {EVENTS.map((e) => (
            <div className="agenda-row" key={e.label}>
              <div className="agenda-date">{e.dateLabel}</div>
              <div>
                {e.label} <span className="cal-dot" style={{ background: e.color }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
