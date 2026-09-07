import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/authStore';
import { useIsDesktop } from '../../hooks/useBreakpoint';
import { LANDING_BY_ROLE } from '../../lib/navConfig';
import { cn } from '../../lib/cn';
import { Button } from '../../ui/primitives/Button';
import { IconButton } from '../../ui/primitives/IconButton';
import { IconChevronLeft } from '../../ui/icons';
import { InstallCard } from '../../ui/patterns/InstallCard';
import { Halftone } from '../../ui/signature/Halftone';
import { Waveform } from '../../ui/signature/Waveform';
import {
  StickerBell, StickerClipboard, StickerRocket, StickerTrophy,
} from '../../ui/stickers';
import './Welcome.css';

interface Slide {
  id: string;
  title: string;
  sticker: ReactNode;
  /** Two lines, per §9.3 — kept as two strings so neither can run long. */
  lines: [string, string];
}

const SLIDES: Slide[] = [
  {
    id: 'board',
    title: 'Your board',
    sticker: <StickerClipboard size="hero" />,
    lines: [
      'Every task your domain is carrying, in one column per state.',
      'Drag a card to move it, or open it to see who is on it.',
    ],
  },
  {
    id: 'finish',
    title: 'Finish a task',
    sticker: <StickerTrophy size="hero" />,
    lines: [
      'Mark it done and it goes to your lead for a quick approval.',
      'What you finish shows up on the club leaderboard.',
    ],
  },
  {
    id: 'notify',
    title: 'Get notified',
    sticker: <StickerBell size="hero" />,
    lines: [
      'A nudge when something is assigned to you or falls due.',
      'You choose which ones reach your phone in Settings.',
    ],
  },
  {
    id: 'install',
    title: 'Install the app',
    sticker: <StickerRocket size="hero" />,
    lines: [
      'Put INOVX on your home screen so it opens like any other app.',
      'Notifications only work once it is installed.',
    ],
  },
];

/** How far a finger has to travel before it counts as a swipe. */
const SWIPE_PX = 48;

/**
 * §9.3 — four full-screen cards, swipeable on mobile and arrow-navigable on
 * desktop. The fourth slide's primary action is the install card (§9.16).
 *
 * "Skip" and finishing both complete onboarding: the tour is shown once, and a
 * person who skipped it should not be handed it again on their next login.
 */
export function Welcome() {
  const { session, completeOnboarding } = useAuth();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();

  const [index, setIndex] = useState(0);
  const touchStart = useRef<number | null>(null);

  /*
    §9.3 asks for arrow navigation on desktop. Listening on the region would
    mean the person had to click it first, so the listener sits on the window
    — there is nothing else on this route the arrow keys could belong to.
  */
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'ArrowRight') go(1);
      if (event.key === 'ArrowLeft') go(-1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!session) return <Navigate to="/login" replace />;
  if (session.mustSetPassword) return <Navigate to="/first-run" replace />;
  if (session.hasOnboarded) return <Navigate to={LANDING_BY_ROLE[session.role]} replace />;

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  function finish() {
    completeOnboarding();
    navigate(LANDING_BY_ROLE[session!.role], { replace: true });
  }

  function go(delta: number) {
    setIndex((current) => Math.min(SLIDES.length - 1, Math.max(0, current + delta)));
  }

  function onTouchStart(event: TouchEvent) {
    touchStart.current = event.touches[0].clientX;
  }

  function onTouchEnd(event: TouchEvent) {
    if (touchStart.current === null) return;
    const delta = event.changedTouches[0].clientX - touchStart.current;
    touchStart.current = null;
    if (Math.abs(delta) < SWIPE_PX) return;
    go(delta < 0 ? 1 : -1);
  }

  return (
    <div
      className="welcome"
      role="region"
      aria-roledescription="carousel"
      aria-label="Welcome tour"
    >
      <div className="welcome__texture">
        <Halftone />
      </div>

      <div className="welcome__skip">
        <Button variant="ghost" size="sm" onClick={finish}>
          Skip
        </Button>
      </div>

      <main
        className="welcome__card surface-paper"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/*
          Keyed on the slide so React remounts it — that restarts the sticker's
          200ms fade and re-announces the heading rather than mutating in place.
        */}
        <div className="welcome__slide" key={slide.id}>
          <div className="welcome__sticker">{slide.sticker}</div>

          <h1 className="display-2">{slide.title}</h1>
          <Waveform seed={slide.id} bars={28} variant="rule" className="welcome__wave" />

          <div className="welcome__lines">
            <p className="body-lg">{slide.lines[0]}</p>
            <p className="body-lg">{slide.lines[1]}</p>
          </div>

          {isLast && <InstallCard tone="mint" className="welcome__install" />}
        </div>

        <footer className="welcome__foot">
          {/* Desktop's back arrow (§9.3). On mobile the swipe carries this. */}
          {isDesktop && (
            <IconButton
              label="Previous"
              icon={<IconChevronLeft />}
              disabled={index === 0}
              onClick={() => go(-1)}
            />
          )}

          <ol className="welcome__dots" role="list">
            {SLIDES.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  className={cn('welcome__dot', i === index && 'welcome__dot--on')}
                  aria-current={i === index || undefined}
                  aria-label={`${s.title} — slide ${i + 1} of ${SLIDES.length}`}
                  onClick={() => setIndex(i)}
                />
              </li>
            ))}
          </ol>

          {/*
            One brush action in view. On the last slide the install card owns it,
            so this one steps down to outline (§1.2's "one flame per view").
          */}
          <Button
            variant={isLast ? 'outline' : 'brush'}
            onClick={() => (isLast ? finish() : go(1))}
          >
            {isLast ? 'Done' : 'Next'}
          </Button>
        </footer>
      </main>

      {/* Announces the change for anyone not watching the dots. */}
      <p className="sr-only" aria-live="polite">
        Slide {index + 1} of {SLIDES.length}: {slide.title}
      </p>
    </div>
  );
}
