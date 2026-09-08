import { cn } from '../../lib/cn';
import './signature.css';

export interface WaveBar {
  /** Resting height, 0–1, measured from the centre line outward. */
  height: number;
  /** How long one bounce takes while playing, in ms. */
  period: number;
  /** Where in its bounce the bar starts, in ms. */
  offset: number;
}

/**
 * The bars for a seed, as a pure function of it. Kept out of the component so
 * nothing is reassigned across a render — the same seed always gives the same
 * wave, which is the whole point of seeding it.
 */
function buildWave(seed: string, bars: number): WaveBar[] {
  let state = 0;
  for (let i = 0; i < seed.length; i += 1) {
    state = (state * 31 + seed.charCodeAt(i)) >>> 0;
  }

  const next = () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return (state % 1000) / 1000;
  };

  const out: WaveBar[] = [];
  for (let index = 0; index < bars; index += 1) {
    const noise = next();

    // An envelope that swells in the middle, so it reads as a played phrase
    // rather than as static.
    const envelope = Math.sin((index / (bars - 1)) * Math.PI);

    out.push({
      height: 0.12 + noise * 0.55 * (0.35 + envelope),
      /*
        Each bar keeps its own period and offset, so they never fall into step
        with one another. A single shared duration reads as a row of bars
        bouncing together — a level meter, not a spectrum.
      */
      period: 620 + next() * 900,
      offset: next() * 1200,
    });
  }

  return out;
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
   * that redraws every time its screen re-renders is movement for its own sake.
   */
  animate?: boolean;
  /**
   * Keeps the bars moving, the way a spectrum does while something is playing.
   *
   * DEVIATION from §10, which says nothing but the skeleton loops and that
   * there is no ambient movement anywhere. Asked for directly, and confined to
   * the entry screens' decorative wave — no wave inside the signed-in app
   * plays. It stops dead under prefers-reduced-motion.
   */
  playing?: boolean;
  className?: string;
}

/**
 * A symmetric audio waveform, mirrored about a centre line — the record-sleeve
 * motif this system borrows from (see the design notes in the README).
 *
 * Decorative. It carries no data and is always aria-hidden.
 */
export function Waveform({
  seed = 'inovx',
  bars = 48,
  variant = 'block',
  animate = false,
  playing = false,
  className,
}: WaveformProps) {
  const wave = buildWave(seed, bars);

  const step = 100 / bars;
  const width = step * 0.55;

  return (
    <svg
      className={cn(
        'wave',
        `wave--${variant}`,
        animate && !playing && 'wave--play',
        playing && 'wave--playing',
        className,
      )}
      viewBox="0 0 100 24"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {wave.map((bar, index) => (
        <rect
          key={index}
          x={index * step + (step - width) / 2}
          y={12 - bar.height * 12}
          width={width}
          height={bar.height * 24}
          rx={width / 2}
          style={
            playing
              ? // Negative delay starts each bar partway through its own bounce,
                // so the wave is already in motion on the first frame.
                { animationDuration: `${bar.period}ms`, animationDelay: `-${bar.offset}ms` }
              : animate
                ? // 8ms a bar, so the whole phrase lands inside ~300ms however
                  // many bars there are.
                  { animationDelay: `${index * 8}ms` }
                : undefined
          }
        />
      ))}
    </svg>
  );
}
