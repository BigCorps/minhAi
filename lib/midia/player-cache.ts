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
  sizeBytes?: number;
  durationSeconds?: number | null;
  width?: number | null;
  height?: number | null;
  source?: string;
  destinationUrl?: string | null;
};

export type MidiaCacheProgress = {
  current: number;
  total: number;
  cached: number;
  failed: number;
  bytes: number;
  item?: MidiaManifestItem;
};

const CACHE_NAME = 'midia-pro-media-v1';
const CACHE_PREFIX = '/__midia_media_cache__/';

function cacheRequest(cacheKey: string) {
  const base = typeof window === 'undefined' ? 'https://midia.pro' : window.location.origin;
  return new Request(`${base}${CACHE_PREFIX}${encodeURIComponent(cacheKey)}`);
}

export function uniqueMidiaItems(items: MidiaManifestItem[]) {
  const byKey = new Map<string, MidiaManifestItem>();
  for (const item of items) if (item?.cacheKey) byKey.set(item.cacheKey, item);
  return [...byKey.values()];
}

export async function syncMidiaMediaCache(
  rawItems: MidiaManifestItem[],
  options?: {
    prune?: boolean;
    onProgress?: (progress: MidiaCacheProgress) => void;
  },
) {
  const items = uniqueMidiaItems(rawItems);
  if (typeof caches === 'undefined') return { cached: 0, failed: items.length, bytes: 0, total: items.length };
  const cache = await caches.open(CACHE_NAME);
  const keep = new Set(items.map((item) => cacheRequest(item.cacheKey).url));
  let cached = 0;
  let failed = 0;
  let bytes = 0;

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const request = cacheRequest(item.cacheKey);
    const existing = await cache.match(request);
    if (existing) {
      cached += 1;
      bytes += Math.max(0, Number(item.sizeBytes || existing.headers.get('content-length') || 0));
      options?.onProgress?.({ current: index + 1, total: items.length, cached, failed, bytes, item });
      continue;
    }

    try {
      const response = await fetch(item.signedUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`asset_http_${response.status}`);
      const cloned = response.clone();
      await cache.put(request, cloned);
      cached += 1;
      bytes += Math.max(0, Number(item.sizeBytes || response.headers.get('content-length') || 0));
    } catch {
      failed += 1;
    }

    options?.onProgress?.({ current: index + 1, total: items.length, cached, failed, bytes, item });
  }

  if (options?.prune !== false) {
    // Remove versões que não pertencem mais ao manifesto preparado.
    // Outros caches do app continuam intocados porque usamos um cache dedicado.
    const keys = await cache.keys();
    await Promise.all(keys.map((request) => keep.has(request.url) ? Promise.resolve(false) : cache.delete(request)));
  }

  return { cached, failed, bytes, total: items.length };
}

export async function inspectMidiaMediaCache(rawItems: MidiaManifestItem[]) {
  const items = uniqueMidiaItems(rawItems);
  if (typeof caches === 'undefined') return { cached: 0, missing: items.length, bytes: 0, total: items.length };
  const cache = await caches.open(CACHE_NAME);
  let cached = 0;
  let bytes = 0;
  for (const item of items) {
    const response = await cache.match(cacheRequest(item.cacheKey));
    if (!response) continue;
    cached += 1;
    bytes += Math.max(0, Number(item.sizeBytes || response.headers.get('content-length') || 0));
  }
  return { cached, missing: items.length - cached, bytes, total: items.length };
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
