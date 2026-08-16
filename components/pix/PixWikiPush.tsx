'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

const PIXWIKI_ONESIGNAL_APP_ID = '2b85c242-a04a-4251-bf2f-32f3f88b5d66';
const SDK_URL = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void | Promise<void>>;
    __pixwikiOneSignalStarted?: boolean;
  }
}

interface Props {
  userId: string;
  dark?: boolean;
}

type PushState = 'loading' | 'ready' | 'granted' | 'denied' | 'unsupported' | 'error';

export default function PixWikiPush({ userId, dark = true }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<PushState>('loading');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function registerDevice(OneSignal: any) {
    const subscriptionId = String(OneSignal?.User?.PushSubscription?.id || '');
    if (!subscriptionId) return false;

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('user_id', userId)
      .eq('segment_key', 'pix_wiki')
      .maybeSingle();

    if (companyError || !company?.id) return false;

    const { error } = await supabase.rpc('pixwiki_register_push_subscription', {
      p_company_id: company.id,
      p_subscription_id: subscriptionId,
      p_onesignal_id: OneSignal?.User?.onesignalId || null,
      p_user_agent: navigator.userAgent || null,
    });

    if (error) throw error;
    return true;
  }

  async function syncState(OneSignal: any) {
    const permission = Notification.permission;
    const subscription = OneSignal?.User?.PushSubscription;
    const optedIn = subscription?.optedIn === true;
    const subscriptionId = String(subscription?.id || '');

    if (permission === 'denied') {
      setState('denied');
      setMessage('As notificações estão bloqueadas no navegador. Libere o PixWiki nas permissões do site.');
      return false;
    }

    if (permission === 'granted' && optedIn && subscriptionId) {
      try {
        const registered = await registerDevice(OneSignal);
        if (registered) {
          setState('granted');
          setMessage('Push ativo neste dispositivo.');
          return true;
        }
      } catch (error) {
        console.error('[PixWiki Push] register device:', error);
        setState('error');
        setMessage('A assinatura foi criada, mas não foi possível registrar este dispositivo no PixWiki.');
        return false;
      }
    }

    setState('ready');
    if (permission === 'granted') {
      setMessage('Permissão concedida. Concluindo a assinatura Push neste dispositivo...');
    }
    return false;
  }

  useEffect(() => {
    if (!userId || typeof window === 'undefined') return;

    const hostname = window.location.hostname.toLowerCase();
    if (hostname !== 'pix.wiki' && hostname !== 'www.pix.wiki') {
      setState('unsupported');
      setMessage('Ative o Push acessando o dashboard diretamente em pix.wiki.');
      return;
    }

    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setState('unsupported');
      setMessage('Este navegador não oferece suporte a notificações Web Push.');
      return;
    }

    let cancelled = false;
    let removeSubscriptionListener: (() => void) | null = null;

    const queueInit = () => {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          if (!window.__pixwikiOneSignalStarted) {
            window.__pixwikiOneSignalStarted = true;
            await OneSignal.init({
              appId: PIXWIKI_ONESIGNAL_APP_ID,
              allowLocalhostAsSecureOrigin: false,
            });
          }

          const onSubscriptionChange = async () => {
            if (!cancelled) await syncState(OneSignal);
          };
          OneSignal.User.PushSubscription.addEventListener('change', onSubscriptionChange);
          removeSubscriptionListener = () => {
            try {
              OneSignal.User.PushSubscription.removeEventListener('change', onSubscriptionChange);
            } catch {
              // best effort
            }
          };

          // O External ID precisa estar associado ao usuário autenticado.
          await OneSignal.login(userId);

          // Se a permissão do navegador já foi concedida anteriormente, mas a
          // assinatura OneSignal ainda não foi criada/opted-in, corrige sozinho
          // ao carregar o dashboard. Isto evita o falso positivo de apenas
          // Notification.permission === 'granted'.
          if (Notification.permission === 'granted' && OneSignal.User.PushSubscription.optedIn !== true) {
            await OneSignal.User.PushSubscription.optIn();
            await OneSignal.login(userId);
          }

          if (cancelled) return;
          let active = await syncState(OneSignal);
          for (let i = 0; i < 24 && !active && !cancelled; i += 1) {
            await new Promise(resolve => window.setTimeout(resolve, 250));
            active = await syncState(OneSignal);
          }
        } catch (error) {
          console.error('[PixWiki Push] init:', error);
          if (!cancelled) {
            setState('error');
            setMessage('Não foi possível iniciar as notificações agora.');
          }
        }
      });
    };

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`);
    if (existing) {
      queueInit();
    } else {
      const script = document.createElement('script');
      script.src = SDK_URL;
      script.defer = true;
      script.onload = queueInit;
      script.onerror = () => {
        if (!cancelled) {
          setState('error');
          setMessage('Não foi possível carregar o serviço de Push.');
        }
      };
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      removeSubscriptionListener?.();
    };
  }, [userId, supabase]);

  async function requestPermission() {
    if (state === 'denied') {
      setMessage('As notificações estão bloqueadas no navegador. Libere o PixWiki nas permissões do site e tente novamente.');
      return;
    }

    setBusy(true);
    setMessage('');
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        await OneSignal.login(userId);

        // optIn() é a operação correta do SDK v16: se ainda não houver token,
        // solicita a permissão; se já houver, garante que a subscription fique
        // realmente inscrita no OneSignal.
        await OneSignal.User.PushSubscription.optIn();
        await OneSignal.login(userId);

        // O token/Subscription ID pode chegar alguns instantes depois do aceite.
        // Só exibimos "ativo" quando o SDK confirma uma assinatura utilizável.
        let active = await syncState(OneSignal);
        for (let i = 0; i < 20 && !active; i += 1) {
          await new Promise(resolve => window.setTimeout(resolve, 250));
          active = await syncState(OneSignal);
        }

        if (!active && Notification.permission === 'granted') {
          setState('ready');
          setMessage('A permissão foi concedida, mas a assinatura ainda está sendo criada. Reabra o dashboard em alguns segundos.');
        }
      } catch (error) {
        console.error('[PixWiki Push] permission:', error);
        setState('error');
        setMessage('Não foi possível ativar o Push. Tente novamente.');
      } finally {
        setBusy(false);
      }
    });
  }

  const panel = dark
    ? 'border-white/10 bg-white/[0.035] text-white'
    : 'border-black/10 bg-black/[0.025] text-slate-900';
  const muted = dark ? 'text-white/55' : 'text-slate-500';

  return (
    <div className={`rounded-2xl border p-4 ${panel}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${state === 'granted' ? 'bg-emerald-400' : state === 'denied' || state === 'error' ? 'bg-red-400' : 'bg-amber-400'}`} />
            <p className="text-sm font-bold">Push PixWiki</p>
          </div>
          <p className={`mt-1 text-xs leading-relaxed ${muted}`}>
            {state === 'granted'
              ? 'Ativo neste dispositivo.'
              : state === 'loading'
                ? 'Carregando configuração...'
                : state === 'unsupported'
                  ? message
                  : 'Receba um aviso instantâneo quando o PixWiki detectar um pagamento.'}
          </p>
        </div>

        {state !== 'granted' && state !== 'loading' && state !== 'unsupported' && (
          <button
            type="button"
            onClick={requestPermission}
            disabled={busy}
            className="shrink-0 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {busy ? 'Ativando...' : 'Ativar Push'}
          </button>
        )}
      </div>

      {message && state !== 'unsupported' && (
        <p className={`mt-3 text-xs ${state === 'granted' ? 'text-emerald-400' : state === 'denied' || state === 'error' ? 'text-red-400' : muted}`}>
          {message}
        </p>
      )}
    </div>
  );
}
