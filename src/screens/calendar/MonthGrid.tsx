import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { eventIsLate, type CalendarEvent } from '../../lib/club';
import { startOfToday, type Task } from '../../lib/tasks';
import { Button } from '../../ui/primitives/Button';
import { IconButton } from '../../ui/primitives/IconButton';
import { IconChevronLeft, IconChevronRight } from '../../ui/icons';

export interface MonthGridProps {
  byDate: Map<string, CalendarEvent[]>;
  onOpenTask: (task: Task) => void;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** §9.9 — up to three chips per cell, then "+n more". */
const CELL_LIMIT = 3;

function key(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** The six-week window a month grid draws, Monday first. */
function monthCells(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  // getDay() is Sunday-first; shift it so Monday is column one.
  const lead = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - lead);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

/** §9.9's desktop half: a month grid on a paper card, 96px day cells. */
export function MonthGrid({ byDate, onOpenTask }: MonthGridProps) {
  const navigate = useNavigate();
  const today = startOfToday();
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  /** Which day has had its "+n more" expanded. */
  const [expanded, setExpanded] = useState<string | null>(null);

  const cells = monthCells(cursor.getFullYear(), cursor.getMonth());
  const todayKey = key(today);

  function step(months: number) {
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + months, 1));
    setExpanded(null);
  }

  return (
    <div className="month">
      <header className="month__head">
        <IconButton label="Previous month" icon={<IconChevronLeft />} onClick={() => step(-1)} />
        <h2 className="month__title display-3">
          {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
        </h2>
        <IconButton label="Next month" icon={<IconChevronRight />} onClick={() => step(1)} />
        <Button
          variant="ghost"
          size="sm"
          className="month__today"
          onClick={() => step(
            (today.getFullYear() - cursor.getFullYear()) * 12 + today.getMonth() - cursor.getMonth(),
          )}
        >
          Today
        </Button>
      </header>

      <div className="month__weekdays" aria-hidden="true">
        {WEEKDAYS.map((day) => (
          <span className="month__weekday label" key={day}>{day}</span>
        ))}
      </div>

      <div className="month__grid" role="grid" aria-label={`${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`}>
        {cells.map((date) => {
          const cellKey = key(date);
          /*
            An occasion's generated poster tasks become chips of their own in
            the same cell, so the desktop grid shows what §9.9 asks the agenda
            to show. §8 requires both halves of a fork to expose the same thing.
          */
          const events = (byDate.get(cellKey) ?? []).flatMap<CalendarEvent>((event) =>
            event.generated && event.generated.length > 0
              ? [
                  event,
                  ...event.generated.map((task) => ({
                    id: `gen-${task.id}`,
                    layer: 'deadlines' as const,
                    date: event.date,
                    label: task.title,
                    task,
                  })),
                ]
              : [event],
          );
          const outside = date.getMonth() !== cursor.getMonth();
          const weekend = date.getDay() === 0 || date.getDay() === 6;
          const isToday = cellKey === todayKey;
          const showAll = expanded === cellKey;
          const shown = showAll ? events : events.slice(0, CELL_LIMIT);
          const hidden = events.length - shown.length;

          return (
            <div
              key={cellKey}
              role="gridcell"
              className={cn(
                'month__cell',
                outside && 'month__cell--outside',
                weekend && 'month__cell--weekend',
                isToday && 'month__cell--today',
              )}
            >
              <span className="month__date tnum micro">
                {date.getDate()}
                {isToday && <span className="sr-only"> (today)</span>}
              </span>

              <ul className="month__events" role="list">
                {shown.map((event) => (
                  <li key={event.id}>
                    <button
                      type="button"
                      className={cn(
                        'month__chip',
                        `month__chip--${event.layer}`,
                        eventIsLate(event) && 'month__chip--late',
                      )}
                      onClick={() => {
                        if (event.task) onOpenTask(event.task);
                        else if (event.to) navigate(event.to);
                      }}
                      disabled={!event.task && !event.to}
                    >
                      {event.label}
                    </button>
                  </li>
                ))}
              </ul>

              {hidden > 0 && (
                <button
                  type="button"
                  className="month__more micro"
                  onClick={() => setExpanded(cellKey)}
                >
                  +{hidden} more
                </button>
              )}

              {showAll && events.length > CELL_LIMIT && (
                <button
                  type="button"
                  className="month__more micro"
                  onClick={() => setExpanded(null)}
                >
                  Show less
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
