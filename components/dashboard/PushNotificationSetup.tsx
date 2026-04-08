'use client';

import { useState, useEffect } from 'react';
import OneSignal from 'react-onesignal';
import { Bell, Loader2 } from 'lucide-react';

export function PushNotificationSetup({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function initOneSignal() {
      if (!process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID) return;
      try {
        await OneSignal.init({
          appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerParam: { scope: "/" },
          serviceWorkerPath: "sw.js"
        });

        if (userId) await OneSignal.login(userId);
      } catch (e) { console.error(e); }
    }
    initOneSignal();
  }, [userId]);

  const handleForceSubscribe = async () => {
    setLoading(true);
    try {
      console.log("🔄 Iniciando renovação forçada...");
      
      // 1. Remove a assinatura atual localmente para limpar o estado
      await OneSignal.User.PushSubscription.optOut();
      
      // 2. Tenta pedir permissão e registrar novamente
      await OneSignal.Notifications.requestPermission();
      await OneSignal.User.PushSubscription.optIn();
      
      console.log("✅ Processo de renovação concluído. Verifique o painel do OneSignal.");
      alert("Tentativa de renovação enviada! Verifique se seu usuário aparece como ativo no OneSignal.");
    } catch (error) {
      console.error('Erro na renovação:', error);
    } finally {
      setLoading(false);
    }
  };

  // Removi a verificação "if (isOptedIn) return null" para o banner NUNCA sumir
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 my-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
          <Bell className="w-6 h-6 text-orange-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 leading-tight inline-flex items-center gap-2">
            Modo de Teste: Forçar Notificações
            <span className="bg-orange-200 text-orange-800 text-xs px-2 py-0.5 rounded-full uppercase">Beta</span>
          </h3>
          <p className="text-sm text-gray-600">Clique para renovar o token e tentar registrar seu aparelho novamente.</p>
        </div>
      </div>
      <button
        onClick={handleForceSubscribe}
        disabled={loading}
        className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition shadow-sm"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bell className="w-5 h-5" />}
        Renovar Inscrição
      </button>
    </div>
  );
}
