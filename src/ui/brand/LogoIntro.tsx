import { useEffect, useState } from 'react';
import { cn } from '../../lib/cn';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { Grooves } from '../signature/Grooves';
import { Halftone } from '../signature/Halftone';
import { Waveform } from '../signature/Waveform';
import { GLYPHS, WORDMARK, glyphVars } from './glyphs';
import './LogoIntro.css';

/**
 * The phases, in order. Each number is when that phase starts, in ms.
 *
 * Kept as one table rather than as nested timeouts so the whole sequence can be
 * read at a glance and retimed in one place.
 */
const TIMELINE = {
  /** Letters land one after another. */
  letters: 120,
  /** Everything is up; the wave is playing. */
  hold: 820,
  /** I N O V retract and the X grows into the app mark. */
  land: 1180,
  /** The overlay fades and the app is revealed. */
  out: 1600,
  done: 1900,
};

/** How far apart the letters land. Five of them, so this sets the run-in. */
const LETTER_STEP = 105;

export interface LogoIntroProps {
  /** Called once the intro is finished and has been taken off screen. */
  onDone: () => void;
}

/**
 * The opening title: the wordmark builds letter by letter, holds, then
 * everything but the X retracts and the X grows into the mark the app icon
 * uses — so the thing you tapped is the thing you land on.
 *
 * The letters are cropped out of the real wordmark rather than typeset, so
 * there is no second copy of the logo to keep in step with the first.
 *
 * It is skippable by any tap or key, and it does not run at all under
 * prefers-reduced-motion — a person who has asked for less movement should not
 * be made to sit through the one screen that is nothing but movement.
 */
export function LogoIntro({ onDone }: LogoIntroProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [phase, setPhase] = useState<'in' | 'land' | 'out'>('in');

  useEffect(() => {
    if (reducedMotion) {
      onDone();
      return;
    }

    const timers = [
      window.setTimeout(() => setPhase('land'), TIMELINE.land),
      window.setTimeout(() => setPhase('out'), TIMELINE.out),
      window.setTimeout(onDone, TIMELINE.done),
    ];

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [reducedMotion, onDone]);

  // Any input ends it. Nobody should have to watch this twice.
  useEffect(() => {
    if (reducedMotion) return;

    function skip() {
      setPhase('out');
      window.setTimeout(onDone, 260);
    }

    window.addEventListener('pointerdown', skip);
    window.addEventListener('keydown', skip);
    return () => {
      window.removeEventListener('pointerdown', skip);
      window.removeEventListener('keydown', skip);
    };
  }, [reducedMotion, onDone]);

  if (reducedMotion) return null;

  return (
    <div
      className={cn('intro', `intro--${phase}`)}
      /*
        The app behind it is already rendered and announced; this is a curtain
        over it, so it says nothing of its own.
      */
      aria-hidden="true"
    >
      <div className="intro__texture">
        <Halftone />
        <Grooves origin={{ x: 50, y: 46 }} />
      </div>

      <div className="intro__stage">
        <div className="intro__lockup">
          {GLYPHS.map((glyph, index) => (
            <span
              key={glyph.letter}
              className={cn('intro__glyph', glyph.letter === 'X' && 'intro__glyph--x')}
              style={{
                ...glyphVars(glyph),
                animationDelay: `${TIMELINE.letters + index * LETTER_STEP}ms`,
              }}
            >
              <img className="intro__glyph-img" src={WORDMARK.src} alt="" />
            </span>
          ))}
        </div>

        {/* The wave runs under the lockup and collapses with it. */}
        <Waveform
          seed="inovx ops"
          bars={40}
          variant="rule"
          playing
          className="intro__wave"
        />
      </div>

      {/* One pass of a flame rule, the way a machine sweeps a line on boot. */}
      <span className="intro__scan" />
    </div>
  );
}
