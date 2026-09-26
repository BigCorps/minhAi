'use client';

import { useEffect } from 'react';

const HOSTS_COM_SW_GLOBAL = [
  'minhai.app',
  'www.minhai.app',
  'min.ia.br',
  'app.min.ia.br',
  'pix.wiki',
  'consulta.tec.br',
  'ia.artefinal.app',
];

const HOSTS_COM_ONESIGNAL_PROPRIO = [
  'melhoria.org',
  'www.melhoria.org',
];

function scriptUrlDoRegistro(reg: ServiceWorkerRegistration): string {
  return reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || '';
}

function ehWorkerOneSignal(scriptUrl: string): boolean {
  try { return new URL(scriptUrl).pathname === '/OneSignalSDKWorker.js'; }
  catch { return scriptUrl.includes('/OneSignalSDKWorker.js'); }
}

export default function RegisterSW() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const host = window.location.hostname.toLowerCase();

    if (host === 'midia.pro' || host === 'www.midia.pro' || host.endsWith('.midia.pro')) {
      navigator.serviceWorker.register('/midia-sw.js').catch((error) => {
        console.warn('[RegisterSW] Falha ao registrar /midia-sw.js:', error);
      });
      return;
    }

    if (HOSTS_COM_ONESIGNAL_PROPRIO.includes(host)) {
      navigator.serviceWorker.getRegistrations()
        .then((regs) => regs.forEach((reg) => {
          const scriptUrl = scriptUrlDoRegistro(reg);
          if (scriptUrl && !ehWorkerOneSignal(scriptUrl)) void reg.unregister();
        }))
        .catch((error) => console.warn('[RegisterSW] Falha ao conferir workers do MelhorIA:', error));
      return;
    }

    if (!HOSTS_COM_SW_GLOBAL.includes(host)) {
      navigator.serviceWorker.getRegistrations()
        .then((regs) => regs.forEach((reg) => void reg.unregister()))
        .catch((error) => console.warn('[RegisterSW] Falha ao remover service workers:', error));
      return;
    }

    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('[RegisterSW] Falha ao registrar /sw.js:', error);
    });
  }, []);

  return null;
}
