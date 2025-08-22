self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
});

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    try {
      const data = event.data ? (typeof event.data.json === 'function' ? event.data.json() : { body: await event.data.text() }) : {};
      const payload = data || {};
      const nested = payload.data || {};
      const chatId = nested.chatId || payload.chatId;
      const title = payload.title || 'New message';
      const options = {
        body: payload.body || '',
        icon: payload.icon || '/icons/icon-192.png',
        badge: payload.badge || '/icons/badge-72.png',
        data: nested,
      };
      try { console.log('[SW] push received', { chatId, hasData: !!event.data }); } catch {}

      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      let hasVisibleClient = false;
      let sameOriginClient = null;
      for (const client of clientsList) {
        try {
          const cu = new URL(client.url);
          if (cu.origin === self.location.origin) {
            sameOriginClient = sameOriginClient || client;
            if ('visibilityState' in client && client.visibilityState === 'visible') {
              hasVisibleClient = true;
            }
          }
        } catch {}
      }

      if (hasVisibleClient && sameOriginClient) {
        try { console.log('[SW] visible client detected; posting OPEN_CHAT instead of showing notification', { chatId }); } catch {}
        if (chatId && typeof sameOriginClient.postMessage === 'function') {
          sameOriginClient.postMessage({ type: 'OPEN_CHAT', chatId });
        }
        return; 
      }

      await self.registration.showNotification(title, options);
    } catch (e) {
      try { console.warn('[SW] push handler error; showing fallback notification', e); } catch {}
      const text = event.data ? (typeof event.data.text === 'function' ? await event.data.text() : 'New message') : 'New message';
      await self.registration.showNotification('Notification', { body: text });
    }
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = (event.notification && event.notification.data) || {};
  const baseUrl = data.url || '/';
  const chatId = data.chatId;
  const url = new URL(baseUrl, self.location.origin);
  if (chatId) {
    url.searchParams.set('chatId', chatId);
  }
  const targetUrl = url.toString();
  try { console.log('[SW] notificationclick', { baseUrl, chatId, targetUrl }); } catch {}
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          try {
            const clientUrl = new URL(client.url);
            const targetOrigin = new URL(targetUrl).origin;
            if (clientUrl.origin === targetOrigin) {
              if ('navigate' in client && client.url !== targetUrl) {
                try { console.log('[SW] navigating focused client to', targetUrl); } catch {}
                return client.navigate(targetUrl).then(() => client.focus());
              }
              const p = client.focus();
              try {
                if (chatId && typeof client.postMessage === 'function') {
                  try { console.log('[SW] posting OPEN_CHAT to client', { chatId }); } catch {}
                  client.postMessage({ type: 'OPEN_CHAT', chatId });
                }
              } catch (_) {}
              return p;
            }
          } catch (_) {
          }
        }
      }
      if (self.clients.openWindow) {
        try { console.log('[SW] opening new window', targetUrl); } catch {}
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
