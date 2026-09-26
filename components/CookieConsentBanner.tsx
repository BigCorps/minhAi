'use client';
// components/CookieConsentBanner.tsx
//
// Banner compartilhado de consentimento (LGPD). A Midia.Pro usa o mesmo
// mecanismo de consentimento da plataforma, mas aplica sua identidade azul /
// vermelha sem obrigar o restante do monorepo a conhecer a marca nesta fase.

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

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [midiaHost, setMidiaHost] = useState(false);
  const { marca } = useMarca();
  const visual = midiaHost ? MIDIA_COOKIE_BRAND : marca;

  useEffect(() => {
    const hostname = window.location.hostname.toLowerCase();
    const pathname = window.location.pathname;
    const isMidia =
      hostname === 'midia.pro' ||
      hostname === 'www.midia.pro' ||
      hostname.endsWith('.midia.pro');
    setMidiaHost(isMidia);

    // Experiências de tela cheia não podem receber overlays de consentimento:
    // convite público e player físico do Midia.Pro. Sem escolha prévia,
    // analytics não essenciais permanecem negados.
    const convitePublico =
      (hostname.endsWith('.conviteia.com') && hostname !== 'www.conviteia.com') ||
      ((hostname === 'conviteia.com' || hostname === 'www.conviteia.com') && /^\/(?:c|r)\//.test(pathname));
    const playerMidia = hostname.endsWith('.midia.pro') && pathname === '/play';

    if (convitePublico || playerMidia) {
      const stored = localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
      applyConsent(stored === 'granted');
      setVisible(false);
      return;
    }

    const stored = localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    if (stored === 'granted') applyConsent(true);
    else if (stored === 'denied') applyConsent(false);
    else setVisible(true);
  }, []);

  const handleChoice = (granted: boolean) => {
    localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, granted ? 'granted' : 'denied');
    applyConsent(granted);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Consentimento de cookies"
      className="fixed bottom-4 left-4 right-4 z-[60] rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur-xl sm:right-auto sm:max-w-sm sm:p-5"
    >
      <p className="mb-3 text-xs leading-relaxed text-slate-700 sm:text-sm">
        Usamos cookies para entender como você usa o site e melhorar sua experiência.
        Você pode aceitar ou recusar os cookies não essenciais a qualquer momento.
        Saiba mais no nosso{' '}
        <a
          href={midiaHost ? 'https://www.minhai.app/aviso' : '/aviso'}
          className="font-semibold hover:underline"
          style={{ color: visual.corTexto }}
        >
          Aviso de Privacidade
        </a>
        .
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleChoice(true)}
          className="flex-1 rounded-full px-4 py-2 text-xs font-bold leading-none transition-all duration-300 hover:brightness-110 active:scale-95 sm:text-sm"
          style={{ backgroundColor: visual.cor, color: visual.corTextoBotao }}
        >
          Aceitar
        </button>
        <button
          onClick={() => handleChoice(false)}
          className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-xs font-bold leading-none text-slate-600 transition-all duration-300 hover:bg-slate-100 hover:text-slate-900 active:scale-95 sm:text-sm"
        >
          Recusar
        </button>
      </div>
    </div>
  );
}
