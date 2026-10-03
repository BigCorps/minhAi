'use client';

import { useEffect, useState } from 'react';
import { Bell, BellRing, Loader2 } from 'lucide-react';
import OneSignal from 'react-onesignal';
import { createMelhoriaClient } from '@/lib/melhoria/supabase';
import { cor, toque, raio, espaco } from '@/lib/melhoria/tema';
import { melhoriaAnalytics, melhoriaAnalyticsOnce } from '@/lib/melhoria/analytics';

let initPromise: Promise<void> | null = null;

function appIdMelhorIA(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_MELHORIA_ONESIGNAL_APP_ID ||
    process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
  );
}

async function iniciar(userId: string) {
  const appId = appIdMelhorIA();
  if (!appId) throw new Error('OneSignal não configurado');

  if (!initPromise) {
    initPromise = OneSignal.init({
      appId,
      notifyButton: { enable: false },
      serviceWorkerParam: { scope: '/' },
      serviceWorkerPath: 'OneSignalSDKWorker.js',
      // Sem autoPrompt: a permissão só aparece depois de a pessoa entender
      // por que precisa dela e tocar explicitamente em "Ativar lembretes".
    }).then(() => undefined);
  }

  await initPromise;
  await OneSignal.login(userId);
}

export default function PushNotificationSetup({
  userId,
  perfilId,
  mostrarConvite = false,
  onPermissionChange,
}: {
  userId: string;
  perfilId?: string;
  mostrarConvite?: boolean;
  onPermissionChange?: (allowed: boolean) => void;
}) {
  const mel = createMelhoriaClient();
  const [pronto, setPronto] = useState(false);
  const [permitido, setPermitido] = useState(false);
  const [pedindo, setPedindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || typeof window === 'undefined') return;
    let vivo = true;

    (async () => {
      try {
        await iniciar(userId);
        if (!vivo) return;
        const inicial = Boolean(OneSignal.Notifications.permission);
        setPermitido(inicial);
        onPermissionChange?.(inicial);
        if (inicial && perfilId) {
          await createMelhoriaClient().from('perfis').update({ notificacoes_ativadas_em: new Date().toISOString() }).eq('id', perfilId);
        }
        setPronto(true);
      } catch (e) {
        console.error('[MelhorIA push] Falha na inicialização:', e);
        if (vivo) {
          setPronto(true);
          setErro('Não consegui preparar as notificações neste aparelho.');
        }
      }
    })();

    return () => { vivo = false; };
  }, [userId, onPermissionChange]);

  async function pedirPermissao() {
    setPedindo(true);
    setErro(null);
    melhoriaAnalytics('notification_prompt_shown');

    try {
      await iniciar(userId);
      const aceitou = await OneSignal.Notifications.requestPermission();
      const atual = Boolean(aceitou || OneSignal.Notifications.permission);
      setPermitido(atual);
      onPermissionChange?.(atual);
      melhoriaAnalytics(atual ? 'notification_allowed' : 'notification_denied');
      if (atual) {
        melhoriaAnalyticsOnce('notifications-enabled', 'notification_enabled');
        if (perfilId) {
          await mel.from('perfis').update({ notificacoes_ativadas_em: new Date().toISOString() }).eq('id', perfilId);
        }
      }
      else setErro('Sem essa permissão, os avisos podem não aparecer com o aplicativo fechado.');
    } catch (e) {
      console.error('[MelhorIA push] Falha ao pedir permissão:', e);
      setErro('Não consegui ativar agora. Você pode tentar novamente depois.');
    } finally {
      setPedindo(false);
    }
  }

  if (!mostrarConvite || !pronto || permitido) return null;

  return (
    <section id="melhoria-notificacoes" style={{
      background: cor.destaqueSuave,
      border: `3px solid ${cor.destaque}`,
      borderRadius: raio.card,
      padding: espaco.lg,
      marginBottom: espaco.xl,
      textAlign: 'center',
    }}>
      <BellRing size={52} aria-hidden="true" style={{ color: cor.destaqueTexto, margin: '0 auto' }} />
      <h2 style={{ fontSize: 28, lineHeight: 1.2, color: cor.tinta, margin: `${espaco.sm}px 0 ${espaco.xs}px`, fontWeight: 800 }}>
        Seu primeiro lembrete está pronto. Quer receber o aviso com o app fechado?
      </h2>
      <p style={{ fontSize: 20, lineHeight: 1.5, color: cor.tintaMuted, margin: `0 0 ${espaco.md}px` }}>
        Ative as notificações agora. É isso que permite à MelhorIA avisar no horário escolhido sem você precisar deixar a tela aberta.
      </p>

      {erro && <p role="status" style={{ color: cor.perigoTexto, fontSize: 19, fontWeight: 700 }}>{erro}</p>}

      <button
        type="button"
        onClick={pedirPermissao}
        disabled={pedindo}
        style={{
          minHeight: toque.critico, width: '100%', border: 'none',
          borderRadius: raio.botao, background: cor.destaque, color: '#fff',
          fontSize: 25, fontWeight: 800, cursor: pedindo ? 'wait' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
        }}
      >
        {pedindo ? <Loader2 className="animate-spin" size={30} /> : <Bell size={30} />}
        {pedindo ? 'Ativando...' : 'Ativar lembretes'}
      </button>

      <p style={{ fontSize: 18, color: cor.tintaMuted, margin: `${espaco.sm}px 0 0` }}>
        Você pode mudar essa permissão depois nas configurações do aparelho.
      </p>
    </section>
  );
}
