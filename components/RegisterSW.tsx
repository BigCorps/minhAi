'use client';

import { useEffect } from 'react';

// Hosts que usam o service worker global /sw.js.
const HOSTS_COM_SW_GLOBAL = [
  'minhai.app',
  'www.minhai.app',
  'min.ia.br',
  'app.min.ia.br',
  'pix.wiki',
  'consulta.tec.br',
  'ia.artefinal.app',
];

// O MelhorIA usa um app OneSignal próprio e, por isso, precisa deixar o
// OneSignal controlar o service worker de escopo raiz. Registrar /sw.js aqui
// concorreria com /OneSignalSDKWorker.js; desregistrar todos também quebraria
// as notificações. Neste host apenas removemos workers antigos que não sejam
// o worker do OneSignal.
const HOSTS_COM_ONESIGNAL_PROPRIO = [
  'melhoria.org',
  'www.melhoria.org',
];

function scriptUrlDoRegistro(reg: ServiceWorkerRegistration): string {
  return (
    reg.active?.scriptURL ||
    reg.waiting?.scriptURL ||
    reg.installing?.scriptURL ||
    ''
  );
}

function ehWorkerOneSignal(scriptUrl: string): boolean {
  try {
    return new URL(scriptUrl).pathname === '/OneSignalSDKWorker.js';
  } catch {
    return scriptUrl.includes('/OneSignalSDKWorker.js');
  }
}

export default function RegisterSW() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const host = window.location.hostname.toLowerCase();

    if (HOSTS_COM_ONESIGNAL_PROPRIO.includes(host)) {
      navigator.serviceWorker.getRegistrations()
        .then((regs) => {
          regs.forEach((reg) => {
            const scriptUrl = scriptUrlDoRegistro(reg);
            if (scriptUrl && !ehWorkerOneSignal(scriptUrl)) {
              void reg.unregister();
            }
          });
        })
        .catch((error) => {
          console.warn('[RegisterSW] Falha ao conferir workers do MelhorIA:', error);
        });

      return;
    }

    if (!HOSTS_COM_SW_GLOBAL.includes(host)) {
      navigator.serviceWorker.getRegistrations()
        .then((regs) => {
          regs.forEach((reg) => void reg.unregister());
        })
        .catch((error) => {
          console.warn('[RegisterSW] Falha ao remover service workers:', error);
        });

      return;
    }

    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('[RegisterSW] Falha ao registrar /sw.js:', error);
    });
  }, []);

  return null;
}
