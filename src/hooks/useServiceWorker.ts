import { useEffect, useState } from 'react';

export interface ServiceWorkerState {
  /** A new version is installed and waiting (§9.18). */
  updateReady: boolean;
  /** Activates the waiting worker and reloads onto it. */
  reload: () => void;
}

/**
 * Registers the service worker and reports when a new version is waiting.
 *
 * Registration is skipped in development: a worker caching the shell across
 * every HMR update is a slow way to debug something that never happens in
 * production.
 */
export function useServiceWorker(): ServiceWorkerState {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (import.meta.env.DEV) return;
    if (!('serviceWorker' in navigator)) return;

    let cancelled = false;

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        if (cancelled) return;

        // Already waiting when the page loaded.
        if (registration.waiting) setWaiting(registration.waiting);

        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;

          installing.addEventListener('statechange', () => {
            // A worker that installs with no controller is the first one, not
            // an update — there is nothing to tell the person about.
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              setWaiting(installing);
            }
          });
        });
      })
      .catch(() => {
        // A failed registration costs the offline shell, nothing else. There is
        // no useful thing to tell the person here.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function reload() {
    if (!waiting) return;
    // The new worker takes over, then the controllerchange handler reloads.
    waiting.postMessage('skip-waiting');
  }

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let reloading = false;
    function onControllerChange() {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    return () =>
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
  }, []);

  return { updateReady: waiting !== null, reload };
}
