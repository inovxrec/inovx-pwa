import { cn } from '../../lib/cn';
import type { DomainRollup } from '../../lib/analytics';
import { ProgressBar } from '../primitives/ProgressBar';
import './DomainStrip.css';

export interface DomainStripProps {
  rollup: DomainRollup;
  onOpen: (domain: DomainRollup) => void;
  className?: string;
}

/**
 * §9.5.2 — a 64px paper row: a 6px left bar in the domain colour, the name in
 * Anton, open and overdue counts, and a ProgressBar. Tapping enters the board.
 *
 * The overdue count is written as a word, not just coloured, so the row does
 * not depend on the red to say something is wrong (§14 item 11).
 */
export function DomainStrip({ rollup, onOpen, className }: DomainStripProps) {
  const { label, open, overdue, completion, domain } = rollup;

  return (
    <button
      type="button"
      className={cn('strip', 'surface-paper', className)}
      style={{ '--domain': `var(--dom-${domain})` } as React.CSSProperties}
      onClick={() => onOpen(rollup)}
    >
      <span className="strip__edge" aria-hidden="true" />

      <span className="strip__name display-4">{label}</span>

      <span className="strip__counts micro">
        <span className="tnum">{open} open</span>
        {overdue > 0 && (
          <span className="strip__late tnum">{overdue} overdue</span>
        )}
      </span>

      <ProgressBar
        className="strip__bar"
        value={completion}
        atRisk={overdue > 0}
        label={`${label}: ${completion}% complete`}
      />

      <span className="strip__percent tnum micro">{completion}%</span>
    </button>
  );
}
