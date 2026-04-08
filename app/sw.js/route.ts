import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const slug = hostname.replace('.minhai.com.br', '');

  const swContent = `
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
const CACHE_NAME = 'minhai-${slug}-v1';
const CACHE_URLS = ['/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

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
`.trim();

  return new NextResponse(swContent, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-cache',
      'Service-Worker-Allowed': '/',
    },
  });
}
