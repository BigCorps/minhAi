'use client';

type Param = string | number | boolean | null | undefined;

export function melhoriaAnalytics(
  event: string,
  params: Record<string, Param> = {},
) {
  if (typeof window === 'undefined') return;
  const w = window as typeof window & { dataLayer?: Array<Record<string, unknown>> };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ event, product: 'melhoria', ...params });
}

export function melhoriaAnalyticsOnce(
  key: string,
  event: string,
  params: Record<string, Param> = {},
) {
  if (typeof window === 'undefined') return;
  try {
    const storageKey = `melhoria:analytics:${key}`;
    if (window.localStorage.getItem(storageKey) === '1') return;
    melhoriaAnalytics(event, params);
    window.localStorage.setItem(storageKey, '1');
  } catch {
    melhoriaAnalytics(event, params);
  }
}
