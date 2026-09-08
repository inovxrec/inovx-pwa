/*
  INOVX Ops service worker.

  Deliberately small. It does two things:

  1. Keeps the app shell available offline, so opening the app on a phone with
     no signal shows the offline banner (§9.18) rather than the browser's own
     dinosaur.
  2. Tells the page when a new version is waiting, which is what raises the
     "A new version is ready" toast (§9.18).

  It does NOT cache API responses. Task data that is quietly hours stale is
  worse than data that is honestly absent — the offline banner says when the
  last sync was, and that promise only holds if nothing is silently served from
  a cache behind it.
*/

const VERSION = 'inovx-v1';
const SHELL = `${VERSION}-shell`;

/** Enough to boot the app and draw its first screen. */
const SHELL_URLS = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      // Individually, so one missing file cannot fail the whole install.
      .then((cache) => Promise.allSettled(SHELL_URLS.map((url) => cache.add(url)))),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== SHELL).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

/** The page asks for this when the person taps RELOAD on the update toast. */
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never the API: see the note at the top.
  if (url.pathname.startsWith('/api/')) return;

  /*
    Navigations are network-first with the cached shell as the fallback. A
    single-page app has one HTML document for every route, so a cache hit for
    "/" is the right answer for any path once the network is gone.
  */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html').then((hit) => hit ?? caches.match('/'))),
    );
    return;
  }

  // Hashed build assets are immutable, so a cache hit is always correct.
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(SHELL).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
  }
});

/* ---------------------------------------------------------------- web push */

/*
  A push arrives whether or not INOVX is open — that is the whole point of it.
  The service worker is the only thing running at that moment, so everything the
  notification needs has to come in the payload.
*/
self.addEventListener('push', (event) => {
  /*
    A push with no readable body still deserves a notification. Browsers require
    that every push shows one — staying silent gets the subscription revoked —
    so an unreadable payload becomes a plain nudge rather than nothing.
  */
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || 'INOVX';
  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    // Where tapping it goes, read again in notificationclick below.
    data: { url: payload.url || '/notifications' },
    /*
      Collapses by kind: three comments on one task replace each other rather
      than stacking three deep on the lock screen. `renotify` still buzzes, so
      replacing is not the same as going unnoticed.
    */
    tag: payload.tag || 'inovx',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/*
  Focus the tab that is already open rather than piling up new ones — someone
  who taps three notifications should end up with one window, on the last thing
  they tapped.
*/
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/notifications';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});

/*
  Chrome expires subscriptions periodically and tells the worker when it does.
  Without this the person silently stops receiving anything and has no way to
  know — the app resubscribes on next load, and this marks the old one dead.
*/
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
      for (const client of clients) client.postMessage({ type: 'push-subscription-expired' });
    }),
  );
});
