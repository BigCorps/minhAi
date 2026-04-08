import { NextRequest, NextResponse } from 'next/server';
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

export async function GET(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const slug = hostname.replace('.minhai.com.br', '');

  const swContent = `
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
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request)
    )
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
