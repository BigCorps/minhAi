'use client';
// Banner compartilhado de consentimento (LGPD).
// Midia.Pro e o diagnóstico BigCorps usam o mesmo mecanismo da plataforma,
// mudando apenas identidade e link de privacidade no host correspondente.

import { useEffect, useState } from 'react';
import Clarity from '@microsoft/clarity';
import { useMarca } from '@/lib/useMarca';
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  applyGoogleConsent,
} from '@/lib/analytics';
import { announceAnalyticsConsent } from '@/lib/meta-pixel';

const MIDIA_COOKIE_BRAND = {
  cor: '#003295',
  corTextoBotao: '#ffffff',
  corTexto: '#003295',
} as const;

const BIGCORPS_COOKIE_BRAND = {
  cor: '#FD9219',
  corTextoBotao: '#ffffff',
  corTexto: '#A45100',
} as const;

function applyConsent(granted: boolean) {
  try {
    Clarity.consentV2({
      ad_Storage: granted ? 'granted' : 'denied',
      analytics_Storage: granted ? 'granted' : 'denied',
    });
  } catch {
    // Analytics nunca interfere no produto.
  }

  applyGoogleConsent(granted ? 'granted' : 'denied');
  announceAnalyticsConsent(granted);
}

function readStoredConsent() {
  try {
    return localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [midiaHost, setMidiaHost] = useState(false);
  const [bigcorpsHelp, setBigcorpsHelp] = useState(false);
  const [privacyHref, setPrivacyHref] = useState('/aviso');
  const { marca } = useMarca();
  const visual = bigcorpsHelp ? BIGCORPS_COOKIE_BRAND : midiaHost ? MIDIA_COOKIE_BRAND : marca;

  useEffect(() => {
    const hostname = window.location.hostname.toLowerCase();
    const pathname = window.location.pathname;
    const isMidia =
      hostname === 'midia.pro' ||
      hostname === 'www.midia.pro' ||
      hostname.endsWith('.midia.pro');
    const isBigCorpsHelp = hostname === 'ajuda.bigcorps.com.br' || pathname === '/ajuda' || pathname.startsWith('/ajuda/');
    setMidiaHost(isMidia);
    setBigcorpsHelp(isBigCorpsHelp);
    setPrivacyHref(
      hostname === 'ajuda.bigcorps.com.br'
        ? '/privacidade'
        : isBigCorpsHelp
          ? '/ajuda/privacidade'
          : isMidia
            ? 'https://www.minhai.app/aviso'
            : '/aviso',
    );

    // Experiências de tela cheia não podem receber overlays de consentimento:
    // convite público e player físico do Midia.Pro. Sem escolha prévia,
    // analytics não essenciais permanecem negados.
    const convitePublico =
      (hostname.endsWith('.conviteia.com') && hostname !== 'www.conviteia.com') ||
      ((hostname === 'conviteia.com' || hostname === 'www.conviteia.com') && /^\/(?:c|r)\//.test(pathname));
    const playerMidia = hostname.endsWith('.midia.pro') && pathname === '/play';

    if (convitePublico || playerMidia) {
      const stored = readStoredConsent();
      applyConsent(stored === 'granted');
      setVisible(false);
      return;
    }

    const stored = readStoredConsent();
    if (stored === 'granted') applyConsent(true);
    else if (stored === 'denied') applyConsent(false);
    else setVisible(true);
  }, []);

  const handleChoice = (granted: boolean) => {
    try {
      localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, granted ? 'granted' : 'denied');
    } catch {
      // O consentimento ainda vale para a página atual mesmo sem storage.
    }
    applyConsent(granted);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Consentimento de cookies"
      className="fixed left-3 right-3 z-[60] rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur-xl sm:left-4 sm:right-auto sm:max-w-sm sm:p-5"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
    >
      <p className="mb-2.5 text-[13px] leading-snug text-slate-700 sm:mb-3 sm:text-sm sm:leading-relaxed">
        <span className="sm:hidden">Usamos cookies para melhorar sua experiência.</span>
        <span className="hidden sm:inline">
          Usamos cookies para entender como você usa o site e melhorar sua experiência.
          Você pode aceitar ou recusar os cookies não essenciais a qualquer momento.
          Saiba mais no nosso
        </span>{' '}
        <a
          href={privacyHref}
          className="font-semibold underline-offset-2 hover:underline"
          style={{ color: visual.corTexto }}
        >
          <span className="sm:hidden">Saiba mais</span>
          <span className="hidden sm:inline">Aviso de Privacidade</span>
        </a>
        <span className="hidden sm:inline">.</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleChoice(true)}
          className="min-h-[44px] flex-1 rounded-full px-4 text-sm font-bold leading-none transition-all duration-300 hover:brightness-110 active:scale-95"
          style={{ backgroundColor: visual.cor, color: visual.corTextoBotao }}
        >
          Aceitar
        </button>
        <button
          type="button"
          onClick={() => handleChoice(false)}
          className="min-h-[44px] flex-1 rounded-full border border-slate-300 px-4 text-sm font-bold leading-none text-slate-600 transition-all duration-300 hover:bg-slate-100 hover:text-slate-900 active:scale-95"
        >
          Recusar
        </button>
      </div>
    </div>
  );
}
