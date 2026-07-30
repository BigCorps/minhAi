import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
const MINHAI_DOMAINS = [
    '.minhai.app', '.minhai.com.br',
    '.minhaia.app', '.nossaia.app', '.suaia.app',
  ];
  const domain = MINHAI_DOMAINS.find(d => hostname.endsWith(d)) ?? '.minhai.app';
  const slug = hostname.replace(domain, '');

  const swContent = `
const CACHE_NAME = 'minhai-${slug}-v2';
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
  // Nunca intercepta navegações (carregamento de página inteira).
  // O fetch() da própria SW não repassa corretamente respostas de
  // redirect (302/303) do servidor para o navegador nesse modo — isso
  // quebra qualquer rota que redirecione durante navegação, como
  // /auth/callback (login OAuth e vínculo de identidade).
  if (event.request.mode === 'navigate') {
    return;
  }
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
