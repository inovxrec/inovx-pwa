import { useMemo } from 'react';
import { useTasks } from '../../store/taskStore';
import { usePermissionCheck } from '../../hooks/usePermission';
import { useToast } from '../../hooks/useToast';
import {
  ACTIVITY_12W, ATTENDANCE, MINUTES, UPCOMING, domainRollups, oversightSummary,
} from '../../lib/analytics';
import type { DomainRollup } from '../../lib/analytics';
import { Button } from '../../ui/primitives/Button';
import { Avatar } from '../../ui/primitives/Avatar';
import { Card, DataView, type Column } from '../../ui/patterns';
import { LineChart } from '../../ui/charts/LineChart';
import './OversightDeck.css';

/**
 * §9.6 — the faculty landing screen. Read-only: **every mutating control is
 * absent from the DOM**, not disabled. There is nothing on this screen that
 * writes, so there is nothing to gate — the only conditional control is the
 * CSV export, which needs its permission.
 */
export function OversightDeck() {
  const { tasks } = useTasks();
  const can = usePermissionCheck();
  const toast = useToast();

  const summary = useMemo(() => oversightSummary(tasks), [tasks]);
  const rollups = useMemo(() => domainRollups(tasks), [tasks]);

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
        <p className="body-lg read-width">{summary}</p>
      </Card>

      <Card surface="mint" title="Twelve weeks of activity">
        <LineChart
          points={ACTIVITY_12W.map((week) => ({ label: week.label, value: week.completed }))}
          title="Tasks completed per week, last twelve weeks"
          unit="tasks completed"
        />
      </Card>

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

      <Card surface="mint" title="Coming up">
        <ul className="oversight__list" role="list">
          {UPCOMING.map((event) => (
            <li className="oversight__row" key={event.id}>
              <span className="body-sm oversight__row-name">{event.label}</span>
              <span className="micro oversight__row-meta">{event.when}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Recently published minutes">
        <ul className="oversight__list" role="list">
          {MINUTES.map((entry) => (
            <li className="oversight__row" key={entry.id}>
              <Avatar
                size={24}
                name={entry.by.name}
                initials={entry.by.initials}
                channel={entry.by.domain}
              />
              <span className="body-sm oversight__row-name">{entry.label}</span>
              <span className="micro oversight__row-meta">{entry.by.name}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card surface="mint" title="Attendance">
        <p className="body-sm">
          <strong className="tnum">{ATTENDANCE.present}</strong> of{' '}
          <strong className="tnum">{ATTENDANCE.invited}</strong> members attended at least one of
          the last <strong className="tnum">{ATTENDANCE.meetings}</strong> meetings.
        </p>
      </Card>
    </div>
  );
}
