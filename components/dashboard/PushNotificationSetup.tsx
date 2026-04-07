'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr'; // Ajuste o import do seu cliente Supabase de navegador, se necessário
import { Bell, Loader2 } from 'lucide-react';

// Função auxiliar obrigatória para converter a chave VAPID
function urlB64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationSetup({ userId }: { userId: string }) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Verifica se o navegador suporta Service Workers e Push
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

const handleSubscribe = async () => {
    setLoading(true);
    try {
      // 1. Pede a permissão
      const currentPermission = await Notification.requestPermission();
      setPermission(currentPermission);

      if (currentPermission !== 'granted') {
        setLoading(false);
        return;
      }

      // 2. FORÇA o registro do Service Worker para garantir que ele existe
      await navigator.serviceWorker.register('/sw.js');
      const registration = await navigator.serviceWorker.ready;
      
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        alert("Erro Técnico: Chave VAPID não configurada no front-end.");
        throw new Error("VAPID Key não encontrada");
      }

      // 3. Gera a inscrição no aparelho
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(vapidPublicKey),
      });

      // 4. Salva no Supabase
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { error } = await supabase.from('push_subscriptions').insert({
        user_id: userId,
        subscription: subscription.toJSON(),
      });

      if (error) {
        // Se o Supabase bloquear, ele vai avisar aqui!
        alert(`Erro ao salvar no banco: ${error.message}`);
        throw error;
      }

      alert("✅ Inscrição concluída com sucesso! Verifique a tabela.");

    } catch (error: any) {
      console.error('Erro ao assinar notificações:', error);
      alert(`🚨 Falha ao assinar: ${error.message || "Erro desconhecido"}`);
    } finally {
      setLoading(false);
    }
  };

  // Se não suportar, ou se o usuário já aceitou/negou, o banner some silenciosamente
  if (!isSupported || permission === 'granted' || permission === 'denied') {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-4 text-center md:text-left">
        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0">
          <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Ative as Notificações</h3>
          <p className="text-sm text-gray-600 dark:text-white/70">
            Receba alertas em tempo real sobre seus assistentes, novos leads e avisos de saldo.
          </p>
        </div>
      </div>
      <button
        onClick={handleSubscribe}
        disabled={loading}
        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition whitespace-nowrap disabled:opacity-70"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bell className="w-5 h-5" />}
        Quero Receber
      </button>
    </div>
  );
}
