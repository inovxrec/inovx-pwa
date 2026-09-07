import { useState } from 'react';
import { cn } from '../../lib/cn';
import './Logo.css';

export type LogoSize = 'sm' | 'md' | 'lg';

/** The wordmark's own pixels, so the browser reserves the right box up front. */
const INTRINSIC = { width: 561, height: 198 };

export interface LogoProps {
  /** sm 88px (rail, header) · md 120px (login) · lg 160px. */
  size?: LogoSize;
  /**
   * The wordmark's letters are silver with thin outlines, so it only works on a
   * dark surface (§2). On paper it must sit in a black chip — that is what this
   * turns on. On an ink ground leave it off.
   */
  chip?: boolean;
  className?: string;
}

/**
 * §2 — the INOVX wordmark. Never recoloured, stretched, rotated or placed in a
 * coloured shape other than the black chip.
 *
 * §2 names the asset `public/brand/inovx-logo.png`; what the club supplied is
 * `public/inovx-wordmark-light.webp`, which is the same mark with an alpha
 * channel. The path below follows the file that exists.
 *
 * The Anton fallback stays: if the asset ever 404s the lockup degrades to the
 * word rather than to nothing.
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
          src="/inovx-wordmark-light.webp"
          alt="INOVX"
          width={INTRINSIC.width}
          height={INTRINSIC.height}
          onError={() => setFailed(true)}
        />
      )}

      {/*
        The app mark for anywhere narrower than the wordmark's 88px minimum
        (§2) — the collapsed rail is the only such place today. It is always in
        the DOM and hidden by default so the swap can stay CSS-only, which is
        what lets the rail collapse without a JS breakpoint read.
      */}
      <span className="logo__x" aria-hidden="true">
        {failed ? (
          <span data-font="display">X</span>
        ) : (
          <img className="logo__x-img" src="/inovx-wordmark-light.webp" alt="" />
        )}
      </span>
    </span>
  );
}
