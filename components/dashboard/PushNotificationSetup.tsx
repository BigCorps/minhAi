'use client';
import { useEffect } from 'react';
import OneSignal from 'react-onesignal';

// Fora do componente — não reseta com StrictMode
let oneSignalInitialized = false;

export function PushNotificationSetup({ userId }: { userId: string }) {
  useEffect(() => {
    if (oneSignalInitialized) return;
    oneSignalInitialized = true;

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
                  text: {
                    actionMessage: "Ative as notificações para receber novidades em tempo real.",
                    acceptButton: "Ativar",
                    cancelButton: "Agora não",
                  },
                  delay: {
                    pageViews: 1,
                    timeDelay: 3,
                  },
                },
              ],
            },
          },
          welcomeNotification: {
            title: "minhAi",
            message: "Notificações ativadas com sucesso!",
          },
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

  return null;
}
