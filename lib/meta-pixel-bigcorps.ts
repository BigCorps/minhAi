'use client';

// Meta Pixel da landing de diagnóstico gratuito da BigCorps.
// - só carrega em ajuda.bigcorps.com.br;
// - só carrega depois do consentimento do banner compartilhado;
// - autoConfig desligado;
// - eventos do navegador nunca recebem nome, telefone, e-mail ou respostas.
// A CAPI usa o mesmo event_id do evento Lead para deduplicação.

import { readAnalyticsConsent } from '@/lib/analytics';

const BIGCORPS_META_PIXEL_ID = process.env.NEXT_PUBLIC_BIGCORPS_META_PIXEL_ID?.trim() || '';
const SCRIPT_ID = 'bigcorps-meta-pixel-script';

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
    __bigcorpsMetaPixelInitialized?: boolean;
  }
}

function isBigCorpsHelpHost() {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.toLowerCase() === 'ajuda.bigcorps.com.br';
}

function installFbqBootstrap(): Fbq {
  const w = window as unknown as { fbq?: Fbq; _fbq?: Fbq };
  if (w.fbq) return w.fbq;

  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue?.push(args);
  } as Fbq;

  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.push = fbq;
  w.fbq = fbq;
  if (!w._fbq) w._fbq = fbq;
  return fbq;
}

function fbq(): Fbq | null {
  const w = window as unknown as { fbq?: Fbq };
  return w.fbq ?? null;
}

export function ensureBigCorpsMetaPixel() {
  if (typeof window === 'undefined' || !BIGCORPS_META_PIXEL_ID || !isBigCorpsHelpHost()) {
    return false;
  }

  try {
    if (readAnalyticsConsent() !== 'granted') return false;
  } catch {
    // Browsers in-app podem bloquear storage. Sem leitura segura de consentimento,
    // analytics não essenciais permanecem desligados.
    return false;
  }

  if (window.__bigcorpsMetaPixelInitialized) return true;

  const pixel = installFbqBootstrap();
  if (!document.getElementById(SCRIPT_ID)) {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  }

  pixel('set', 'autoConfig', false, BIGCORPS_META_PIXEL_ID);
  pixel('init', BIGCORPS_META_PIXEL_ID);
  pixel('track', 'PageView');
  window.__bigcorpsMetaPixelInitialized = true;
  return true;
}

export function trackBigCorpsQuizStarted() {
  if (!ensureBigCorpsMetaPixel()) return false;
  fbq()?.('trackCustom', 'QuizIniciado');
  return true;
}

export function trackBigCorpsLead(leadId: string) {
  if (!leadId || !ensureBigCorpsMetaPixel()) return false;
  fbq()?.('track', 'Lead', {}, { eventID: leadId });
  return true;
}
