import { cn } from '../../lib/cn';
import './signature.css';

export type TapeChannel =
  | 'technical' | 'management' | 'events' | 'media' | 'design' | 'core';

export interface TapeProps {
  /** Domain channel the tape is torn from. */
  channel?: TapeChannel;
  /** Which corner it is anchored to; it overflows the card by ~8px. */
  corner?: 'top-left' | 'top-right';
  className?: string;
}

/**
 * A strip of washi tape (§6.3). Marks the single most important card on a
 * screen — a pinned announcement, an overdue block.
 *
 * MAXIMUM ONE tape or pin per screen. If two cards both want it, neither gets
 * it and the screen needs rethinking instead.
 */
export function Tape({ channel = 'design', corner = 'top-right', className }: TapeProps) {
  return (
    <span
      className={cn('tape', `tape--${corner}`, className)}
      style={{ background: `var(--dom-${channel})` }}
      aria-hidden="true"
    />
  );
}
