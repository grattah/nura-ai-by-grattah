import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

// Tells TypeScript about the injected precache manifest
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  // __SW_MANIFEST is replaced at build time by Serwist with the list of
  // all your app's static assets (JS chunks, CSS, fonts, images).
  // These get precached so your app shell works offline immediately.
  precacheEntries: self.__SW_MANIFEST,

  // skipWaiting: true means a new service worker activates immediately
  // rather than waiting for all tabs to close. Without this, users would
  // have to close and reopen the app to get updates.
  skipWaiting: true,

  // clientsClaim: true means the newly activated SW takes control of all
  // open tabs immediately, rather than only controlling future navigations.
  clientsClaim: true,

  // navigationPreload speeds up navigation by starting the network request
  // for the page while the service worker is booting up, in parallel.
  navigationPreload: true,

  // defaultCache is Serwist's sensible set of runtime caching strategies:
  // - JS/CSS: stale-while-revalidate (serve cached, update in background)
  // - Images: cache-first with expiry
  // - API routes: network-first with cache fallback
  runtimeCaching: defaultCache,

  fallbacks: {
    entries: [
      {
        // When a navigation request fails offline, show this page.
        // You need to create app/offline/page.tsx (see Step 8).
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

// ── Push notification handler ──────────────────────────────────────────────
// This runs in the service worker context when a push message arrives,
// even if the app is closed. The browser wakes the service worker to handle it.

self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;

  const data = event.data.json() as {
    title: string;
    body: string;
    icon?: string;
    url?: string;
  };

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon ?? "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      data: { url: data.url ?? "/" },
    }),
  );
});

// When the user taps a notification, open the app and navigate to the URL
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification.data as { url: string })?.url ?? "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // If app is already open, focus it
        const existing = clients.find((c) =>
          c.url.includes(self.location.origin),
        );
        if (existing) {
          existing.focus();
          existing.navigate(url);
        } else {
          // Otherwise open a new tab
          self.clients.openWindow(url);
        }
      }),
  );
});
