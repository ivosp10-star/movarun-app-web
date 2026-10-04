/* Service worker de app.movarun.com (spec version-web-pwa §5 y §7).
 * Solo maneja los avisos (push + clic). No cachea la app: sin conexión, la web
 * muestra lo último que guardó react-query, igual que la app nativa. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'MOVA';
  event.waitUntil(
    (async () => {
      // Aviso de chat con ese mismo chat abierto y en foco: no se muestra (spec avisos-completos §3).
      if (typeof data.tag === 'string' && data.tag.indexOf('chat_message:') === 0 && data.url) {
        const path = new URL(data.url, self.location.origin).pathname;
        const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        if (windows.some((c) => c.focused && new URL(c.url).pathname === path)) return;
      }
      await self.registration.showNotification(title, {
        body: data.body || '',
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-96.png',
        tag: data.tag,
        data: { url: data.url || '/' },
      });
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin) {
          // La web ya está abierta: se enfoca y navega sin recargar (useNotificationDeepLinks.web).
          await client.focus();
          client.postMessage({ type: 'navigate', url });
          return;
        }
      }
      await self.clients.openWindow(url);
    })()
  );
});
