/* PUNK ME service worker — bump with GAME_VERSION in js/game.js */
const CACHE_VERSION = "living3d-v22r5";
const CACHE_NAME = `punk-me-${CACHE_VERSION}`;

const PRECACHE = [
  "/",
  "/index.html",
  "/offline.html",
  "/beta.html",
  "/manifest.webmanifest",
  "/css/game.css",
  "/css/test-mode.css",
  "/js/game.js",
  "/js/i18n.js",
  "/js/characters.js",
  "/js/voice.js",
  "/js/onboarding.js",
  "/js/life.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png"
];

const NEVER_CACHE = [
  "firebasestorage.googleapis.com",
  "firebaseio.com",
  "googleapis.com",
  "gstatic.com",
  "cdn.jsdelivr.net"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k.startsWith("punk-me-") && k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

function shouldBypass(url) {
  if (url.origin !== self.location.origin) return true;
  if (NEVER_CACHE.some(h => url.href.includes(h))) return true;
  if (url.pathname.includes("/players/")) return true;
  return false;
}

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (shouldBypass(url)) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then(cached => cached || caches.match("/offline.html"))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (!res || res.status !== 200 || res.type === "opaque") return res;
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy));
        return res;
      });
    })
  );
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
