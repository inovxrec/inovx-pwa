import { cn } from '../../lib/cn';
import { BRUSH_PATHS, pickBrushVariant } from './brushPaths';
import './BrushStroke.css';

/**
 * The primary-action swatch (§6.1). An irregular hand-painted shape rendered as
 * an inline SVG *behind* the label — never a border-radius.
 *
 * It fills with currentColor, so the button decides whether the stroke is flame
 * or ink and the stroke itself stays colour-agnostic.
 */
export interface BrushStrokeProps {
  /** String the variant is derived from — usually the label it sits behind. */
  seed?: string;
  /** Explicit variant, overriding the seed. */
  variant?: number;
  className?: string;
}

export function BrushStroke({ seed = '', variant, className }: BrushStrokeProps) {
  const index = variant ?? pickBrushVariant(seed);

  return (
    <svg
      className={cn('brush', className)}
      viewBox="0 0 420 72"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d={BRUSH_PATHS[index % BRUSH_PATHS.length]} fill="currentColor" />
    </svg>
  );
}
