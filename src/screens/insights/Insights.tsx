import { useMemo } from 'react';
import { useTasks } from '../../store/taskStore';
import { usePermissionCheck } from '../../hooks/usePermission';
import {
  ACTIVITY_12W, LEADERBOARD, OVERDUE_THRESHOLD, STAT_TRENDS, deckStats,
  domainRollups, workload,
} from '../../lib/analytics';
import { Avatar } from '../../ui/primitives/Avatar';
import { Tag } from '../../ui/primitives/Tag';
import { Card, StatCard } from '../../ui/patterns';
import { BarChart } from '../../ui/charts/BarChart';
import { LineChart } from '../../ui/charts/LineChart';
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
  const can = usePermissionCheck();

  const stats = useMemo(() => deckStats(tasks), [tasks]);
  const rollups = useMemo(() => domainRollups(tasks), [tasks]);
  const load = useMemo(() => workload(tasks).filter((row) => row.open > 0), [tasks]);

  return (
    <div className="insights">
      <div className="insights__stats">
        <StatCard value={stats.open} caption="Open" trend={STAT_TRENDS.open} />
        <StatCard
          value={stats.overdue}
          caption="Overdue"
          trend={STAT_TRENDS.overdue}
          atRisk={stats.overdue > OVERDUE_THRESHOLD}
        />
        <StatCard
          value={stats.awaitingApproval}
          caption="Awaiting approval"
          trend={STAT_TRENDS.awaitingApproval}
        />
        <StatCard
          value={stats.doneThisWeek}
          caption="Done this week"
          trend={STAT_TRENDS.doneThisWeek}
        />
      </div>

      <div className="insights__grid">
        <Card title="Twelve weeks of activity" className="insights__wide">
          <LineChart
            points={ACTIVITY_12W.map((week) => ({ label: week.label, value: week.completed }))}
            title="Tasks completed per week, last twelve weeks"
            unit="tasks completed"
          />
        </Card>

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
          <Card surface="mint" title="Leaderboard" className="insights__wide">
            <ol className="insights__board" role="list">
              {LEADERBOARD.slice(0, LEADERBOARD_MAX).map((row, index) => (
                <li className="insights__board-row" key={row.person.id}>
                  {/* Rank 1 gets the flame tag; 2 and 3 get ink (§9.12). */}
                  {index === 0 ? (
                    <Tag flame>1</Tag>
                  ) : index < 3 ? (
                    <Tag ink>{index + 1}</Tag>
                  ) : (
                    <span className="insights__rank micro tnum">{index + 1}</span>
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
