/* Service worker khusus notifikasi push (terpisah dari sw.js milik PWA).
   Tidak memakai Firebase SDK: pesan dari server berisi data { title, body, url } dan
   langsung ditampilkan di sini. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }
  const d = payload.data || payload.notification || payload;
  const title = d.title || 'Habit reminder';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: d.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'daily-reminder', // pengingat baru menggantikan yang lama, tidak menumpuk
      data: { url: d.url || '/habits' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/habits';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          c.navigate && c.navigate(url).catch(() => {});
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
