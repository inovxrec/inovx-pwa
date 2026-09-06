import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import './Tag.css';

export type TagChannel =
  | 'technical' | 'management' | 'events' | 'media' | 'design' | 'core';
export type TagState =
  | 'todo' | 'progress' | 'review' | 'done' | 'blocked' | 'proposed' | 'cancelled';

export interface TagProps {
  children: ReactNode;
  /** Domain stock. Mutually exclusive with `state`. */
  channel?: TagChannel;
  /** Semantic stock. Mutually exclusive with `channel`. */
  state?: TagState;
  /** The flame tag — rank 1 on the leaderboard, and nothing else. */
  flame?: boolean;
  /** Solid ink with paper text — leaderboard ranks 2 and 3 (§9.12). */
  ink?: boolean;
  className?: string;
}

/**
 * §7.3 — smaller than a Chip and never interactive. Domain labels on task
 * cards, counts on nav items.
 */
export function Tag({ children, channel, state, flame, ink, className }: TagProps) {
  const background = flame
    ? 'var(--flame)'
    : ink
      ? 'var(--ink)'
      : channel
      ? `var(--dom-${channel})`
      : state
        ? `var(--st-${state})`
        : 'var(--paper-lo)';

  return (
    <span
      className={cn('tag', 'micro', flame && 'tag--flame', ink && 'tag--ink', className)}
      style={{ background }}
    >
      {children}
    </span>
  );
}
