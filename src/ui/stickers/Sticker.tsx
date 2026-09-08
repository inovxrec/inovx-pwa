import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import './stickers.css';

export type StickerSize = 'inline' | 'empty' | 'hero';

export interface StickerProps {
  /** 48px inline · 96px in an empty state · 132px on the login screen (§6.2). */
  size?: StickerSize;
  /** Sticker shadow, for when it sits on a paper card as a decoration. */
  stuck?: boolean;
  /** Decorative by default; pass a label only when it carries meaning. */
  label?: string;
  className?: string;
}

/**
 * Shared frame for the sticker set (§6.2). Every sticker draws in currentColor
 * at a 1.5px stroke and is never recoloured or animated beyond one fade-in.
 */
export function StickerFrame({
  size = 'empty',
  stuck = false,
  label,
  className,
  children,
}: StickerProps & { children: ReactNode }) {
  return (
    <svg
      className={cn('sticker', `sticker--${size}`, stuck && 'sticker--stuck', className)}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {children}
    </svg>
  );
}
