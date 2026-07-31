'use client';
// components/CookieConsentBanner.tsx
//
// Banner de consentimento de cookies (LGPD). Não inicializa o Clarity —
// isso já é feito em outro lugar (ClarityInit.tsx, conforme o relatório
// de implementação). Esse componente só informa o consentimento via
// Clarity.consentV2(), depois que o usuário escolhe.
//
// Guarda a escolha em localStorage — o banner não aparece de novo depois
// que o usuário decide, em nenhum dos dois casos (aceitar ou recusar).
import { useEffect, useState } from 'react';
import Clarity from '@microsoft/clarity';

const STORAGE_KEY = 'minhai_cookie_consent'; // 'granted' | 'denied'

function applyConsent(granted: boolean) {
  try {
    Clarity.consentV2({
      ad_Storage: granted ? 'granted' : 'denied',
      analytics_Storage: granted ? 'granted' : 'denied',
    });
  } catch {
    // Clarity pode não estar inicializado ainda (ex: bloqueador de anúncios,
    // ou script ainda carregando) — falha silenciosa, não quebra a página.
  }
}

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored === 'granted') {
      applyConsent(true);
    } else if (stored === 'denied') {
      applyConsent(false);
    } else {
      // Nenhuma escolha ainda — mostra o banner
      setVisible(true);
    }
  }, []);

  const handleChoice = (granted: boolean) => {
    localStorage.setItem(STORAGE_KEY, granted ? 'granted' : 'denied');
    applyConsent(granted);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Consentimento de cookies"
      className="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-sm z-[60] rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-xl shadow-2xl p-4 sm:p-5"
    >
      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mb-3">
        Usamos cookies para entender como você usa o site e melhorar sua experiência.
        Você pode aceitar ou recusar os cookies não essenciais a qualquer momento.
        Saiba mais no nosso{' '}
        <a href="/aviso" className="text-blue-600 font-semibold hover:underline">
          Aviso de Privacidade
        </a>
        .
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleChoice(true)}
          className="flex-1 px-4 py-2 rounded-full bg-[#A4C61E] text-white text-xs sm:text-sm font-bold leading-none hover:brightness-110 transition-all duration-300 active:scale-95"
        >
          Aceitar
        </button>
        <button
          onClick={() => handleChoice(false)}
          className="flex-1 px-4 py-2 rounded-full border border-slate-300 text-slate-600 text-xs sm:text-sm font-bold leading-none hover:bg-slate-100 hover:text-slate-900 transition-all duration-300 active:scale-95"
        >
          Recusar
        </button>
      </div>
    </div>
  );
}
