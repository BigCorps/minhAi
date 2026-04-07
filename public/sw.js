self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

// ── NOVO: Escutar Notificações Push ──────────────────────────────────────────
self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      icon: data.icon || '/icon192.png', // Use um ícone real da sua pasta public
      badge: '/logo-circle.png', // Ícone pequeno que aparece na barra de status do Android
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/' // Para onde o usuário vai ao clicar
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// ── NOVO: Ação ao clicar na notificação ──────────────────────────────────────
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      // Verifica se já tem uma aba aberta com o app e foca nela
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      // Se não tiver aba aberta, abre uma nova
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});
