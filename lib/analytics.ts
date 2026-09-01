'use client';

export type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;
export type ConsentChoice = 'granted' | 'denied';

export const ANALYTICS_CONSENT_STORAGE_KEY = 'minhai_cookie_consent';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function dataLayer() {
  if (typeof window === 'undefined') return null;
  window.dataLayer = window.dataLayer || [];
  return window.dataLayer;
}

export function ensureGtag() {
  if (typeof window === 'undefined') return null;
  const layer = dataLayer();
  if (!layer) return null;

  if (!window.gtag) {
    window.gtag = (...args: unknown[]) => {
      layer.push(args);
    };
  }

  return window.gtag;
}

export function readAnalyticsConsent(): ConsentChoice | null {
  if (typeof window === 'undefined') return null;
  const stored = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
  return stored === 'granted' || stored === 'denied' ? stored : null;
}

export function applyGoogleConsent(choice: ConsentChoice, mode: 'default' | 'update' = 'update') {
  const gtag = ensureGtag();
  if (!gtag) return;

  const granted = choice === 'granted';
  gtag('consent', mode, {
    analytics_storage: granted ? 'granted' : 'denied',
    ad_storage: granted ? 'granted' : 'denied',
    ad_user_data: granted ? 'granted' : 'denied',
    ad_personalization: granted ? 'granted' : 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: mode === 'default' ? 500 : undefined,
  });
}

export function trackEvent(event: string, params: AnalyticsParams = {}) {
  const layer = dataLayer();
  if (!layer) return;

  const clean = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined),
  );

  layer.push({ event, ...clean });
}

export function trackEventOnce(
  dedupeKey: string,
  event: string,
  params: AnalyticsParams = {},
) {
  if (typeof window === 'undefined') return false;
  const key = `bigcorps_analytics:${dedupeKey}`;

  try {
    if (window.localStorage.getItem(key) === '1') return false;
    trackEvent(event, params);
    window.localStorage.setItem(key, '1');
    return true;
  } catch {
    trackEvent(event, params);
    return true;
  }
}
