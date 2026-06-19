// =================================================================
// 1. SERVICE WORKER LIFECYCLE (No caching, to prevent Vercel caching bugs)
// =================================================================

self.addEventListener('install', (event) => {
  // Zwinge den neuen Service Worker, sofort die Kontrolle zu übernehmen
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Übernehme sofort die Kontrolle über alle geöffneten Tabs
  event.waitUntil(self.clients.claim());
});


// =================================================================
// 2. THE SNIPER PUSH ENGINE (iOS Koma-Sicher)
// =================================================================

self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Signal empfangen.');

  // 🚀 SOTA FIX 1: event.waitUntil MUSS den gesamten Code umschließen für iOS
  event.waitUntil(
    Promise.resolve().then(() => {
      let payload = {};
      
      // 🚀 SOTA FIX 2: Aggressives Fallback-Parsing, damit iOS uns nicht bestraft
      if (event.data) {
        try {
          payload = event.data.json();
        } catch (e) {
          console.error('[Service Worker] JSON Parse Fehler:', e);
          payload = { 
            title: "🚨 Neural Scout Alert", 
            body: event.data.text() || "Neuer Value Edge detektiert!",
            url: "/sniper-feed"
          };
        }
      } else {
        payload = { 
          title: "🚨 Neural Scout Alert", 
          body: "Neuer Value Edge detektiert! Check das Dashboard.",
          url: "/sniper-feed"
        };
      }
      
      const options = {
        body: payload.body, 
        icon: payload.icon || '/icon-192x192.png', // Fallback, falls Python kein Icon schickt
        badge: payload.badge || '/icon-192x192.png', 
        vibrate: [200, 100, 200, 100, 200], 
        data: {
          url: payload.url || '/sniper-feed' 
        },
        requireInteraction: true 
      };

      // 🚀 SOTA FIX 3: Return the promise
      return self.registration.showNotification(payload.title || 'Sniper Alert', options);
    }).catch((err) => {
      console.error('[Service Worker] Kritischer Fehler beim Zeigen der Notification:', err);
      // Letzte Rettung, damit Apple uns nicht blacklisted
      return self.registration.showNotification("🚨 System Update", { body: "Neues Signal im Sniper Feed!" });
    })
  );
});

// Steuert, was passiert, wenn du auf die Benachrichtigung klickst
self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification geklickt.');
  event.notification.close(); // Schließt das Pop-Up

  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/sniper-feed';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});