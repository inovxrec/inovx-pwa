import { cn } from '../../lib/cn';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import './RollingNumber.css';

/** 0–9 twice, so a digit can roll a full turn before landing on its value. */
const STRIP = [...Array(20).keys()].map((n) => n % 10);

/** Left to right, so the number reads as settling rather than snapping. */
const DIGIT_STEP = 70;

export interface RollingNumberProps {
  value: number;
  /** Names the figure for anyone who cannot see it settle. */
  label?: string;
  className?: string;
}

/**
 * A number that rolls into place, the way a tape counter does.
 *
 * Each digit is a window onto a strip of 0–9 twice: it starts at the first 0
 * and travels to the second copy of its own value, so every digit turns a full
 * cycle whatever it lands on — a 1 that only moved one notch would not read as
 * a counter at all.
 *
 * The real number is in the DOM as text for a screen reader; the strip is
 * decoration over the top of it.
 */
export function RollingNumber({ value, label, className }: RollingNumberProps) {
  const reducedMotion = usePrefersReducedMotion();
  const digits = String(Math.round(value)).split('');

  if (reducedMotion) {
    return <span className={className}>{value}</span>;
  }

  return (
    <span className={cn('roll', className)}>
      <span className="sr-only">{label ?? value}</span>

      <span className="roll__digits" aria-hidden="true">
        {digits.map((digit, index) => (
          <span className="roll__slot" key={index}>
            <span
              className="roll__strip"
              style={{
                // Ten for the full turn, plus the digit's own place in the
                // second copy of the strip.
                '--target': 10 + Number(digit),
                animationDelay: `${index * DIGIT_STEP}ms`,
              } as React.CSSProperties}
            >
              {STRIP.map((n, i) => (
                <span className="roll__digit" key={i}>{n}</span>
              ))}
            </span>
          </span>
        ))}
      </span>
    </span>
  );
}
