'use client';

import { useEffect, useState } from 'react';

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
  const [state, setState] = useState<PushState>('loading');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

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

          await OneSignal.login(userId);
          if (cancelled) return;

          const permission = Notification.permission;
          if (permission === 'granted') setState('granted');
          else if (permission === 'denied') setState('denied');
          else setState('ready');
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
    };
  }, [userId]);

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
        await OneSignal.Notifications.requestPermission();
        const permission = Notification.permission;
        if (permission === 'granted') {
          setState('granted');
          setMessage('Push ativado. Os próximos Pix podem ser avisados neste dispositivo.');
        } else if (permission === 'denied') {
          setState('denied');
          setMessage('O navegador bloqueou as notificações para o PixWiki.');
        } else {
          setState('ready');
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
