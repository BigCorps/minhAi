'use client';

// Meta Pixel da Mídia.Pro (midia.pro).
//
// - só carrega com consentimento de medição (mesma chave do aviso de cookies);
// - só inicializa na landing e na tela de login/cadastro (PUBLIC_PATHS);
// - autoConfig desligado e nenhum dado pessoal nos eventos.
//
// O ID vem de NEXT_PUBLIC_MIDIA_META_PIXEL_ID. Sem a variável, nada carrega.

import { readAnalyticsConsent } from '@/lib/analytics';

const MIDIA_META_PIXEL_ID = process.env.NEXT_PUBLIC_MIDIA_META_PIXEL_ID?.trim() || '';
const SCRIPT_ID = 'midia-meta-pixel-script';
const PUBLIC_PATHS = new Set(['/', '/login']);

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
    __midiaMetaPixelInitialized?: boolean;
  }
}

function isMidiaHost() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return host === 'midia.pro' || host === 'www.midia.pro';
}

function isPublicPath() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  return PUBLIC_PATHS.has(path);
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

export function ensureMidiaMetaPixel() {
  if (
    typeof window === 'undefined'
    || !MIDIA_META_PIXEL_ID
    || !isMidiaHost()
    || readAnalyticsConsent() !== 'granted'
  ) {
    return false;
  }

  // Já inicializado nesta sessão de página: eventos podem sair mesmo que a
  // pessoa tenha navegado para outra tela depois.
  if (window.__midiaMetaPixelInitialized) return true;

  // Primeira carga só em tela pública/neutra.
  if (!isPublicPath()) return false;

  const fbq = installFbqBootstrap();

  if (!document.getElementById(SCRIPT_ID)) {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  }

  fbq('set', 'autoConfig', false, MIDIA_META_PIXEL_ID);
  fbq('init', MIDIA_META_PIXEL_ID);
  fbq('track', 'PageView');
  window.__midiaMetaPixelInitialized = true;
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

function fbq(): Fbq | null {
  const w = window as unknown as { fbq?: Fbq };
  return w.fbq ?? null;
}

/** Conta de parceiro criada no cadastro por e-mail. Evento de otimização. */
export function trackMidiaMetaCompleteRegistration() {
  if (!ensureMidiaMetaPixel()) return false;
  if (!localOnce('meta:midia:complete_registration')) return false;
  fbq()?.('track', 'CompleteRegistration', {
    content_name: 'Mídia.Pro - cadastro de parceiro',
    status: true,
  });
  return true;
}
