'use client';

import { useEffect } from 'react';
import OneSignal from 'react-onesignal';

let initPromise: Promise<void> | null = null;

function appIdMelhorIA(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_MELHORIA_ONESIGNAL_APP_ID ||
    process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
  );
}

/**
 * Inscreve o navegador/PWA do MelhorIA e associa a inscrição ao auth.users.id.
 * Usa App ID próprio quando configurado, com fallback temporário para a variável
 * antiga para que a publicação do código não interrompa quem já estiver usando.
 */
export default function PushNotificationSetup({ userId }: { userId: string }) {
  useEffect(() => {
    if (!userId || typeof window === 'undefined') return;
    const appId = appIdMelhorIA();
    if (!appId) {
      console.warn('[MelhorIA push] App ID do OneSignal não configurado.');
      return;
    }

    let vivo = true;

    (async () => {
      try {
        if (!initPromise) {
          initPromise = OneSignal.init({
            appId,
            notifyButton: { enable: false },
            serviceWorkerParam: { scope: '/' },
            serviceWorkerPath: 'OneSignalSDKWorker.js',
            promptOptions: {
              slidedown: {
                prompts: [
                  {
                    type: 'push',
                    autoPrompt: true,
                    delay: { pageViews: 1, timeDelay: 2 },
                  },
                ],
              },
            },
          }).then(() => undefined);
        }

        await initPromise;
        if (!vivo) return;
        await OneSignal.login(userId);
      } catch (error) {
        // Push é importante, mas nunca pode impedir a tela principal de abrir.
        console.error('[MelhorIA push] Falha na inicialização:', error);
      }
    })();

    return () => { vivo = false; };
  }, [userId]);

  return null;
}
