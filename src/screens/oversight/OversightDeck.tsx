import { useMemo } from 'react';
import { useTasks } from '../../store/taskStore';
import { usePermissionCheck } from '../../hooks/usePermission';
import { useToast } from '../../hooks/useToast';
import { useMeetings } from '../../hooks/useMeetings';
import { useClub, useDomainSlugs, useMe } from '../../store/ClubProvider';
import { domainRollups, oversightSummary } from '../../lib/analytics';
import type { DomainRollup } from '../../lib/analytics';
import { calendarEvents, eventIsLate, VIEWER_KIND_LABELS } from '../../lib/club';
import { formatDate, startOfToday } from '../../lib/tasks';
import { Button } from '../../ui/primitives/Button';
import { Card, DataView, type Column } from '../../ui/patterns';
import './OversightDeck.css';

/**
 * §9.6 — the faculty landing screen. Read-only: **every mutating control is
 * absent from the DOM**, not disabled. There is nothing on this screen that
 * writes, so there is nothing to gate — the only conditional control is the
 * CSV export, which needs its permission.
 */
export function OversightDeck() {
  const { tasks } = useTasks();
  const { members } = useClub();
  const { meetings } = useMeetings();
  const domains = useDomainSlugs();
  const can = usePermissionCheck();
  const toast = useToast();

  const me = useMe();
  const mine = members.find((member) => member.id === me?.id);

  const summary = useMemo(() => oversightSummary(tasks, domains), [tasks, domains]);
  const rollups = useMemo(() => domainRollups(tasks, domains), [tasks, domains]);

  /** The next few dated things — deadlines, meetings and birthdays alike. */
  const upcoming = useMemo(() => {
    const today = startOfToday().toISOString().slice(0, 10);
    return calendarEvents(tasks, members, meetings)
      .filter((event) => event.date >= today && !eventIsLate(event))
      .slice(0, 6);
  }, [tasks, members, meetings]);

  /** A meeting counts as minuted once it has something written on it. */
  const minuted = useMemo(
    () => meetings.filter((meeting) => meeting.minutes.trim().length > 0).slice(0, 5),
    [meetings],
  );

  /**
   * Attendance across the five most recent meetings. Counted from the rows the
   * meetings themselves carry, so it agrees with each meeting's own grid.
   */
  const attendance = useMemo(() => {
    const recent = meetings.slice(0, 5);
    const present = new Set<string>();
    const invited = new Set<string>();

    for (const meeting of recent) {
      for (const person of meeting.invited) invited.add(person.id);
      for (const [id, state] of Object.entries(meeting.attendance)) {
        if (state === 'present') present.add(id);
      }
    }

    return { present: present.size, invited: invited.size, meetings: recent.length };
  }, [meetings]);

  const columns: Column<DomainRollup>[] = [
    { id: 'domain', header: 'Domain', render: (row) => row.label },
    {
      id: 'completion',
      header: 'Complete',
      numeric: true,
      render: (row) => `${row.completion}%`,
    },
    { id: 'open', header: 'Open', numeric: true, render: (row) => row.open },
    {
      id: 'overdue',
      header: 'Overdue',
      numeric: true,
      render: (row) =>
        row.overdue > 0 ? (
          <span className="oversight__late">{row.overdue}</span>
        ) : (
          row.overdue
        ),
    },
  ];

  return (
    <div className="oversight">
      {/*
        §9.6 asks for plain-language sentences rather than a metric wall — the
        figures are the same ones every other screen reads, written out.
      */}
      <Card className="oversight__hero sleeve">
        {/*
          Named for what the reader actually is. The role is `faculty` for both
          groups because they may do the same things, but greeting last year's
          treasurer as faculty is simply wrong, and the support committee is the
          larger of the two groups. Absent for anyone without a kind set — the
          college's own faculty, invited before this column existed.
        */}
        {mine?.viewerKind && (
          <p className="label oversight__who">{VIEWER_KIND_LABELS[mine.viewerKind]}</p>
        )}
        <p className="body-lg read-width">{summary}</p>
      </Card>

      {/*
        §9.6's twelve-week chart is absent: a task records a status and no
        completion date, so there is no week to plot a finish against.
      */}
      <Card
        title="By domain"
        aside={
          // Absent without the permission, not disabled (§14 item 13).
          can('export.csv') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.show('Export queued — we will email the file.')}
            >
              Export CSV
            </Button>
          )
        }
      >
        <DataView
          label="Completion by domain"
          rows={rollups}
          columns={columns}
          rowKey={(row) => row.domain}
        />
      </Card>

      {upcoming.length > 0 && (
        <Card surface="mint" title="Coming up">
          <ul className="oversight__list" role="list">
            {upcoming.map((event) => (
              <li className="oversight__row" key={event.id}>
                <span className="body-sm oversight__row-name">{event.label}</span>
                <span className="micro oversight__row-meta">{formatDate(event.date)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {minuted.length > 0 && (
        <Card title="Recently published minutes">
          <ul className="oversight__list" role="list">
            {minuted.map((meeting) => (
              <li className="oversight__row" key={meeting.id}>
                <span className="body-sm oversight__row-name">{meeting.title}</span>
                <span className="micro oversight__row-meta">{formatDate(meeting.date)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {attendance.meetings > 0 && (
        <Card surface="mint" title="Attendance">
          <p className="body-sm">
            <strong className="tnum">{attendance.present}</strong> of{' '}
            <strong className="tnum">{attendance.invited}</strong> members attended at least
            one of the last <strong className="tnum">{attendance.meetings}</strong>{' '}
            {attendance.meetings === 1 ? 'meeting' : 'meetings'}.
          </p>
        </Card>
      )}
    </div>
  );
}
