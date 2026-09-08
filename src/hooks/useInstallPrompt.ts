import { useCallback, useEffect, useState } from 'react';

/** Which of §9.16's three sets of instructions this browser needs. */
export type InstallPlatform = 'ios' | 'android' | 'desktop';

/** Chrome's install event. Not in lib.dom, so it is declared here. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'inovx.install.dismissals';
/** §9.16 — the banner may reappear weekly, at most three times. */
export const MAX_DISMISSALS = 3;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface Dismissals {
  count: number;
  /** Epoch ms of the most recent dismissal. */
  last: number;
}

function readDismissals(): Dismissals {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return { count: 0, last: 0 };
    const parsed = JSON.parse(raw) as Partial<Dismissals>;
    return { count: Number(parsed.count) || 0, last: Number(parsed.last) || 0 };
  } catch {
    return { count: 0, last: 0 };
  }
}

function detectPlatform(): InstallPlatform {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  // iPadOS 13+ reports itself as a Mac, so the touch-point count settles it.
  const iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(ua) || iPadOS) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

/** True once the app is running from the home screen rather than a browser tab. */
function detectInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia('(display-mode: standalone)').matches || standalone === true;
}

export interface InstallPrompt {
  platform: InstallPlatform;
  /** Already running installed — every install surface should be hidden. */
  installed: boolean;
  /** Chrome has offered the native prompt and it has not been used yet. */
  canPrompt: boolean;
  /** Fires the native prompt. Resolves to whether the person accepted. */
  promptInstall: () => Promise<boolean>;
  /** Whether the weekly dismissible banner (§9.16) is still allowed to show. */
  bannerAllowed: boolean;
  /** Records a banner dismissal against the weekly cap. */
  dismissBanner: () => void;
}

/**
 * §9.16 — everything the install card needs to know about where it is running.
 *
 * The `beforeinstallprompt` listener is registered on mount rather than at
 * module load, so it only exists while a surface is on screen that could use it.
 */
export function useInstallPrompt(): InstallPrompt {
  const [platform] = useState(detectPlatform);
  const [installed, setInstalled] = useState(detectInstalled);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissals, setDismissals] = useState(readDismissals);
  // Read once at mount rather than on every render, so the answer is stable.
  const [mountedAt] = useState(() => Date.now());

  useEffect(() => {
    function onBeforeInstall(event: Event) {
      // Without this Chrome shows its own mini-infobar instead of our card.
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
      setDeferred(null);
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    // The event is single-use — Chrome fires a fresh one if it still qualifies.
    setDeferred(null);
    return outcome === 'accepted';
  }, [deferred]);

  const dismissBanner = useCallback(() => {
    setDismissals((current) => {
      const next = { count: current.count + 1, last: Date.now() };
      try {
        localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
      } catch {
        // Losing the count only means the banner is offered again later.
      }
      return next;
    });
  }, []);

  const bannerAllowed =
    !installed &&
    dismissals.count < MAX_DISMISSALS &&
    mountedAt - dismissals.last > WEEK_MS;

  return {
    platform,
    installed,
    canPrompt: Boolean(deferred),
    promptInstall,
    bannerAllowed,
    dismissBanner,
  };
}
