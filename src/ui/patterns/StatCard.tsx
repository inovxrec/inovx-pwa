import { cn } from '../../lib/cn';
import { Sparkline } from '../charts/Sparkline';
import { RollingNumber } from './RollingNumber';
import './StatCard.css';

export interface StatCardProps {
  /** num-xl Anton. The chart is the number — the sparkline only adds shape. */
  value: number | string;
  /** The `label` caption beneath it. */
  caption: string;
  /** Seven points (§7.11). Omit where there is no history to show. */
  trend?: number[];
  /** "+3 this week". Shown as a small chip beside the caption. */
  delta?: string;
  /**
   * Draws the 2px --st-blocked border and turns the sparkline red — for a tile
   * that is over its threshold, like overdue on the Command Deck (§9.5.1).
   */
  atRisk?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * §7.11 — four across on desktop, 2×2 on mobile, never a horizontal scroll.
 * That grid belongs to the screen; this is one tile.
 */
export function StatCard({
  value, caption, trend, delta, atRisk = false, onClick, className,
}: StatCardProps) {
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'stat', 'surface-paper',
        atRisk && 'stat--risk',
        onClick && 'stat--link',
        className,
      )}
    >
      {/*
        A figure rolls into place; a label like "—" or "3/7" just sits there.
      */}
      <span className="stat__value num-xl tnum">
        {typeof value === 'number' ? (
          <RollingNumber value={value} label={`${value} ${caption}`} />
        ) : (
          value
        )}
      </span>

      <span className="stat__foot">
        <span className="stat__caption label">{caption}</span>
        {delta && <span className="stat__delta micro">{delta}</span>}
      </span>

      {trend && <Sparkline points={trend} atRisk={atRisk} className="stat__spark" />}
    </Tag>
  );
}
