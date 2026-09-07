import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Logo } from '../../ui/brand/Logo';
import { Grooves } from '../../ui/signature/Grooves';
import { Halftone } from '../../ui/signature/Halftone';
import { Waveform } from '../../ui/signature/Waveform';
import { StickerLock } from '../../ui/stickers';
import './AuthFrame.css';

export interface AuthFrameProps {
  /** display-1 on login, display-2 on first run (§9.1.3, §9.2). */
  title: string;
  size?: 'display-1' | 'display-2';
  /** One line of Instrument Serif italic beneath the headline. */
  tagline?: string;
  /** The paper card's contents. */
  children: ReactNode;
  /** The `label` line under the card. */
  footNote?: string;
}

/**
 * §9.1's visual frame, shared with §9.2 which is specified as "the same visual
 * frame as login": ink ground, halftone behind the top third, the logo in its
 * chip, the headline, one paper card, a foot note, and a cropped decorative
 * lock in the bottom-right.
 *
 * No nav chrome renders on any route that uses this — first run is unavoidable
 * until it is completed (§9.2), and login has nowhere to navigate to.
 */
export function AuthFrame({
  title,
  size = 'display-1',
  tagline,
  children,
  footNote,
}: AuthFrameProps) {
  return (
    <div className="auth">
      <div className="auth__texture">
        <Halftone />
        {/* Pressed behind the halftone, spindle just off the top-left. */}
        <Grooves origin={{ x: 22, y: 8 }} />
      </div>

      {/* Wrapped, because the sticker's own fade-in animates opacity to 1. */}
      <div className="auth__deco" aria-hidden="true">
        <StickerLock size="hero" />
      </div>

      <main className="auth__inner">
        <Logo size="md" className="auth__logo" />

        <div className="auth__head">
          <h1 className={cn('auth__title', size)}>{title}</h1>
          {tagline && <p className="auth__tagline body-lg">{tagline}</p>}
          {/* The sleeve's waveform, in place of a rule under the lockup. */}
          <Waveform seed={title} bars={34} variant="rule" animate className="auth__wave" />
        </div>

        <div className="auth__card surface-paper">{children}</div>

        {footNote && <p className="auth__foot label">{footNote}</p>}
      </main>
    </div>
  );
}
