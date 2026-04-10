'use client';
import { useEffect, useRef } from 'react';
import OneSignal from 'react-onesignal';

export function PushNotificationSetup({ userId }: { userId: string }) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function initOneSignal() {
      if (!process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID) return;

      try {
        await OneSignal.init({
          appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
          notifyButton: { enable: false },
          serviceWorkerParam: { scope: "/" },
          serviceWorkerPath: "OneSignalSDKWorker.js",
          // Deixa o OneSignal controlar o prompt nativamente
          promptOptions: {
            slidedown: {
              prompts: [
                {
                  type: "push",
                  autoPrompt: true,
                  delay: {
                    pageViews: 1,
                    timeDelay: 3 // aparece 3 segundos após carregar
                  }
                }
              ]
            }
          }
        });

        if (userId) {
          await OneSignal.login(userId);
        }

      } catch (error) {
        console.error("Erro ao inicializar OneSignal:", error);
      }
    }

    initOneSignal();
  }, [userId]);

  // Não renderiza nada — o OneSignal cuida do prompt
  return null;
}