'use client';

import { useState, useEffect } from 'react';
import OneSignal from 'react-onesignal';
import { Bell, Loader2 } from 'lucide-react';

export function PushNotificationSetup({ userId }: { userId: string }) {
  const [isOptedIn, setIsOptedIn] = useState(true); // Começa assumindo true para não piscar na tela
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function initOneSignal() {
      if (!process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID) return;

      try {
        await OneSignal.init({
          appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
          safari_web_id: "web.onesignal.auto...", // Preencha se quiser suporte ao Safari depois
          notifyButton: { enable: false }, // Esconde o sino flutuante nativo deles
          serviceWorkerParam: { scope: "/" },
          serviceWorkerPath: "sw.js"
        });

        // O pulo do gato: vincula o aparelho logado ao ID do seu usuário no Supabase!
        if (userId) {
          await OneSignal.login(userId);
        }

        const optedIn = OneSignal.User.PushSubscription.optedIn;
        setIsOptedIn(optedIn);

        // Escuta se o usuário aceitar pelo prompt do navegador
        OneSignal.User.PushSubscription.addEventListener('change', (event) => {
          setIsOptedIn(event.current.optedIn);
        });

      } catch (error) {
        console.error("Erro ao inicializar OneSignal:", error);
      }
    }

    initOneSignal();
  }, [userId]);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      // Força diretamente o prompt nativo do navegador (ignora o Slidedown)
      const accepted = await OneSignal.Notifications.requestPermission();
      
      if (accepted) {
        setIsOptedIn(true);
        console.log("✅ Permissão concedida com sucesso!");
      } else {
        alert("A permissão foi negada ou o navegador bloqueou o aviso. Verifique o cadeado na barra de endereços.");
      }
    } catch (error) {
      console.error('Erro ao pedir permissão:', error);
    } finally {
      setLoading(false);
    }
  };

  // Some sozinho se já estiver inscrito
  if (isOptedIn) return null;

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