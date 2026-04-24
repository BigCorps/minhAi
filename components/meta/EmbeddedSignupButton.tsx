'use client';
// components/meta/EmbeddedSignupButton.tsx
//
// Implementa o Embedded Signup v4 da Meta (WhatsApp Cloud API).
// Suporta dois modos via prop `mode`:
//
//   'cloud'       → Fluxo padrão Cloud API. Cliente cria WABA novo e
//                   adiciona um número. Retorna FINISH ou FINISH_ONLY_WABA.
//
//   'coexistence' → Fluxo Coexistence (featureType: whatsapp_business_app_onboarding).
//                   Cliente mantém o WhatsApp Business App no celular E passa
//                   a usar a Cloud API simultaneamente. Retorna
//                   FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING.
//                   Exige WhatsApp Business App versão 2.24.17+.
//
// IMPORTANTE — o FB.login() NÃO aceita callback async.
// O processamento assíncrono é feito via .then()/.catch() separado.
//
// ENV VARS necessárias:
//   NEXT_PUBLIC_META_APP_ID      → ID do app Meta
//   NEXT_PUBLIC_META_CONFIG_ID   → config_id da configuração "WhatsApp Embedded Signup"
//   NEXT_PUBLIC_SUPABASE_URL     → URL do Supabase
//   NEXT_PUBLIC_SUPABASE_ANON_KEY→ Anon key do Supabase

import { useEffect, useRef, useState, useCallback } from 'react';

// ── Tipos ──────────────────────────────────────────────────────────────────

export type EmbeddedSignupMode = 'cloud' | 'coexistence';

// Dados retornados pelo message event do SDK (session logging)
interface WASignupEventData {
  phone_number_id?: string;
  waba_id?:         string;
  business_id?:     string;
  // Só presente no evento CANCEL
  current_step?:    string;
  // Só presente em erros reportados pelo usuário
  error_message?:   string;
  error_code?:      string;
  session_id?:      string;
}

// Evento completo do SDK
interface WAEmbeddedSignupEvent {
  type:   'WA_EMBEDDED_SIGNUP';
  event:
    | 'FINISH'
    | 'FINISH_ONLY_WABA'
    | 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING'
    | 'FINISH_OBO_MIGRATION'
    | 'FINISH_GRANT_ONLY_API_ACCESS'
    | 'CANCEL'
    | 'ERROR';
  data:    WASignupEventData;
  version: number;
}

// O que o componente retorna ao pai via onSuccess
export interface EmbeddedSignupResult {
  waba_id:              string;
  phone_number_id:      string;
  display_phone_number: string | null;
  is_coexistence:       boolean;  // true = cliente mantém WA Business App
}

interface EmbeddedSignupButtonProps {
  companyId:   string;
  userId:      string;
  mode?:       EmbeddedSignupMode;
  onSuccess:   (result: EmbeddedSignupResult) => void;
  onError:     (error: string) => void;
  onLoading?:  (loading: boolean) => void;
  disabled?:   boolean;
  className?:  string;
  children?:   React.ReactNode;
}

// ── Tipos globais do FB SDK ─────────────────────────────────────────────────

declare global {
  interface Window {
    FB: {
      init:  (config: object) => void;
      login: (callback: (response: any) => void, options: object) => void;
    };
    fbAsyncInit: () => void;
  }
}

// ── Componente ─────────────────────────────────────────────────────────────

export default function EmbeddedSignupButton({
  companyId,
  userId,
  mode = 'coexistence',   // padrão: coexistence para manter o Business App
  onSuccess,
  onError,
  onLoading,
  disabled  = false,
  className = '',
  children,
}: EmbeddedSignupButtonProps) {
  const [loading, setLoading]   = useState(false);
  const [sdkReady, setSdkReady] = useState(false);

  // Ref para capturar dados do message event antes do callback
  // (o message event chega antes ou junto com o response callback)
  const waEventRef = useRef<WAEmbeddedSignupEvent | null>(null);
  // Ref para flag de coexistence (para pular o registro na edge)
  const isCoexistenceRef = useRef(false);

  const META_APP_ID   = process.env.NEXT_PUBLIC_META_APP_ID!;
  const CONFIG_ID     = process.env.NEXT_PUBLIC_META_CONFIG_ID!;
  const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // ── 1. Carregar o Facebook JS SDK ────────────────────────────────────────

  useEffect(() => {
    const initSDK = () => {
      window.FB.init({
        appId:            META_APP_ID,
        autoLogAppEvents: true,
        xfbml:            true,
        version:          'v25.0',
      });
      setSdkReady(true);
      console.log('[EmbeddedSignup] FB SDK inicializado');
    };

    // Se o SDK já está carregado, só re-inicializar
    if (window.FB) {
      initSDK();
      return;
    }

    // Evitar carregar o script duas vezes
    if (document.getElementById('facebook-jssdk')) return;

    window.fbAsyncInit = initSDK;

    const script       = document.createElement('script');
    script.id          = 'facebook-jssdk';
    script.src         = 'https://connect.facebook.net/en_US/sdk.js';
    script.async       = true;
    script.defer       = true;
    script.crossOrigin = 'anonymous';
    document.body.appendChild(script);
  }, [META_APP_ID]);

  // ── 2. Listener do message event (session logging obrigatório) ───────────
  //
  // A documentação exige session logging ativo.
  // Este listener captura phone_number_id + waba_id + tipo de evento
  // antes (ou junto) do response callback.

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.endsWith('facebook.com')) return;

      try {
        const parsed = typeof event.data === 'string'
          ? JSON.parse(event.data)
          : event.data;

        if (parsed?.type !== 'WA_EMBEDDED_SIGNUP') return;

        console.log('[EmbeddedSignup] message event:', parsed);
        waEventRef.current = parsed as WAEmbeddedSignupEvent;

        // Detectar coexistence imediatamente
        if (parsed.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') {
          isCoexistenceRef.current = true;
          console.log('[EmbeddedSignup] ✅ Coexistence detectado — cliente mantém WA Business App');
        }

        if (parsed.event === 'CANCEL') {
          console.warn('[EmbeddedSignup] ⚠️ Usuário cancelou no step:', parsed.data?.current_step);
        }

      } catch {
        // Mensagens não-JSON do Facebook — ignorar silenciosamente
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // ── 3. Processar após receber o code ─────────────────────────────────────

  const processSignup = useCallback(async (code: string) => {
    const waEvent        = waEventRef.current;
    const isCoexistence  = isCoexistenceRef.current;

    const waba_id         = waEvent?.data?.waba_id         || null;
    const phone_number_id = waEvent?.data?.phone_number_id || null;

    if (!waba_id || !phone_number_id) {
      // Pode acontecer em flows sem número (FINISH_ONLY_WABA) —
      // ainda salvamos a conexão sem WhatsApp
      console.warn('[EmbeddedSignup] ⚠️ waba_id ou phone_number_id ausentes — salvando sem WhatsApp');
    }

    const redirectUri = `${window.location.origin}/auth/callback/facebook`;
    const state       = `${userId}:${companyId}:${crypto.randomUUID().substring(0, 8)}`;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/exchange-meta-code`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON}`,
      },
      body: JSON.stringify({
        code,
        state,
        redirect_uri:    redirectUri,
        company_id:      companyId,
        waba_id,
        phone_number_id,
        is_coexistence:  isCoexistence,  // edge pula o /register se true
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Erro ao salvar conexão Meta');
    }

    console.log('[EmbeddedSignup] ✅ Conexão salva:', result.summary);

    onSuccess({
      waba_id:              result.whatsapp?.waba_id              || waba_id         || '',
      phone_number_id:      result.whatsapp?.phone_number_id      || phone_number_id || '',
      display_phone_number: result.whatsapp?.display_phone_number || null,
      is_coexistence:       isCoexistence,
    });
  }, [companyId, userId, SUPABASE_URL, SUPABASE_ANON, onSuccess]);

  // ── 4. Lançar o Embedded Signup ───────────────────────────────────────────

  const launchSignup = useCallback(() => {
    if (!sdkReady || !window.FB) {
      onError('Facebook SDK ainda não carregou. Aguarde alguns segundos e tente novamente.');
      return;
    }
    if (!CONFIG_ID) {
      onError('NEXT_PUBLIC_META_CONFIG_ID não configurado.');
      return;
    }
    if (!META_APP_ID) {
      onError('NEXT_PUBLIC_META_APP_ID não configurado.');
      return;
    }

    // Resetar estado da sessão anterior
    waEventRef.current       = null;
    isCoexistenceRef.current = false;

    setLoading(true);
    onLoading?.(true);

    const featureType = mode === 'coexistence'
      ? 'whatsapp_business_app_onboarding'
      : '';

    console.log(`[EmbeddedSignup] Lançando FB.login — mode: ${mode}, featureType: "${featureType}"`);

    // FB.login NÃO aceita callback async — usar função síncrona
    // O v4 mostra uma tela final "Continuar para configuração" — o callback
    // só dispara quando o usuário clica nesse botão ou fecha o popup.
    // Se o popup abrir como aba (Edge/Safari), monitoramos via polling.
    let popupClosed = false;
    const popupCheckInterval = setInterval(() => {
      // Verificar se o message event já trouxe os dados mas o callback não disparou
      if (waEventRef.current?.event?.startsWith('FINISH') && !popupClosed) {
        popupClosed = true;
        clearInterval(popupCheckInterval);
        console.log('[EmbeddedSignup] ✅ Dados detectados via message event — processando sem callback');
        // Gerar um code fake não funciona — precisamos do code real do authResponse
        // Neste caso, notificar o usuário para fechar o popup
        setLoading(false);
        onLoading?.(false);
        onError('Feche a janela do Facebook que abriu e tente novamente. O popup foi aberto como aba separada.');
      }
    }, 1000);

    setTimeout(() => {
      clearInterval(popupCheckInterval);
    }, 120_000);

    window.FB.login(
      (response: any) => {
        clearInterval(popupCheckInterval);
        popupClosed = true;
        if (response.authResponse?.code) {
          const code = response.authResponse.code;
          console.log('[EmbeddedSignup] ✅ Code recebido — TTL: 30s');

          // Processar assincronamente sem bloquear o callback do SDK
          processSignup(code)
            .catch((err: any) => {
              console.error('[EmbeddedSignup] ❌ Erro ao processar:', err.message);
              onError(err.message || 'Erro inesperado ao conectar conta Meta');
            })
            .finally(() => {
              setLoading(false);
              onLoading?.(false);
            });
        } else {
          // Usuário fechou o popup sem completar ou houve erro de auth
          const cancelled = !response.authResponse;
          console.warn('[EmbeddedSignup] ⚠️ Login não completado:', response.status);
          if (cancelled) {
            onError('Conexão cancelada. Nenhuma alteração foi salva.');
          }
          setLoading(false);
          onLoading?.(false);
        }
      },
      {
        config_id:                      CONFIG_ID,
        response_type:                  'code',
        override_default_response_type: true,
        extras: {
          setup:              {},
          featureType,
          sessionInfoVersion: '3',
        },
      }
    );
  }, [sdkReady, CONFIG_ID, META_APP_ID, mode, processSignup, onError, onLoading]);

  // ── 5. Render ─────────────────────────────────────────────────────────────

  const isDisabled = disabled || loading || !sdkReady;

  return (
    <button
      onClick={launchSignup}
      disabled={isDisabled}
      className={className}
      type="button"
    >
      {loading ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg
            style={{ animation: 'spin 1s linear infinite', width: '16px', height: '16px' }}
            viewBox="0 0 24 24"
            fill="none"
          >
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
            <path fill="currentColor" opacity="0.75" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Conectando...
        </span>
      ) : !sdkReady ? (
        'Carregando...'
      ) : (
        children ?? 'Conectar WhatsApp'
      )}
    </button>
  );
}
