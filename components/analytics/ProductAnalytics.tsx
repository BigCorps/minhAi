'use client';

import { useEffect, useRef } from 'react';
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  applyGoogleConsent,
  ensureGtag,
  readAnalyticsConsent,
  trackEvent,
  trackEventOnce,
} from '@/lib/analytics';

type ProductKey = 'artefinal' | 'conviteia' | 'pixwiki' | 'consultatec';

type ProductConfig = {
  product: ProductKey;
  gtmId: string;
};

const HOSTS: Record<string, ProductConfig> = {
  'ia.artefinal.app': { product: 'artefinal', gtmId: 'GTM-MWC4F9RN' },
  'conviteia.com': { product: 'conviteia', gtmId: 'GTM-WN7XHFZN' },
  'www.conviteia.com': { product: 'conviteia', gtmId: 'GTM-WN7XHFZN' },
  'pix.wiki': { product: 'pixwiki', gtmId: 'GTM-KS4KHGKT' },
  'www.pix.wiki': { product: 'pixwiki', gtmId: 'GTM-KS4KHGKT' },
  'consulta.tec.br': { product: 'consultatec', gtmId: 'GTM-NJ45P5CM' },
  'www.consulta.tec.br': { product: 'consultatec', gtmId: 'GTM-NJ45P5CM' },
};

function normalizeText(value: string | null | undefined) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function brlFromText(value: string) {
  const match = value.match(/R\$\s*([0-9.]+(?:,[0-9]{2})?)/i);
  if (!match) return null;
  const normalized = match[1].replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function randomTransaction(prefix: string) {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${id}`;
}

function loadGtm(config: ProductConfig) {
  if (document.getElementById('bigcorps-gtm-script')) return;

  const choice = readAnalyticsConsent() ?? 'denied';
  ensureGtag();
  applyGoogleConsent(choice, 'default');

  trackEvent('product_context', {
    product: config.product,
    hostname: window.location.hostname,
  });

  const script = document.createElement('script');
  script.id = 'bigcorps-gtm-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(config.gtmId)}`;
  document.head.appendChild(script);
}

function handleArteFinalClick(target: Element) {
  const button = target.closest('button');
  if (!button) return;
  const text = normalizeText(button.textContent);
  if (!/R\$\s*[0-9]/.test(text) || !/cr[eé]ditos/i.test(text)) return;

  const value = brlFromText(text);
  const packageName = normalizeText(button.querySelector('p')?.textContent) || 'Pacote de créditos';
  const transactionId = randomTransaction('artefinal');

  sessionStorage.setItem('analytics:artefinal:checkout', JSON.stringify({
    transactionId,
    value,
    packageName,
  }));

  trackEvent('begin_checkout', {
    product: 'artefinal',
    currency: 'BRL',
    value: value ?? undefined,
    item_name: packageName,
    item_category: 'credits',
    transaction_id: transactionId,
  });
}

function handleConsultaTecClick(target: Element) {
  const button = target.closest('button');
  if (!button) return;
  const text = normalizeText(button.textContent);
  if (!/^Consultar\b/i.test(text) || !/R\$\s*[0-9]/.test(text)) return;

  const dialog = button.closest('[role="dialog"]') || button.closest('.fixed') || document.body;
  const heading = normalizeText(dialog.querySelector('h2')?.textContent) || 'Consulta';
  const value = brlFromText(text);
  const transactionId = randomTransaction('consultatec');

  sessionStorage.setItem('analytics:consultatec:checkout', JSON.stringify({
    transactionId,
    value,
    consultationType: heading,
  }));

  trackEvent('begin_checkout', {
    product: 'consultatec',
    currency: 'BRL',
    value: value ?? undefined,
    consultation_type: heading,
    transaction_id: transactionId,
  });
}

function inspectProductState(config: ProductConfig) {
  const text = normalizeText(document.body?.innerText);
  const url = new URL(window.location.href);

  if (config.product === 'conviteia') {
    const eventId = url.searchParams.get('evento');
    const isPayment = /(^|\/)pagar\/?$/.test(url.pathname) || url.pathname.includes('/convite/pagar');

    if (isPayment && eventId) {
      trackEventOnce(`conviteia:checkout:${eventId}`, 'begin_checkout', {
        product: 'conviteia',
        currency: 'BRL',
        value: 29.9,
        item_name: 'Um convite',
        transaction_id: eventId,
      });
    }

    if (eventId && text.includes('Convite publicado!')) {
      trackEventOnce(`conviteia:purchase:${eventId}`, 'purchase', {
        product: 'conviteia',
        currency: 'BRL',
        value: 29.9,
        item_name: 'Um convite',
        transaction_id: eventId,
      });
    }
  }

  if (config.product === 'pixwiki') {
    if (url.searchParams.get('bemvindo') === '1') {
      const company = url.searchParams.get('company') || 'new-company';
      trackEventOnce(`pixwiki:activated:${company}`, 'sign_up', {
        product: 'pixwiki',
        method: 'account_activated',
      });
      trackEventOnce(`pixwiki:account_activated:${company}`, 'account_activated', {
        product: 'pixwiki',
      });
    }
  }

  if (config.product === 'artefinal' && text.includes('Créditos adicionados com sucesso!')) {
    try {
      const raw = sessionStorage.getItem('analytics:artefinal:checkout');
      if (!raw) return;
      const checkout = JSON.parse(raw) as {
        transactionId: string;
        value: number | null;
        packageName: string;
      };
      trackEventOnce(`artefinal:purchase:${checkout.transactionId}`, 'purchase', {
        product: 'artefinal',
        currency: 'BRL',
        value: checkout.value ?? undefined,
        item_name: checkout.packageName,
        item_category: 'credits',
        transaction_id: checkout.transactionId,
      });
    } catch {
      // Analytics nunca interfere no fluxo principal.
    }
  }

  if (config.product === 'consultatec' && text.includes('Consulta realizada com sucesso')) {
    try {
      const raw = sessionStorage.getItem('analytics:consultatec:checkout');
      if (!raw) return;
      const checkout = JSON.parse(raw) as {
        transactionId: string;
        value: number | null;
        consultationType: string;
      };
      trackEventOnce(`consultatec:purchase:${checkout.transactionId}`, 'purchase', {
        product: 'consultatec',
        currency: 'BRL',
        value: checkout.value ?? undefined,
        consultation_type: checkout.consultationType,
        transaction_id: checkout.transactionId,
      });
    } catch {
      // Analytics nunca interfere no fluxo principal.
    }
  }
}

export default function ProductAnalytics() {
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    const hostname = window.location.hostname.toLowerCase();
    const config = HOSTS[hostname];
    if (!config) return;

    loadGtm(config);

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;

      if (config.product === 'artefinal') handleArteFinalClick(target);
      if (config.product === 'consultatec') handleConsultaTecClick(target);

      const anchor = target.closest('a');
      const href = anchor?.getAttribute('href') || '';
      const label = normalizeText(anchor?.textContent || target.textContent);

      if (config.product === 'conviteia' && /criar|começar|comecar/i.test(`${href} ${label}`)) {
        trackEvent('start_creation', { product: 'conviteia', link_url: href || undefined });
      }

      if (config.product === 'pixwiki' && /criar|começar|comecar|grátis|gratis/i.test(label)) {
        trackEvent('sign_up_start', { product: 'pixwiki' });
      }
    };

    document.addEventListener('click', onClick, true);

    let scheduled = false;
    const inspect = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => {
        scheduled = false;
        inspectProductState(config);
      });
    };

    inspect();
    observerRef.current = new MutationObserver(inspect);
    observerRef.current.observe(document.body, { subtree: true, childList: true, characterData: true });

    const onPopState = () => inspect();
    window.addEventListener('popstate', onPopState);

    return () => {
      document.removeEventListener('click', onClick, true);
      observerRef.current?.disconnect();
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  return null;
}

export { ANALYTICS_CONSENT_STORAGE_KEY };
