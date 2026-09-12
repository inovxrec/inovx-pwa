import { useMemo } from 'react';
import { useTasks } from '../../store/taskStore';
import { useAuth } from '../../store/authStore';
import { usePermissionCheck } from '../../hooks/usePermission';
import { useClub, useDomainSlugs } from '../../store/ClubProvider';
import {
  OVERDUE_THRESHOLD, deckStats, domainRollups, leaderboard, workload,
} from '../../lib/analytics';
import { Avatar } from '../../ui/primitives/Avatar';
import { Tag } from '../../ui/primitives/Tag';
import { Card, StatCard } from '../../ui/patterns';
import { BarChart } from '../../ui/charts/BarChart';
import './Insights.css';

/** §9.12 — a maximum of ten rows. */
const LEADERBOARD_MAX = 10;

/**
 * §9.12 — the stat row, the twelve-week activity chart, per-domain completion,
 * workload by member, and the leaderboard.
 *
 * Every chart here labels each row with its own name, so nothing is read by
 * hue. The domain channel tokens are the only series colours §3 allows and they
 * sit too close in lightness to carry identity on their own — the colour is a
 * second cue, never the encoding.
 */
export function Insights() {
  const { tasks } = useTasks();
  const { session } = useAuth();
  const { people } = useClub();
  const domains = useDomainSlugs();
  const can = usePermissionCheck();

  const stats = useMemo(() => deckStats(tasks), [tasks]);
  const rollups = useMemo(() => domainRollups(tasks, domains), [tasks, domains]);
  const load = useMemo(
    () => workload(tasks, people).filter((row) => row.open > 0),
    [tasks, people],
  );
  const board = useMemo(() => leaderboard(tasks, people), [tasks, people]);

  /*
    The two roles `tasks_read` lets through unconditionally. Read from the role
    rather than from a permission, because this is not about what someone may
    do — it is about how much of the board their queries return.
  */
  const role = session?.role;
  const seesEverything = role === 'super-admin' || role === 'faculty';

  return (
    <div className="insights">
      {/*
        Whose numbers these are.

        `20260922000000_task_visibility.sql` made a task visible to the people on
        it, so every figure on this screen is now counted from the tasks the
        reader can see rather than from the club's. For a member that is a much
        smaller number than it was last week, and a total that quietly changed
        meaning is exactly the kind of thing this app refuses to do elsewhere —
        an unlabelled figure is a claim about the club, and for most people here
        it is no longer true.

        Absent for anyone who does see everything, because for them it says
        nothing.
      */}
      {!seesEverything && (
        <p className="body-sm insights__scope" role="note">
          Your numbers, not the club's — a task belongs to the people on it, so
          this counts what you are assigned, what you raised, and unclaimed work
          on your board.
        </p>
      )}

      <div className="insights__stats">
        {/*
          No sparklines: a tile's trend needs seven days of history and nothing
          records one. The number is the tile (§7.11) — a made-up shape beneath
          it would be the only part anybody read.
        */}
        <StatCard value={stats.open} caption="Open" />
        <StatCard
          value={stats.overdue}
          caption="Overdue"
          atRisk={stats.overdue > OVERDUE_THRESHOLD}
        />
        <StatCard value={stats.awaitingApproval} caption="Awaiting approval" />
        <StatCard value={stats.doneThisWeek} caption="Done this week" />
      </div>

      <div className="insights__grid">
        {/*
          §9.12 asks for twelve weeks of completions. A task carries a status
          and no completion date, so there is no week to put a finish in — the
          chart is absent rather than plotted against the wrong date.
        */}
        <Card surface="mint" title="Completion by domain">
          <BarChart
            title="Percentage of tasks complete, by domain"
            max={100}
            rows={rollups.map((rollup) => ({
              id: rollup.domain,
              label: rollup.label,
              value: rollup.completion,
              domain: rollup.domain,
              // The red bar is never the only sign a domain is behind (§14.11).
              valueLabel:
                rollup.overdue > 0
                  ? `${rollup.completion}% · ${rollup.overdue} late`
                  : `${rollup.completion}%`,
              atRisk: rollup.overdue > 0,
            }))}
          />
        </Card>

        <Card title="Workload by member">
          <BarChart
            title="Open tasks per member"
            rows={load.map((row) => ({
              id: row.person.id,
              label: row.person.name,
              value: row.open,
              domain: row.person.domain,
              valueLabel:
                row.overdue > 0 ? `${row.open} · ${row.overdue} late` : `${row.open}`,
              atRisk: row.overdue > 0,
            }))}
          />
        </Card>

        {/* Core team and faculty only (§9.12). Absent otherwise, not disabled. */}
        {can('leaderboard.view') && (
          <Card
            surface="mint"
            title="Leaderboard"
            eyebrow="Tasks finished, all year"
            className="insights__wide sleeve"
          >
            <ol className="insights__board" role="list">
              {board.slice(0, LEADERBOARD_MAX).map((row, index) => (
                <li className="insights__board-row" key={row.person.id}>
                  {/* Rank 1 gets the flame tag; 2 and 3 get ink (§9.12). */}
                  {index === 0 ? (
                    <Tag flame>1</Tag>
                  ) : index < 3 ? (
                    <Tag ink>{index + 1}</Tag>
                  ) : (
                    <span className="insights__rank micro track-no">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  )}

                  <Avatar
                    size={24}
                    name={row.person.name}
                    initials={row.person.initials}
                    channel={row.person.domain}
                  />

                  <span className="body-sm insights__board-name">{row.person.name}</span>
                  <span className="micro tnum insights__board-count">
                    {row.completed} done
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        )}
      </div>
    </div>
  );
}
