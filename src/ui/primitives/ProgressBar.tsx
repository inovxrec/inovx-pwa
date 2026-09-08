import { cn } from '../../lib/cn';
import './ProgressBar.css';

export interface ProgressBarProps {
  /** 0–100. */
  value: number;
  /** Accessible name — a bare bar tells a screen reader nothing. */
  label: string;
  /**
   * Flame is reserved for progress that represents something at risk (§7.19).
   * Ordinary progress is --ink.
   */
  atRisk?: boolean;
  className?: string;
}

export function ProgressBar({ value, label, atRisk = false, className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      className={cn('progress', atRisk && 'progress--risk', className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <span className="progress__fill" style={{ width: `${clamped}%` }} />
    </div>
  );
}
