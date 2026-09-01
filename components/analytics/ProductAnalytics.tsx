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

type ProductKey =
  | 'artefinal'
  | 'conviteia'
  | 'pixwiki'
  | 'consultatec'
  | 'melhoria'
  | 'funcionaria';

type ProductConfig = {
  product: ProductKey;
  gtmId: string;
};

type CheckoutSnapshot = {
  transactionId: string;
  value: number | null;
  itemName: string;
  itemCategory: string;
  purchaseType?: string;
};

const HOSTS: Record<string, ProductConfig> = {
  'ia.artefinal.app': { product: 'artefinal', gtmId: 'GTM-MWC4F9RN' },
  'conviteia.com': { product: 'conviteia', gtmId: 'GTM-WN7XHFZN' },
  'www.conviteia.com': { product: 'conviteia', gtmId: 'GTM-WN7XHFZN' },
  'pix.wiki': { product: 'pixwiki', gtmId: 'GTM-KS4KHGKT' },
  'www.pix.wiki': { product: 'pixwiki', gtmId: 'GTM-KS4KHGKT' },
  'consulta.tec.br': { product: 'consultatec', gtmId: 'GTM-NJ45P5CM' },
  'www.consulta.tec.br': { product: 'consultatec', gtmId: 'GTM-NJ45P5CM' },
  'melhoria.org': { product: 'melhoria', gtmId: 'GTM-5C3RXHBT' },
  'www.melhoria.org': { product: 'melhoria', gtmId: 'GTM-5C3RXHBT' },
  'funcionaria.net': { product: 'funcionaria', gtmId: 'GTM-N3DC4SK7' },
  'www.funcionaria.net': { product: 'funcionaria', gtmId: 'GTM-N3DC4SK7' },
};

const MELHORIA_CHECKOUT_KEY = 'analytics:melhoria:checkout';
const MELHORIA_ACTIVATION_KEY = 'analytics:melhoria:activation_pending';

const FUNCIONARIA_FLOW_KEY = 'analytics:funcionaria:onboarding_flow_id';
const FUNCIONARIA_FINISH_KEY = 'analytics:funcionaria:onboarding_finish';
const FUNCIONARIA_ACTIVATION_KEY = 'analytics:funcionaria:activation_pending';
const FUNCIONARIA_SIGNUP_KEY = 'analytics:funcionaria:signup_intent';
const FUNCIONARIA_CHECKOUT_KEY = 'analytics:funcionaria:checkout';

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

function safeSessionGet(key: string) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionSet(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Analytics nunca interfere no produto.
  }
}

function safeSessionRemove(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Analytics nunca interfere no produto.
  }
}

function safeLocalGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Analytics nunca interfere no produto.
  }
}

function safeLocalRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Analytics nunca interfere no produto.
  }
}

function readCheckout(key: string): CheckoutSnapshot | null {
  const raw = safeSessionGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CheckoutSnapshot;
  } catch {
    safeSessionRemove(key);
    return null;
  }
}

function writeCheckout(key: string, checkout: CheckoutSnapshot) {
  safeSessionSet(key, JSON.stringify(checkout));
}

function trackSessionOnce(
  key: string,
  event: string,
  params: Record<string, string | number | boolean | null | undefined> = {},
) {
  const storageKey = `analytics:session:${key}`;
  if (safeSessionGet(storageKey) === '1') return false;
  trackEvent(event, params);
  safeSessionSet(storageKey, '1');
  return true;
}

function ensureFuncionarIAFlowId() {
  let flowId = safeLocalGet(FUNCIONARIA_FLOW_KEY);
  if (!flowId) {
    flowId = randomTransaction('funcionaria-onboarding');
    safeLocalSet(FUNCIONARIA_FLOW_KEY, flowId);
  }
  return flowId;
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

function handleMelhoriaClick(target: Element, url: URL) {
  const label = normalizeText(target.closest('a,button')?.textContent || target.textContent);

  if (
    (url.pathname === '/' && /começar agora/i.test(label))
    || (url.pathname === '/login' && /ainda não tenho conta|criar minha conta/i.test(label))
  ) {
    trackSessionOnce('melhoria:start_signup', 'start_signup', {
      product: 'melhoria',
    });
  }
}

function handleFuncionarIAClick(target: Element, url: URL) {
  const control = target.closest('a,button');
  if (!control) return;

  const label = normalizeText(control.textContent || target.textContent);
  const href = control instanceof HTMLAnchorElement ? control.getAttribute('href') || '' : '';

  if (href.includes('/onboarding') && /new=1/.test(href)) {
    const flowId = ensureFuncionarIAFlowId();
    trackEventOnce(`funcionaria:start_onboarding:${flowId}`, 'start_onboarding', {
      product: 'funcionaria',
    });
  }

  if (
    url.pathname === '/onboarding'
    && /criar minha funcionaria|salvar minha funcionaria/i.test(label)
  ) {
    const flowId = ensureFuncionarIAFlowId();
    safeLocalSet(FUNCIONARIA_FINISH_KEY, flowId);
  }

  const pendingOnboarding = url.pathname === '/login'
    && url.searchParams.get('destino') === 'onboarding';

  if (
    pendingOnboarding
    && /crie sua conta para ativar|criar sua conta/i.test(normalizeText(document.body?.innerText))
    && /^(Criar conta|Continuar com Google|Continuar com Facebook)$/i.test(label)
  ) {
    const flowId = ensureFuncionarIAFlowId();
    safeLocalSet(FUNCIONARIA_SIGNUP_KEY, flowId);
  }
}

function inspectMelhoria(text: string, url: URL) {
  if (
    url.pathname === '/consentimento'
    && text.includes('Antes de começar')
    && text.includes('Autorizo guardar meus remédios')
  ) {
    trackSessionOnce('melhoria:sign_up', 'sign_up', {
      product: 'melhoria',
      method: 'account_created',
    });
    safeSessionSet(MELHORIA_ACTIVATION_KEY, '1');
  }

  if (url.pathname === '/app' && safeSessionGet(MELHORIA_ACTIVATION_KEY) === '1') {
    trackSessionOnce('melhoria:account_activated', 'account_activated', {
      product: 'melhoria',
    });
    safeSessionRemove(MELHORIA_ACTIVATION_KEY);
  }

  if (url.pathname !== '/creditos') return;

  const existing = readCheckout(MELHORIA_CHECKOUT_KEY);

  if (text.includes('Pagamento confirmado')) {
    if (existing) {
      trackEventOnce(`melhoria:purchase:${existing.transactionId}`, 'purchase', {
        product: 'melhoria',
        currency: 'BRL',
        value: existing.value ?? undefined,
        transaction_id: existing.transactionId,
        item_name: existing.itemName,
        item_category: existing.itemCategory,
        purchase_type: 'credits',
      });
      safeSessionRemove(MELHORIA_CHECKOUT_KEY);
    }
    return;
  }

  if (text.includes('Pague com PIX')) {
    if (!existing) {
      const value = brlFromText(text);
      const transactionId = randomTransaction('melhoria');
      const checkout: CheckoutSnapshot = {
        transactionId,
        value,
        itemName: 'Créditos MelhorIA',
        itemCategory: 'credits',
        purchaseType: 'credits',
      };
      writeCheckout(MELHORIA_CHECKOUT_KEY, checkout);
      trackEvent('begin_checkout', {
        product: 'melhoria',
        currency: 'BRL',
        value: value ?? undefined,
        item_name: checkout.itemName,
        item_category: checkout.itemCategory,
        purchase_type: checkout.purchaseType,
      });
    }
    return;
  }

  if (existing && text.includes('Créditos da MelhorIA')) {
    safeSessionRemove(MELHORIA_CHECKOUT_KEY);
  }
}

function findFuncionarIAPaymentSurface() {
  const fixed = Array.from(document.querySelectorAll<HTMLElement>('.fixed'));
  return fixed.find((element) => {
    const text = normalizeText(element.innerText);
    return (
      (text.includes('Ativar habilidades') && /Pague com Pix/i.test(text))
      || (text.includes('Seus créditos serão ativados automaticamente') && /Pagar com PIX/i.test(text))
    );
  }) || null;
}

function inspectFuncionarIAPayment(text: string) {
  const paymentSurface = findFuncionarIAPaymentSurface();
  const surfaceText = paymentSurface ? normalizeText(paymentSurface.innerText) : '';
  const existing = readCheckout(FUNCIONARIA_CHECKOUT_KEY);

  const isSubscription = !!paymentSurface
    && surfaceText.includes('Ativar habilidades')
    && /Pague com Pix/i.test(surfaceText);

  const isCredits = !!paymentSurface
    && surfaceText.includes('Seus créditos serão ativados automaticamente')
    && /Pagar com PIX/i.test(surfaceText);

  if (isSubscription || isCredits) {
    const purchaseType = isSubscription ? 'subscription' : 'credits';
    const itemName = isSubscription ? 'Assinatura de habilidades' : 'Créditos FuncionarIA';
    const itemCategory = isSubscription ? 'subscription' : 'credits';

    if (!existing || existing.purchaseType !== purchaseType) {
      const value = brlFromText(surfaceText);
      const transactionId = randomTransaction(`funcionaria-${purchaseType}`);
      const checkout: CheckoutSnapshot = {
        transactionId,
        value,
        itemName,
        itemCategory,
        purchaseType,
      };
      writeCheckout(FUNCIONARIA_CHECKOUT_KEY, checkout);
      trackEvent('begin_checkout', {
        product: 'funcionaria',
        currency: 'BRL',
        value: value ?? undefined,
        item_name: itemName,
        item_category: itemCategory,
        purchase_type: purchaseType,
      });
    }
  }

  const current = readCheckout(FUNCIONARIA_CHECKOUT_KEY);
  if (!current) return;

  const subscriptionPaid = current.purchaseType === 'subscription'
    && text.includes('Pagamento confirmado. As novas habilidades já foram liberadas.');

  const creditsPaid = current.purchaseType === 'credits'
    && surfaceText.includes('Pagamento Confirmado!');

  if (subscriptionPaid || creditsPaid) {
    trackEventOnce(`funcionaria:purchase:${current.transactionId}`, 'purchase', {
      product: 'funcionaria',
      currency: 'BRL',
      value: current.value ?? undefined,
      transaction_id: current.transactionId,
      item_name: current.itemName,
      item_category: current.itemCategory,
      purchase_type: current.purchaseType,
    });
    safeSessionRemove(FUNCIONARIA_CHECKOUT_KEY);
    return;
  }

  if (!paymentSurface && existing) {
    safeSessionRemove(FUNCIONARIA_CHECKOUT_KEY);
  }
}

function inspectFuncionarIA(text: string, url: URL) {
  if (url.pathname === '/onboarding' && url.searchParams.get('new') === '1') {
    const flowId = ensureFuncionarIAFlowId();
    trackEventOnce(`funcionaria:start_onboarding:${flowId}`, 'start_onboarding', {
      product: 'funcionaria',
    });
  }

  if (url.pathname === '/login' && url.searchParams.get('destino') === 'onboarding') {
    const flowId = ensureFuncionarIAFlowId();
    const finishFlow = safeLocalGet(FUNCIONARIA_FINISH_KEY);

    if (finishFlow === flowId && text.includes('Sua FuncionarIA está pronta.')) {
      trackEventOnce(`funcionaria:onboarding_completed:${flowId}`, 'onboarding_completed', {
        product: 'funcionaria',
      });
      safeLocalSet(FUNCIONARIA_ACTIVATION_KEY, flowId);
    }
  }

  if (url.pathname === '/dashboard') {
    const flowId = safeLocalGet(FUNCIONARIA_FLOW_KEY);
    const finishFlow = safeLocalGet(FUNCIONARIA_FINISH_KEY);
    const activationFlow = safeLocalGet(FUNCIONARIA_ACTIVATION_KEY);
    const signupFlow = safeLocalGet(FUNCIONARIA_SIGNUP_KEY);

    if (flowId && finishFlow === flowId) {
      trackEventOnce(`funcionaria:onboarding_completed:${flowId}`, 'onboarding_completed', {
        product: 'funcionaria',
      });

      if (signupFlow === flowId) {
        trackEventOnce(`funcionaria:sign_up:${flowId}`, 'sign_up', {
          product: 'funcionaria',
          method: 'onboarding_account',
        });
      }

      if (activationFlow === flowId || signupFlow === flowId || finishFlow === flowId) {
        trackEventOnce(`funcionaria:account_activated:${flowId}`, 'account_activated', {
          product: 'funcionaria',
        });
      }

      safeLocalRemove(FUNCIONARIA_FLOW_KEY);
      safeLocalRemove(FUNCIONARIA_FINISH_KEY);
      safeLocalRemove(FUNCIONARIA_ACTIVATION_KEY);
      safeLocalRemove(FUNCIONARIA_SIGNUP_KEY);
    }
  }

  inspectFuncionarIAPayment(text);
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

  if (config.product === 'melhoria') inspectMelhoria(text, url);
  if (config.product === 'funcionaria') inspectFuncionarIA(text, url);
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

      const url = new URL(window.location.href);

      if (config.product === 'artefinal') handleArteFinalClick(target);
      if (config.product === 'consultatec') handleConsultaTecClick(target);
      if (config.product === 'melhoria') handleMelhoriaClick(target, url);
      if (config.product === 'funcionaria') handleFuncionarIAClick(target, url);

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
