import { useState } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { BrushStroke } from '../signature/BrushStroke';
import './Button.css';

/** §7.1. `brush` is the one primary action per view — see the "one flame" rule. */
export type ButtonVariant =
  | 'brush'
  | 'brush-ink'
  | 'solid'
  | 'outline'
  | 'outline-light'
  | 'ghost'
  | 'danger';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Stretches to the container — mobile card footers. */
  fullWidth?: boolean;
  /**
   * Swaps the label for three animated dots while keeping the button's exact
   * width, and makes it aria-busy and non-interactive (§7.1).
   */
  loading?: boolean;
  /** 18px leading glyph. Decorative — the label carries the meaning. */
  icon?: ReactNode;
  children: ReactNode;
}

const BRUSH_VARIANTS = new Set<ButtonVariant>(['brush', 'brush-ink']);

export function Button({
  variant = 'solid',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  children,
  className,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  const isBrush = BRUSH_VARIANTS.has(variant);

  /**
   * A press repaints the stroke left to right, the way a brush lays it down.
   *
   * Driven from a class rather than :active, because :active lasts exactly as
   * long as the finger is down — the stroke would be cut off mid-sweep on a
   * quick tap and left running on a slow one.
   */
  const [struck, setStruck] = useState(false);

  // The stroke is seeded from the label so it is stable across renders but
  // differs between two buttons sitting on the same screen (§6.1).
  const seed = typeof children === 'string' ? children : variant;

  return (
    <button
      type={type}
      className={cn(
        'btn',
        `btn--${variant}`,
        `btn--${size}`,
        fullWidth && 'btn--full',
        loading && 'btn--loading',
        struck && 'btn--struck',
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
      /* After the spread, so a caller's own handler is wrapped, not dropped. */
      onPointerDown={(event) => {
        if (isBrush) {
          setStruck(true);
          window.setTimeout(() => setStruck(false), 260);
        }
        rest.onPointerDown?.(event);
      }}
    >
      {isBrush && <BrushStroke seed={seed} />}

      <span className="btn__label">
        {loading ? (
          <span className="btn__dots" aria-hidden="true">
            <i /><i /><i />
          </span>
        ) : (
          <>
            {icon && <span className="btn__icon" aria-hidden="true">{icon}</span>}
            {children}
          </>
        )}
      </span>

      {/* The label stays in the flow while loading so the width never jumps. */}
      {loading && <span className="btn__ghost-label" aria-hidden="true">{children}</span>}
    </button>
  );
}
