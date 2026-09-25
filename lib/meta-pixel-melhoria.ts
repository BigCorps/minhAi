'use client';

// Meta Pixel da MelhorIA (melhoria.org).
//
// Regras de privacidade, pensadas para um app que guarda remédios e consultas:
// - só carrega com consentimento de medição (mesma chave do aviso de cookies);
// - só inicializa em telas públicas ou neutras (PUBLIC_PATHS). Telas de
//   remédios, receitas, consultas, família etc. nunca disparam PageView;
// - autoConfig desligado: o pixel não coleta cliques, botões nem metadados
//   da página por conta própria;
// - nenhum evento leva nome, telefone, e-mail, remédio ou dado de saúde.
//   Só valor e moeda nas compras de créditos.
//
// O ID vem de NEXT_PUBLIC_MELHORIA_META_PIXEL_ID. Sem a variável, nada carrega.

import { readAnalyticsConsent } from '@/lib/analytics';

const MELHORIA_META_PIXEL_ID = process.env.NEXT_PUBLIC_MELHORIA_META_PIXEL_ID?.trim() || '';
const SCRIPT_ID = 'melhoria-meta-pixel-script';
const PUBLIC_PATHS = new Set(['/', '/login', '/consentimento', '/app', '/creditos']);

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
    __melhoriaMetaPixelInitialized?: boolean;
  }
}

function isMelhoriaHost() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return host === 'melhoria.org' || host === 'www.melhoria.org';
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

export function ensureMelhoriaMetaPixel() {
  if (
    typeof window === 'undefined'
    || !MELHORIA_META_PIXEL_ID
    || !isMelhoriaHost()
    || readAnalyticsConsent() !== 'granted'
  ) {
    return false;
  }

  // Já inicializado nesta sessão de página: eventos podem sair mesmo que a
  // pessoa tenha navegado para outra tela depois.
  if (window.__melhoriaMetaPixelInitialized) return true;

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

  fbq('set', 'autoConfig', false, MELHORIA_META_PIXEL_ID);
  fbq('init', MELHORIA_META_PIXEL_ID);
  fbq('track', 'PageView');
  window.__melhoriaMetaPixelInitialized = true;
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

/** Conta criada + consentimento de saúde salvo + chegou ao app. Evento de otimização. */
export function trackMelhoriaMetaActivation() {
  if (!ensureMelhoriaMetaPixel()) return false;
  if (!localOnce('meta:melhoria:complete_registration')) return false;
  fbq()?.('track', 'CompleteRegistration', { status: true });
  return true;
}

export function trackMelhoriaMetaInitiateCheckout(transactionId: string, value: number | null) {
  if (!ensureMelhoriaMetaPixel()) return false;
  if (!localOnce(`meta:melhoria:initiate_checkout:${transactionId}`)) return false;
  fbq()?.('track', 'InitiateCheckout', {
    currency: 'BRL',
    value: value ?? undefined,
    content_type: 'product',
    content_name: 'Créditos MelhorIA',
  });
  return true;
}

export function trackMelhoriaMetaPurchase(transactionId: string, value: number | null) {
  if (!ensureMelhoriaMetaPixel()) return false;
  if (!localOnce(`meta:melhoria:purchase:${transactionId}`)) return false;
  fbq()?.(
    'track',
    'Purchase',
    {
      currency: 'BRL',
      value: value ?? undefined,
      content_type: 'product',
      content_name: 'Créditos MelhorIA',
    },
    { eventID: `melhoria-purchase-${transactionId}` },
  );
  return true;
}
