import { cn } from '../../lib/cn';
import type { Domain } from '../../lib/tasks';
import './charts.css';

export interface BarRow {
  id: string;
  /** Always drawn beside its bar, so identity never rests on the colour. */
  label: string;
  value: number;
  /** Decoration and a second cue — never the thing that identifies the row. */
  domain?: Domain;
  /** Shown at the trailing edge in place of the raw value: "12 open · 2 late". */
  valueLabel?: string;
  /** Draws the bar in --st-blocked. For a row that is actually in trouble. */
  atRisk?: boolean;
}

export interface BarChartProps {
  rows: BarRow[];
  title: string;
  /** Fixes the scale — pass 100 for percentages so bars stay comparable. */
  max?: number;
  className?: string;
}

/**
 * Horizontal bars, one row per category, each directly labelled (§9.12).
 *
 * Deliberately not a multi-series chart. The domain channel tokens are the only
 * series colours this system allows, and they sit too close in lightness to be
 * told apart by eye — so the layout puts every name next to its own bar and
 * lets the colour be redundant. Nothing here is readable by hue alone.
 */
export function BarChart({ rows, title, max, className }: BarChartProps) {
  const ceiling = max ?? Math.max(1, ...rows.map((row) => row.value));

  return (
    <figure className={cn('bars', className)}>
      <figcaption className="sr-only">{title}</figcaption>

      <ul className="bars__list" role="list">
        {rows.map((row) => {
          const percent = Math.max(0, Math.min(100, (row.value / ceiling) * 100));

          return (
            <li className="bars__row" key={row.id}>
              <span className="bars__label label">{row.label}</span>

              <span className="bars__track">
                <span
                  className={cn('bars__fill', row.atRisk && 'bars__fill--risk')}
                  style={{
                    width: `${percent}%`,
                    '--bar': row.domain ? `var(--dom-${row.domain})` : 'var(--on-paper)',
                  } as React.CSSProperties}
                />
              </span>

              <span className="bars__value tnum micro">{row.valueLabel ?? row.value}</span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
