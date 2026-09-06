import { cn } from '../../lib/cn';
import './Avatar.css';

export type AvatarChannel =
  | 'technical' | 'management' | 'events' | 'media' | 'design' | 'core';
export type AvatarSize = 24 | 32 | 44;

export interface AvatarProps {
  name?: string;
  initials?: string;
  src?: string;
  /**
   * The person's domain. Initials sit on this colour, which is what makes a
   * board readable at a glance (§7.9).
   */
  channel?: AvatarChannel;
  size?: AvatarSize;
  /** Renders the dashed +  placeholder instead. */
  unassigned?: boolean;
  className?: string;
}

/** §7.9 — square with an --r-xs radius, for the sticker-portrait feel. */
export function Avatar({
  name,
  initials,
  src,
  channel = 'core',
  size = 32,
  unassigned = false,
  className,
}: AvatarProps) {
  if (unassigned) {
    return (
      <span
        className={cn('avatar', 'avatar--unassigned', className)}
        style={{ '--avatar-size': `${size}px` } as React.CSSProperties}
        role="img"
        aria-label="Unassigned"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M8 3v10M3 8h10" />
        </svg>
      </span>
    );
  }

  if (src) {
    return (
      <img
        className={cn('avatar', className)}
        style={{ '--avatar-size': `${size}px` } as React.CSSProperties}
        src={src}
        alt={name ?? ''}
      />
    );
  }

  return (
    <span
      className={cn('avatar', 'avatar--initials', className)}
      style={{
        '--avatar-size': `${size}px`,
        background: `var(--dom-${channel})`,
      } as React.CSSProperties}
      role="img"
      aria-label={name ?? initials}
    >
      <span aria-hidden="true">{initials}</span>
    </span>
  );
}
