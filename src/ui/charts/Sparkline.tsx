import { cn } from '../../lib/cn';
import './charts.css';

export interface SparklineProps {
  /** §7.11 asks for seven points. More are accepted; fewer read as noise. */
  points: number[];
  /** Draws the line and endpoint in --st-blocked. */
  atRisk?: boolean;
  className?: string;
}

const W = 72;
const H = 22;

/**
 * §7.11 — the seven-point sparkline on a StatCard: a 1.5px polyline with a 3px
 * filled endpoint dot.
 *
 * Decorative by design. It carries shape, not values — the number above it is
 * the reading, so the sparkline is aria-hidden rather than given a fake label.
 */
export function Sparkline({ points, atRisk = false, className }: SparklineProps) {
  if (points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;

  const coords = points.map((value, index) => {
    const x = (index / (points.length - 1)) * (W - 4) + 2;
    const y = H - 3 - ((value - min) / span) * (H - 6);
    return [x, y] as const;
  });

  const path = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');
  const [endX, endY] = coords[coords.length - 1];

  return (
    <svg
      className={cn('spark', atRisk && 'spark--risk', className)}
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
      focusable="false"
    >
      <path className="spark__line" d={path} />
      <circle className="spark__end" cx={endX} cy={endY} r="3" />
    </svg>
  );
}
