'use client';
import { useEffect } from 'react';

// Hosts que realmente usam push. O service worker do OneSignal instala um
// handler de fetch proprio, e em dominio onde o OneSignal nao esta configurado
// esse handler rejeita a navegacao:
//
//   The FetchEvent for "https://conviteia.com/convite/entrar" resulted in a
//   network error response: the promise was rejected.
//   Uncaught (in promise) TypeError: Failed to convert value to 'Response'.
//
// Era isso que jogava o usuario de volta para a inicial depois do login na
// ConviteIA. Lista de permissao, e nao de bloqueio: dominio novo entra sem
// push por padrao, que e a falha segura.
const HOSTS_COM_PUSH = [
  'minhai.app',
  'www.minhai.app',
  'min.ia.br',
  'app.min.ia.br',
  'pix.wiki',
  'consulta.tec.br',
  'ia.artefinal.app',
];

export default function RegisterSW() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const host = window.location.hostname.toLowerCase();
    if (!HOSTS_COM_PUSH.includes(host)) {
      // Remove registro antigo: quem ja abriu conviteia.com ficou com o worker
      // instalado no navegador, e ele continua quebrando ate ser desregistrado.
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => void r.unregister());
      });
      return;
    }

    navigator.serviceWorker.register('/sw.js');
  }, []);

  return null;
}
