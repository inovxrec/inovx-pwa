import { cn } from '../../lib/cn';
import './SegmentedControl.css';

export interface Segment<T extends string = string> {
  id: T;
  label: string;
}

export interface SegmentedControlProps<T extends string = string> {
  segments: Segment<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Names the group — "View", "Permission". */
  label: string;
  className?: string;
}

/**
 * §7.13 — a pill container with a 2px ink border; the active segment is a
 * filled ink pill that slides. For two or three mutually exclusive views, and
 * for the INHERIT / GRANT / REVOKE control on the Permissions screen.
 *
 * A radiogroup rather than tabs: it picks a value, it does not reveal a panel.
 */
export function SegmentedControl<T extends string = string>({
  segments, value, onChange, label, className,
}: SegmentedControlProps<T>) {
  const index = segments.findIndex((s) => s.id === value);

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('segmented', className)}
      style={{
        '--segment-count': segments.length,
        '--segment-index': Math.max(0, index),
      } as React.CSSProperties}
    >
      {/* The sliding fill. Behind the labels, so their text stays readable. */}
      <span className="segmented__thumb" aria-hidden="true" />

      {segments.map((segment) => {
        const selected = segment.id === value;
        return (
          <button
            key={segment.id}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className={cn('segmented__item', selected && 'segmented__item--on')}
            onClick={() => onChange(segment.id)}
          >
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}
