import { useState } from 'react';
import { cn } from '../../lib/cn';
import './Logo.css';

export type LogoSize = 'sm' | 'md' | 'lg';

export interface LogoProps {
  /** sm 88px (rail, header) · md 120px (login) · lg 160px. */
  size?: LogoSize;
  /**
   * The wordmark's letters are outlined white, so it only works on a dark
   * surface (§2). On paper it must sit in a black chip — that is what this
   * turns on. On an ink ground leave it off.
   */
  chip?: boolean;
  className?: string;
}

/**
 * §2 — the INOVX wordmark. Never recoloured, stretched, rotated or placed in a
 * coloured shape other than the black chip.
 *
 * The PNG is dropped in by hand at public/brand/inovx-logo.png. Until it lands
 * — and if it ever 404s in production — this falls back to the word set in
 * Anton, which §2 allows as the lockup partner. It never falls back to nothing.
 */
export function Logo({ size = 'sm', chip = false, className }: LogoProps) {
  const [failed, setFailed] = useState(false);

  return (
    <span className={cn('logo', `logo--${size}`, chip && 'logo--chip', className)}>
      {failed ? (
        <span className="logo__word" data-font="display">INOVX</span>
      ) : (
        <img
          className="logo__img"
          src="/brand/inovx-logo.png"
          alt="INOVX"
          width={368}
          height={112}
          onError={() => setFailed(true)}
        />
      )}

      {/*
        The app mark for anywhere narrower than the wordmark's 88px minimum
        (§2) — the collapsed rail is the only such place today. It is always in
        the DOM and hidden by default so the swap can stay CSS-only, which is
        what lets the rail collapse without a JS breakpoint read.
      */}
      <span className="logo__x" data-font="display" aria-hidden="true">X</span>
    </span>
  );
}
