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
          promptOptions: {
            slidedown: {
              prompts: [
                {
                  type: "push",
                  autoPrompt: true,
                  delay: {
                    pageViews: 0,
                    timeDelay: 3
                  }
                }
              ]
            }
          }
        });

        if (userId) {
          await OneSignal.login(userId);
        }

        // Força o slidedown aparecer (remova após testes)
        await OneSignal.Slidedown.promptPush();

      } catch (error) {
        console.error("Erro ao inicializar OneSignal:", error);
      }
    }

    initOneSignal();
  }, [userId]);

  return null;
}