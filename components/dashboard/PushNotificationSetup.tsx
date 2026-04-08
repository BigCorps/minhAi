'use client';
import { useState, useEffect, useRef } from 'react';
import OneSignal from 'react-onesignal';
import { Bell, Loader2 } from 'lucide-react';

export function PushNotificationSetup({ userId }: { userId: string }) {
  const [isOptedIn, setIsOptedIn] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
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
          serviceWorkerPath: "sw.js"
        });

        // Aguarda o SW estar completamente ativo antes de continuar
        if ('serviceWorker' in navigator) {
          await navigator.serviceWorker.ready;
        }

        if (userId) {
          await OneSignal.login(userId);
        }

        const optedIn = OneSignal.User.PushSubscription.optedIn ?? false;
        setIsOptedIn(optedIn);

        OneSignal.User.PushSubscription.addEventListener('change', (event) => {
          setIsOptedIn(event.current.optedIn);
        });
      } catch (error) {
        console.error("Erro ao inicializar OneSignal:", error);
        setIsOptedIn(false);
      }
    }

    initOneSignal();
  }, [userId]);

  const handleSubscribe = async () => {
    const permission = Notification.permission;
    console.log("🔔 Estado atual da permissão:", permission);

    if (permission === 'denied') {
      alert("Notificações bloqueadas. Acesse as configurações do site e permita notificações.");
      return;
    }

    setLoading(true);
    try {
      console.log("🔔 Solicitando permissão...");
      const accepted = await OneSignal.Notifications.requestPermission();
      console.log("🔔 Resultado:", accepted);

      if (accepted) {
        // Aguarda o token ser gerado
        await new Promise(resolve => setTimeout(resolve, 1500));
        const optedIn = OneSignal.User.PushSubscription.optedIn ?? false;
        console.log("🔔 optedIn após aceite:", optedIn);
        setIsOptedIn(optedIn);
      } else {
        alert("Permissão negada. Verifique as configurações do navegador.");
      }
    } catch (error) {
      console.error('Erro ao pedir permissão:', error);
    } finally {
      setLoading(false);
    }
  };

  // null = carregando (não pisca), true = já inscrito (some)
  if (isOptedIn === null || isOptedIn === true) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-4 text-center md:text-left">
        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0">
          <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Ative as Notificações</h3>
          <p className="text-sm text-gray-600 dark:text-white/70">
            Receba alertas em tempo real sobre seus assistentes e saldo.
          </p>
        </div>
      </div>
      <button
        onClick={handleSubscribe}
        disabled={loading}
        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bell className="w-5 h-5" />}
        Quero Receber
      </button>
    </div>
  );
}