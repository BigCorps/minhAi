importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
self.addEventListener('fetch', (event) => {
  // 1. Ignora requisições de outras URLs (como APIs do OneSignal, Supabase, Google)
  if (!event.request.url.startsWith(self.location.origin)) {
    return; // Deixa o navegador processar naturalmente
  }

  // 2. Só tenta fazer o fallback de cache para as rotas e arquivos do próprio site
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cachedResponse = await caches.match(event.request);
      // Se não achar no cache, retorna um Response válido para não causar o erro "TypeError"
      return cachedResponse || new Response("Você está offline", { status: 503, statusText: "Offline" });
    })
  );
});
