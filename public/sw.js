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
