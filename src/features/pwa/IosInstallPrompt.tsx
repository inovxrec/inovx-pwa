import { useState } from 'react';
import './IosInstallPrompt.css';

const IOS_PROMPT_KEY = 'inovx_ios_install_dismissed';

export function IosInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(() => {
    if (typeof window === 'undefined') return false;
    const isIos =
      /iphone|ipad|ipod/i.test(window.navigator.userAgent) &&
      !('MSStream' in window);

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator &&
        Boolean((window.navigator as unknown as { standalone: boolean }).standalone));

    const isDismissed = localStorage.getItem(IOS_PROMPT_KEY) === 'true';
    return Boolean(isIos && !isStandalone && !isDismissed);
  });

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem(IOS_PROMPT_KEY, 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="ios-install-banner" role="region" aria-label="Install InovX PWA on iOS">
      <div className="ios-install-content">
        <div className="ios-install-badge">iOS INSTALL PROTOCOL</div>
        <div className="ios-install-title">Install INOVX84 to Your Home Screen</div>
        <p className="ios-install-desc">
          For full operational capabilities, push telemetry, and offline readiness:
        </p>
        <div className="ios-steps">
          <div className="ios-step">
            <span className="ios-step-num">1</span>
            <span>Tap the <strong>Share</strong> button in Safari's toolbar below (⎋)</span>
          </div>
          <div className="ios-step">
            <span className="ios-step-num">2</span>
            <span>Scroll down and select <strong>Add to Home Screen</strong> (+)</span>
          </div>
        </div>
      </div>
      <button
        type="button"
        className="ios-dismiss-btn"
        onClick={handleDismiss}
        title="Dismiss install guide"
      >
        ✕
      </button>
    </div>
  );
}
