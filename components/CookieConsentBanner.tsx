'use client';
// components/CookieConsentBanner.tsx
//
// Banner de consentimento de cookies (LGPD). Não inicializa o Clarity —
// isso já é feito em outro lugar (ClarityInit.tsx, conforme o relatório
// de implementação). Esse componente informa a escolha ao Clarity, ao
// Google Consent Mode v2 e aos pixels publicitários das marcas.
//
// Guarda a escolha em localStorage — o banner não aparece de novo depois
// que o usuário decide, em nenhum dos dois casos (aceitar ou recusar).
//
// As cores vêm de `BRANDS[marca]`, não são fixas: o mesmo banner aparece na
// minhAi, no Convite IA, no ArteFinal, no Pix Wiki e no ConsultaTec.
import { useEffect, useState } from 'react';
import Clarity from '@microsoft/clarity';
import { useMarca } from '@/lib/useMarca';
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  applyGoogleConsent,
} from '@/lib/analytics';
import { announceAnalyticsConsent } from '@/lib/meta-pixel';

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

  // O GTM pode não existir neste host (ex.: minhAi principal). A função é
  // segura nesses casos e apenas prepara/atualiza o estado quando necessário.
  applyGoogleConsent(granted ? 'granted' : 'denied');

  // Avisa integrações client-side (ex.: Meta Pixel da ConviteIA) imediatamente
  // na mesma aba. O evento `storage` do browser não é disparado na aba que fez
  // a própria alteração, por isso usamos um CustomEvent explícito.
  announceAnalyticsConsent(granted);
}

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const { marca } = useMarca();

useEffect(() => {
  const hostname = window.location.hostname.toLowerCase();

  // Convites públicos: qualquer subdomínio de conviteia.com,
  // exceto www.conviteia.com.
  const convitePublico =
    hostname.endsWith('.conviteia.com') &&
    hostname !== 'www.conviteia.com';

  if (convitePublico) {
    // Nunca mostra o banner dentro do convite público.
    // Se já houve consentimento nesta origem, respeita.
    // Caso contrário, mantém analytics não essenciais negados.
    const stored = localStorage.getItem(
      ANALYTICS_CONSENT_STORAGE_KEY
    );

    applyConsent(stored === 'granted');
    setVisible(false);
    return;
  }

  const stored = localStorage.getItem(
    ANALYTICS_CONSENT_STORAGE_KEY
  );

  if (stored === 'granted') {
    applyConsent(true);
  } else if (stored === 'denied') {
    applyConsent(false);
  } else {
    setVisible(true);
  }
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
      className="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-sm z-[60] rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-xl shadow-2xl p-4 sm:p-5"
    >
      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mb-3">
        Usamos cookies para entender como você usa o site e melhorar sua experiência.
        Você pode aceitar ou recusar os cookies não essenciais a qualquer momento.
        Saiba mais no nosso{' '}
        {/* corTexto, não cor: link é texto pequeno e exige 4,5:1 sobre o
            fundo claro, contraste maior que o do botão preenchido. */}
        <a
          href="/aviso"
          className="font-semibold hover:underline"
          style={{ color: marca.corTexto }}
        >
          Aviso de Privacidade
        </a>
        .
      </p>
      <div className="flex items-center gap-2">
        {/* `style` inline e não classe do Tailwind: o Tailwind gera CSS em
            build a partir das classes que encontra no código-fonte. Uma
            classe montada em runtime — bg-[${marca.cor}] — não existiria no
            CSS final e o botão sairia transparente. */}
        <button
          onClick={() => handleChoice(true)}
          className="flex-1 px-4 py-2 rounded-full text-xs sm:text-sm font-bold leading-none hover:brightness-110 transition-all duration-300 active:scale-95"
          style={{ backgroundColor: marca.cor, color: marca.corTextoBotao }}
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
