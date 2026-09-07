import { useMemo, useState } from 'react';
import { useTasks } from '../../store/taskStore';
import { useIsDesktop } from '../../hooks/useBreakpoint';
import { useOpenTask } from '../../hooks/useOpenTask';
import { useMeetings } from '../../hooks/useMeetings';
import { useClub } from '../../store/ClubProvider';
import {
  LAYER_LABELS, calendarEvents, eventsByDate, type CalendarLayer,
} from '../../lib/club';
import { Chip } from '../../ui/primitives/Chip';
import { Card } from '../../ui/patterns';
import { MonthGrid } from './MonthGrid';
import { Agenda } from './Agenda';
import './Calendar.css';

const LAYERS: CalendarLayer[] = ['deadlines', 'occasions', 'meetings', 'events'];

/**
 * §9.9 — responsive fork #6 (§8): a month grid on desktop, an agenda list with
 * a week strip on mobile.
 *
 * The layer toggles and the event list are shared, so both halves always show
 * the same things.
 */
export function Calendar() {
  const { tasks } = useTasks();
  const { members } = useClub();
  const { meetings } = useMeetings();
  const isDesktop = useIsDesktop();
  const openTask = useOpenTask();

  const [layers, setLayers] = useState<CalendarLayer[]>(LAYERS);

  const events = useMemo(() => calendarEvents(tasks, members, meetings), [tasks, members, meetings]);
  const visible = useMemo(
    () => events.filter((event) => layers.includes(event.layer)),
    [events, layers],
  );
  const byDate = useMemo(() => eventsByDate(visible), [visible]);

  function toggle(layer: CalendarLayer) {
    setLayers((current) =>
      current.includes(layer) ? current.filter((l) => l !== layer) : [...current, layer],
    );
  }

  return (
    <div className="cal">
      <div className="cal__layers no-scrollbar" role="group" aria-label="Calendar layers">
        {LAYERS.map((layer) => (
          <Chip
            key={layer}
            variant="toggle"
            tone="ink"
            selected={layers.includes(layer)}
            onClick={() => toggle(layer)}
          >
            {LAYER_LABELS[layer]}
          </Chip>
        ))}
      </div>

      {isDesktop ? (
        <Card className="cal__card">
          <MonthGrid byDate={byDate} onOpenTask={openTask} />
        </Card>
      ) : (
        <Agenda byDate={byDate} onOpenTask={openTask} />
      )}
    </div>
  );
}
