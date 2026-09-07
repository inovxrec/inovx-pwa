import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { LAYER_LABELS, eventIsLate, type CalendarEvent } from '../../lib/club';
import { formatDate, startOfToday, type Task } from '../../lib/tasks';
import { StatePill } from '../../ui/primitives/StatePill';
import { Card, EmptyState } from '../../ui/patterns';
import { StickerCalendar } from '../../ui/stickers';

export interface AgendaProps {
  byDate: Map<string, CalendarEvent[]>;
  onOpenTask: (task: Task) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** How many days the jump strip offers. */
const STRIP_DAYS = 21;

function key(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * §9.9's mobile half: an agenda list grouped by day with sticky date headers,
 * and a horizontally scrolling week strip at the top for jumping.
 */
export function Agenda({ byDate, onOpenTask }: AgendaProps) {
  const navigate = useNavigate();
  const listRef = useRef<HTMLDivElement>(null);
  const today = startOfToday();
  const todayKey = key(today);

  const days = [...byDate.keys()].sort();

  const strip = Array.from({ length: STRIP_DAYS }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return date;
  });

  function jumpTo(target: string) {
    // The nearest day at or after the tapped one — an empty day has no heading
    // to scroll to, and silently doing nothing would read as a broken control.
    const day = days.find((value) => value >= target);
    if (!day) return;
    listRef.current
      ?.querySelector(`[data-day="${day}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="agenda">
      <div className="agenda__strip no-scrollbar" role="group" aria-label="Jump to a date">
        {strip.map((date) => {
          const value = key(date);
          const has = byDate.has(value);

          return (
            <button
              key={value}
              type="button"
              className={cn(
                'agenda__day',
                value === todayKey && 'agenda__day--today',
                has && 'agenda__day--has',
              )}
              onClick={() => jumpTo(value)}
            >
              <span className="agenda__day-name micro">{WEEKDAYS[date.getDay()]}</span>
              <span className="agenda__day-num tnum">{date.getDate()}</span>
            </button>
          );
        })}
      </div>

      {days.length === 0 ? (
        <Card>
          <EmptyState
            sticker={<StickerCalendar size="empty" />}
            title="Nothing scheduled"
            line="no deadlines, occasions or meetings in the layers you have on"
          />
        </Card>
      ) : (
        <div className="agenda__list" ref={listRef}>
          {days.map((day) => (
            <section className="agenda__group" key={day} data-day={day}>
              <h3 className="agenda__heading label">
                {formatDate(day)}
                {day === todayKey && <span className="agenda__badge micro">Today</span>}
              </h3>

              <Card className="agenda__card">
                <ul className="agenda__events" role="list">
                  {(byDate.get(day) ?? []).map((event) => (
                    <li key={event.id}>
                      <button
                        type="button"
                        className="agenda__event"
                        onClick={() => {
                          if (event.task) onOpenTask(event.task);
                          else if (event.to) navigate(event.to);
                        }}
                        disabled={!event.task && !event.to}
                      >
                        <span
                          className={cn('agenda__layer', `agenda__layer--${event.layer}`)}
                          aria-hidden="true"
                        />
                        <span className="agenda__event-body">
                          <span className="agenda__event-label body-sm">{event.label}</span>
                          <span className="agenda__event-kind micro">
                            {LAYER_LABELS[event.layer]}
                          </span>
                        </span>

                        {event.task && <StatePill state={event.task.state} />}
                        {eventIsLate(event) && (
                          <span className="agenda__late micro">Overdue</span>
                        )}
                      </button>

                      {/*
                        §9.9 — an occasion lists the poster tasks it generated
                        and each one's state, because this is the screen the
                        Design lead lives in.
                      */}
                      {event.generated && event.generated.length > 0 && (
                        <ul className="agenda__generated" role="list">
                          {event.generated.map((task) => (
                            <li key={task.id}>
                              <button
                                type="button"
                                className="agenda__generated-row"
                                onClick={() => onOpenTask(task)}
                              >
                                <span className="micro agenda__generated-num">{task.number}</span>
                                <span className="body-sm agenda__generated-title">{task.title}</span>
                                <StatePill state={task.state} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
