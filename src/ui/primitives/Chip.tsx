import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import './Chip.css';

export type ChipVariant = 'static' | 'toggle' | 'removable' | 'channel';
export type ChipChannel =
  | 'technical' | 'management' | 'events' | 'media' | 'design' | 'core';

export interface ChipProps {
  children: ReactNode;
  variant?: ChipVariant;
  /** Which ground the chip sits on — decides border weight and colour. */
  tone?: 'paper' | 'ink';
  /** `toggle` only: filled with --ink and flipped to --paper text when true. */
  selected?: boolean;
  /** `channel` only: fills with the domain colour, keeps --ink text. */
  channel?: ChipChannel;
  /** 16px leading sticker or icon. */
  icon?: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  /** `removable` only. */
  onRemove?: () => void;
  /** Accessible name for the × when the label alone isn't enough context. */
  removeLabel?: string;
  className?: string;
}

export function Chip({
  children,
  variant = 'static',
  tone = 'paper',
  selected = false,
  channel,
  icon,
  disabled = false,
  onClick,
  onRemove,
  removeLabel,
  className,
}: ChipProps) {
  const interactive = variant === 'toggle' || (variant === 'static' && !!onClick);

  const style =
    variant === 'channel' && channel
      ? { background: `var(--dom-${channel})` }
      : undefined;

  const content = (
    <>
      {icon && <span className="chip__icon" aria-hidden="true">{icon}</span>}
      <span className="chip__label label">{children}</span>
      {variant === 'removable' && (
        <button
          type="button"
          className="chip__remove"
          onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
          aria-label={removeLabel ?? `Remove ${typeof children === 'string' ? children : 'item'}`}
          disabled={disabled}
        >
          <svg viewBox="0 0 14 14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 3l8 8M11 3l-8 8" />
          </svg>
        </button>
      )}
    </>
  );

  const classes = cn(
    'chip',
    `chip--${variant}`,
    `chip--on-${tone}`,
    selected && 'chip--selected',
    disabled && 'chip--disabled',
    className,
  );

  // A toggle is a real pressed-state button; a static chip is just information
  // and must not be announced as interactive.
  if (interactive) {
    return (
      <button
        type="button"
        className={classes}
        style={style}
        onClick={onClick}
        disabled={disabled}
        aria-pressed={variant === 'toggle' ? selected : undefined}
      >
        {content}
      </button>
    );
  }

  return <span className={classes} style={style}>{content}</span>;
}
