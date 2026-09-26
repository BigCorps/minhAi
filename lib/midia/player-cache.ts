'use client';

export type MidiaManifestItem = {
  id: string;
  creativeId: string;
  kind: 'image' | 'video';
  mimeType: string;
  fileName: string;
  displaySeconds: number;
  sortOrder: number;
  cacheKey: string;
  signedUrl: string;
};

const CACHE_NAME = 'midia-pro-media-v1';
const CACHE_PREFIX = '/__midia_media_cache__/';

function cacheRequest(cacheKey: string) {
  const base = typeof window === 'undefined' ? 'https://midia.pro' : window.location.origin;
  return new Request(`${base}${CACHE_PREFIX}${encodeURIComponent(cacheKey)}`);
}

export async function syncMidiaMediaCache(items: MidiaManifestItem[]) {
  if (typeof caches === 'undefined') return { cached: 0, failed: items.length };
  const cache = await caches.open(CACHE_NAME);
  const keep = new Set(items.map((item) => cacheRequest(item.cacheKey).url));
  let cached = 0;
  let failed = 0;

  for (const item of items) {
    const request = cacheRequest(item.cacheKey);
    const existing = await cache.match(request);
    if (existing) {
      cached += 1;
      continue;
    }

    try {
      const response = await fetch(item.signedUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`asset_http_${response.status}`);
      await cache.put(request, response.clone());
      cached += 1;
    } catch {
      failed += 1;
    }
  }

  // Remove versões que não pertencem mais ao manifesto atual. Outros caches
  // do app continuam intocados porque usamos um cache dedicado.
  const keys = await cache.keys();
  await Promise.all(keys.map((request) => keep.has(request.url) ? Promise.resolve(false) : cache.delete(request)));

  return { cached, failed };
}

export async function objectUrlForMidiaItem(item: MidiaManifestItem) {
  if (typeof caches !== 'undefined') {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(cacheRequest(item.cacheKey));
    if (response) {
      const blob = await response.blob();
      return { url: URL.createObjectURL(blob), revoke: true };
    }
  }

  if (navigator.onLine && item.signedUrl) return { url: item.signedUrl, revoke: false };
  return null;
}
