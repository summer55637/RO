'use strict';

const CACHE_NAME = 'ro-h5-shell-v25';
const SHELL_FILES = ['./', './index.html', './style.css', './world-data.js', './core.js', './app.js'];
const SHELL_PATHS = new Set(SHELL_FILES.map(function (file) {
  return new URL(file, self.registration.scope).pathname;
}));

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE_NAME).then(function (cache) {
    return Promise.all(SHELL_FILES.map(function (file) {
      const request = new Request(new URL(file, self.registration.scope).href, { cache: 'reload' });
      return fetch(request).then(function (response) {
        if (!response || !response.ok) throw new Error('Failed to cache app shell: ' + file);
        return cache.put(request, response);
      });
    }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    const oldShellCaches = keys.filter(function (key) {
      return key.indexOf('ro-h5-shell-') === 0 && key !== CACHE_NAME;
    });
    return Promise.all(oldShellCaches.map(function (key) { return caches.delete(key); }))
      .then(function () { return self.clients.claim(); })
      .then(function () {
        // On upgrades, reload only this Pages app's already-open tabs so they don't remain on old JS.
        if (!oldShellCaches.length) return;
        const scopePath = new URL(self.registration.scope).pathname;
        const normalizedScopePath = scopePath.endsWith('/') ? scopePath.slice(0, -1) : scopePath;
        return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clients) {
          clients.filter(function (client) {
            const pathname = new URL(client.url).pathname;
            return pathname === normalizedScopePath || pathname.indexOf(scopePath) === 0;
          }).forEach(function (client) {
            // Do not await the navigation itself while activation is still being extended.
            client.navigate(client.url).catch(function () { return null; });
          });
        });
      });
  }));
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isAppShell = event.request.mode === 'navigate' || SHELL_PATHS.has(url.pathname);
  if (isAppShell) {
    // Network-first for HTML/CSS/JS: revalidate on each visit and fall back to cache only when offline.
    event.respondWith((async function () {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(event.request, { cache: 'no-cache' });
        if (response && response.ok) await cache.put(event.request, response.clone());
        return response;
      } catch (_) {
        const fallback = await caches.match(event.request, { ignoreSearch: true });
        if (fallback) return fallback;
        return new Response('目前離線，且尚無可用的遊戲快取。', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    })());
    return;
  }

  // Other same-origin resources keep cache-first behaviour for offline support.
  event.respondWith(caches.match(event.request).then(function (cached) {
    if (cached) return cached;
    return fetch(event.request).then(function (response) {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) { return cache.put(event.request, copy); });
      }
      return response;
    });
  }));
});
