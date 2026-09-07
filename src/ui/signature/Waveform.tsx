import { cn } from '../../lib/cn';
import './signature.css';

/**
 * The bar heights for a seed, as a pure function of it. Kept out of the
 * component so nothing is reassigned across a render — the same seed always
 * gives the same wave, which is the whole point of seeding it.
 */
function buildWave(seed: string, bars: number): number[] {
  let state = 0;
  for (let i = 0; i < seed.length; i += 1) {
    state = (state * 31 + seed.charCodeAt(i)) >>> 0;
  }

  const heights: number[] = [];
  for (let index = 0; index < bars; index += 1) {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    const noise = (state % 1000) / 1000;

    // An envelope that swells in the middle, so it reads as a played phrase
    // rather than as static.
    const envelope = Math.sin((index / (bars - 1)) * Math.PI);
    heights.push(0.12 + noise * 0.55 * (0.35 + envelope));
  }

  return heights;
}

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
  /**
   * Plays the bars in left to right on mount, once. Off by default — a wave
   * that redraws every time its screen re-renders would read as ambient
   * movement, which §10 forbids.
   */
  animate?: boolean;
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
export function Waveform({
  seed = 'inovx', bars = 48, variant = 'block', animate = false, className,
}: WaveformProps) {
  const heights = buildWave(seed, bars);

  const step = 100 / bars;
  const width = step * 0.55;

  return (
    <svg
      className={cn('wave', `wave--${variant}`, animate && 'wave--play', className)}
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
          /*
            8ms a bar, so the whole phrase lands inside ~300ms however many
            bars there are. This is one element revealing itself, not a list
            staggering its children, so §10's 20ms-capped-at-6 rule is not
            the one that applies.
          */
          style={animate ? { animationDelay: `${index * 8}ms` } : undefined}
        />
      ))}
    </svg>
  );
}
