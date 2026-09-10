'use client';

import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  readAnalyticsConsent,
} from '@/lib/analytics';

export const CONVITEIA_META_PIXEL_ID = '2531880573994524';
export const ANALYTICS_CONSENT_CHANGED_EVENT = 'bigcorps:analytics-consent';

type Fbq = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  loaded?: boolean;
  version?: string;
  push?: (...args: unknown[]) => void;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
    __conviteiaMetaPixelInitialized?: boolean;
  }
}

function isConviteIAHost() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return host === 'conviteia.com' || host === 'www.conviteia.com';
}

function hasAnalyticsConsent() {
  return readAnalyticsConsent() === 'granted';
}

function installFbqBootstrap() {
  if (window.fbq) return window.fbq;

  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue?.push(args);
  } as Fbq;

  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.push = fbq;

  window.fbq = fbq;
  if (!window._fbq) window._fbq = fbq;
  return fbq;
}

export function ensureConviteIAMetaPixel() {
  if (typeof window === 'undefined' || !isConviteIAHost() || !hasAnalyticsConsent()) {
    return false;
  }

  const fbq = installFbqBootstrap();

  if (!document.getElementById('conviteia-meta-pixel-script')) {
    const script = document.createElement('script');
    script.id = 'conviteia-meta-pixel-script';
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  }

  if (!window.__conviteiaMetaPixelInitialized) {
    fbq('init', CONVITEIA_META_PIXEL_ID);
    fbq('track', 'PageView');
    window.__conviteiaMetaPixelInitialized = true;
  }

  return true;
}

function localOnce(key: string) {
  try {
    if (window.localStorage.getItem(key) === '1') return false;
    window.localStorage.setItem(key, '1');
    return true;
  } catch {
    return true;
  }
}

export function trackConviteIAMetaInitiateCheckout(params: {
  transactionId: string;
  value: number;
  includesMemories: boolean;
}) {
  if (!ensureConviteIAMetaPixel() || !window.fbq) return false;

  const onceKey = `meta:conviteia:initiate_checkout:${params.transactionId}`;
  if (!localOnce(onceKey)) return false;

  window.fbq('track', 'InitiateCheckout', {
    value: params.value,
    currency: 'BRL',
    content_name: params.includesMemories ? 'Convite + Memórias do Evento' : 'ConviteIA',
    content_type: 'product',
  });

  return true;
}

export function trackConviteIAMetaPurchase(params: {
  transactionId: string;
  value: number;
  includesMemories: boolean;
}) {
  if (!ensureConviteIAMetaPixel() || !window.fbq) return false;

  const onceKey = `meta:conviteia:purchase:${params.transactionId}`;
  if (!localOnce(onceKey)) return false;

  const eventId = `conviteia-purchase-${params.transactionId}`;

  window.fbq(
    'track',
    'Purchase',
    {
      value: params.value,
      currency: 'BRL',
      content_name: params.includesMemories ? 'Convite + Memórias do Evento' : 'ConviteIA',
      content_type: 'product',
    },
    { eventID: eventId },
  );

  return true;
}

export function announceAnalyticsConsent(granted: boolean) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_CHANGED_EVENT, {
    detail: { granted },
  }));
}

export function currentStoredConsent() {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
  return value === 'granted' || value === 'denied' ? value : null;
}
