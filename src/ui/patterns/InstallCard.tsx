import { useState, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import { Button } from '../primitives/Button';
import './InstallCard.css';

/** The three small illustrations that number the iOS steps (§9.16). */
function StepShare() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12M12 3l-4 4M12 3l4 4" />
      <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </svg>
  );
}

function StepAdd() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <path d="M12 8.5v7M8.5 12h7" />
    </svg>
  );
}

function StepOpen() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="6" y="2.5" width="12" height="19" rx="3" />
      <path d="M10.5 18.5h3" />
      <path d="M9.5 9.5h5v5" />
      <path d="M14.5 9.5L9.5 14.5" />
    </svg>
  );
}

const IOS_STEPS: { icon: ReactNode; text: string }[] = [
  { icon: <StepShare />, text: 'Tap the Share button in Safari' },
  { icon: <StepAdd />, text: 'Choose "Add to Home Screen"' },
  { icon: <StepOpen />, text: 'Open INOVX from your home screen' },
];

export interface InstallCardProps {
  /**
   * Renders the dismiss control and the confirmation line. The onboarding tour
   * and Settings both show the card without one; only the weekly banner needs
   * it (§9.16).
   */
  onDismiss?: () => void;
  /** Sits on mint inside the tour, on paper in Settings. */
  tone?: 'paper' | 'mint';
  className?: string;
}

/**
 * §9.16 — platform-aware install instructions. Android gets the one button
 * that actually installs; iOS gets three honest steps, because Apple gives no
 * install API; desktop gets pointed at the address bar.
 */
export function InstallCard({ onDismiss, tone = 'mint', className }: InstallCardProps) {
  const { platform, installed, canPrompt, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  if (installed) return null;

  if (dismissed) {
    return (
      <div className={cn('install', `surface-${tone}`, className)}>
        <p className="body-sm install__dismissed">No problem — we'll email you instead.</p>
      </div>
    );
  }

  function dismiss() {
    setDismissed(true);
    onDismiss?.();
  }

  return (
    <section className={cn('install', `surface-${tone}`, className)} aria-labelledby="install-title">
      <h3 id="install-title" className="display-4">Install INOVX</h3>

      {platform === 'ios' && (
        <>
          <ol className="install__steps" role="list">
            {IOS_STEPS.map((step, index) => (
              <li className="install__step" key={step.text}>
                <span className="install__num micro" aria-hidden="true">{index + 1}</span>
                <span className="install__glyph">{step.icon}</span>
                <span className="body-sm">{step.text}</span>
              </li>
            ))}
          </ol>
          <p className="install__note body-sm">
            Apple doesn't allow an install button. This is the only way to get
            notifications on iPhone.
          </p>
        </>
      )}

      {platform === 'android' && (
        canPrompt ? (
          <>
            <p className="body-sm">
              Adds INOVX to your home screen and turns on notifications.
            </p>
            <Button variant="brush" onClick={() => void promptInstall()}>
              Install
            </Button>
          </>
        ) : (
          /*
            Chrome only fires beforeinstallprompt once the PWA criteria are met
            and not at all in some browsers, so the card says what to do by hand
            rather than showing a button that would do nothing.
          */
          <p className="body-sm">
            Open the browser menu and choose "Add to Home screen" — that turns
            on notifications too.
          </p>
        )
      )}

      {platform === 'desktop' && (
        canPrompt ? (
          <>
            <p className="body-sm">Keeps INOVX in its own window, out of your tabs.</p>
            <Button variant="brush" onClick={() => void promptInstall()}>
              Install
            </Button>
          </>
        ) : (
          <p className="body-sm">
            Click the install icon at the right-hand end of the address bar to
            keep INOVX in its own window.
          </p>
        )
      )}

      {onDismiss && (
        <div className="install__dismiss">
          <Button variant="ghost" size="sm" onClick={dismiss}>
            Not now
          </Button>
        </div>
      )}
    </section>
  );
}
