import { cn } from '../../lib/cn';
import './signature.css';

export interface GroovesProps {
  /** Where the spindle sits, as a percentage of the box. */
  origin?: { x: number; y: number };
  className?: string;
}

/**
 * Record grooves — concentric hairlines running off the edge of a hero area.
 *
 * The companion to Halftone (§6.4) and used the same way: on an --ink ground
 * only, never on paper, never animated. Where the halftone gives a printed
 * surface, this gives the sleeve it was printed for.
 *
 * Drawn as a repeating-radial-gradient rather than 40 SVG circles, so it costs
 * one paint and scales to any size.
 */
export function Grooves({ origin = { x: 50, y: 50 }, className }: GroovesProps) {
  return (
    <div
      className={cn('grooves', className)}
      style={{ '--groove-x': `${origin.x}%`, '--groove-y': `${origin.y}%` } as React.CSSProperties}
      aria-hidden="true"
    />
  );
}
