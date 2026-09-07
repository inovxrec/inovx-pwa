import { cn } from '../../lib/cn';
import './signature.css';

export interface WaveformProps {
  /**
   * Seeds the bar heights, so the same screen draws the same wave every render
   * but two different screens do not look stamped from one template.
   */
  seed?: string;
  /** How many bars. 48 reads as a wave; below ~24 it reads as a bar chart. */
  bars?: number;
  /** `block` spans its container; `rule` is the short divider form. */
  variant?: 'block' | 'rule';
  className?: string;
}

/**
 * A symmetric audio waveform, mirrored about a centre line — the record-sleeve
 * motif this system borrows from (see the design notes in the README).
 *
 * Deliberately static: §10 allows exactly one looping animation in the whole
 * product and it is the skeleton pulse, so this never moves.
 *
 * Decorative. It carries no data and is always aria-hidden.
 */
export function Waveform({ seed = 'inovx', bars = 48, variant = 'block', className }: WaveformProps) {
  // A small deterministic hash — the same seed always draws the same wave.
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  const heights = Array.from({ length: bars }, (_, index) => {
    hash = (hash * 1_664_525 + 1_013_904_223) >>> 0;
    const noise = (hash % 1000) / 1000;

    // An envelope that swells in the middle, so it reads as a played phrase
    // rather than as static.
    const envelope = Math.sin((index / (bars - 1)) * Math.PI);
    return 0.12 + noise * 0.55 * (0.35 + envelope);
  });

  const step = 100 / bars;
  const width = step * 0.55;

  return (
    <svg
      className={cn('wave', `wave--${variant}`, className)}
      viewBox="0 0 100 24"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {heights.map((height, index) => (
        <rect
          key={index}
          x={index * step + (step - width) / 2}
          y={12 - height * 12}
          width={width}
          height={height * 24}
          rx={width / 2}
        />
      ))}
    </svg>
  );
}
