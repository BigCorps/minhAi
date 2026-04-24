'use client';
// components/meta/EmbeddedSignupButton.tsx
//
// Implementa o Embedded Signup v4 da Meta para WhatsApp Cloud API.
// Usa FB.login() com config_id (env: NEXT_PUBLIC_META_CONFIG_ID).
//
// O SDK do Facebook abre um popup guiado onde o cliente:
//   1. Cria ou seleciona sua conta WhatsApp Business (WABA)
//   2. Escolhe exatamente qual número de telefone quer integrar
//
// Ao completar, o SDK retorna via dois canais:
//   - window 'message' event: { phone_number_id, waba_id }  ← os IDs exatos escolhidos
//   - fbLoginCallback:        { code }                       ← token de 30s para trocar
//
// O componente então chama a exchange-meta-code com os 3 valores.

import { useEffect, useRef, useState, useCallback } from 'react';

// ── Tipos ──────────────────────────────────────────────────────────────────

interface WhatsAppSignupData {
  phone_number_id: string;
  waba_id:         string;
  business_id?:    string;
  event:           string;
}

interface EmbeddedSignupButtonProps {
  companyId:    string;
  userId:       string;
  onSuccess:    (result: { waba_id: string; phone_number_id: string; display_phone_number: string | null }) => void;
  onError:      (error: string) => void;
  onLoading?:   (loading: boolean) => void;
  disabled?:    boolean;
  className?:   string;
  children?:    React.ReactNode;
}

// ── Tipos globais do FB SDK ─────────────────────────────────────────────────

declare global {
  interface Window {
    FB: {
      init: (config: object) => void;
      login: (callback: (response: any) => void, options: object) => void;
    };
    fbAsyncInit: () => void;
  }
}

// ── Componente ─────────────────────────────────────────────────────────────

export default function EmbeddedSignupButton({
  companyId,
  userId,
  onSuccess,
  onError,
  onLoading,
  disabled = false,
  className = '',
  children,
}: EmbeddedSignupButtonProps) {
  const [loading, setLoading]     = useState(false);
  const [sdkReady, setSdkReady]   = useState(false);
  const waDataRef                 = useRef<WhatsAppSignupData | null>(null);
  const codeRef                   = useRef<string | null>(null);

  const META_APP_ID     = process.env.NEXT_PUBLIC_META_APP_ID!;
  const CONFIG_ID       = process.env.NEXT_PUBLIC_META_CONFIG_ID!;  // WHATSAPP_CONFIG_ID do Meta Dashboard
  const SUPABASE_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SUPABASE_ANON   = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // ── Carregar o Facebook JS SDK ─────────────────────────────────────────

  useEffect(() => {
    // Evitar carregar duas vezes
    if (document.getElementById('facebook-jssdk')) {
      if (window.FB) setSdkReady(true);
      return;
    }

    window.fbAsyncInit = () => {
      window.FB.init({
        appId:            META_APP_ID,
        autoLogAppEvents: true,
        xfbml:            true,
        version:          'v19.0',
      });
      setSdkReady(true);
      console.log('[EmbeddedSignup] FB SDK inicializado');
    };

    const script    = document.createElement('script');
    script.id       = 'facebook-jssdk';
    script.src      = 'https://connect.facebook.net/en_US/sdk.js';
    script.async    = true;
    script.defer    = true;
    script.crossOrigin = 'anonymous';
    document.body.appendChild(script);

    return () => {
      // Não remover o script para não quebrar outras instâncias
    };
  }, [META_APP_ID]);

  // ── Ouvir o postMessage do SDK com phone_number_id + waba_id ───────────

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Aceitar apenas mensagens do Facebook
      if (!event.origin.endsWith('facebook.com')) return;

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        if (data?.type === 'WA_EMBEDDED_SIGNUP') {
          console.log('[EmbeddedSignup] Message event recebido:', data);

          if (data.event === 'FINISH' || data.event === 'FINISH_ONLY_WABA') {
            // Cliente completou o fluxo — salvar IDs para usar no callback
            waDataRef.current = {
              phone_number_id: data.data?.phone_number_id,
              waba_id:         data.data?.waba_id,
              business_id:     data.data?.business_id,
              event:           data.event,
            };
            console.log('[EmbeddedSignup] ✅ IDs capturados:', waDataRef.current);
          } else if (data.event === 'CANCEL') {
            console.warn('[EmbeddedSignup] ⚠️ Usuário cancelou no step:', data.data?.current_step);
            waDataRef.current = null;
          }
        }
      } catch {
        // Ignorar mensagens que não são JSON válido
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // ── Processar após ter code + waba_id + phone_number_id ────────────────

  const processSignup = useCallback(async (code: string) => {
    const waData = waDataRef.current;

    if (!waData?.phone_number_id || !waData?.waba_id) {
      // Usuário completou OAuth mas não passou pelo Embedded Signup de WA
      // (pode ter conectado só Facebook/Instagram) — ainda salvar a conexão
      console.warn('[EmbeddedSignup] ⚠️ Sem dados de WA — salvando apenas Facebook/Instagram');
    }

    const state       = `${userId}:${companyId}:${crypto.randomUUID().substring(0, 8)}`;
    const redirectUri = `${window.location.origin}/auth/callback/facebook`;

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/exchange-meta-code`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON}`,
        },
        body: JSON.stringify({
          code,
          state,
          redirect_uri:    redirectUri,
          company_id:      companyId,
          waba_id:         waData?.waba_id         || null,
          phone_number_id: waData?.phone_number_id || null,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao salvar conexão');
      }

      console.log('[EmbeddedSignup] ✅ Conexão salva:', result.summary);

      onSuccess({
        waba_id:              result.whatsapp?.waba_id              || '',
        phone_number_id:      result.whatsapp?.phone_number_id      || '',
        display_phone_number: result.whatsapp?.display_phone_number || null,
      });
    } catch (err: any) {
      throw new Error(err.message || 'Erro ao processar conexão');
    }
  }, [companyId, userId, SUPABASE_URL, SUPABASE_ANON, onSuccess]);

  // ── Lançar o Embedded Signup ────────────────────────────────────────────

  const launchSignup = useCallback(() => {
    if (!sdkReady || !window.FB) {
      onError('Facebook SDK ainda não carregou. Tente novamente em alguns segundos.');
      return;
    }

    if (!CONFIG_ID) {
      onError('NEXT_PUBLIC_META_CONFIG_ID não configurado.');
      return;
    }

    // Resetar dados anteriores
    waDataRef.current  = null;
    codeRef.current    = null;

    setLoading(true);
    onLoading?.(true);

    // FB.login NÃO aceita callback async — usar função síncrona e
    // disparar o processamento via Promise separada
    window.FB.login(
      (response: any) => {
        if (response.authResponse?.code) {
          const code = response.authResponse.code;
          console.log('[EmbeddedSignup] ✅ Code recebido, processando...');
          processSignup(code)
            .catch((err: any) => onError(err.message || 'Erro inesperado ao conectar'))
            .finally(() => { setLoading(false); onLoading?.(false); });
        } else {
          console.warn('[EmbeddedSignup] ⚠️ Login cancelado ou sem code');
          onError('Conexão cancelada. Nenhuma alteração foi salva.');
          setLoading(false);
          onLoading?.(false);
        }
      },
      {
        config_id:                    CONFIG_ID,
        response_type:                'code',
        override_default_response_type: true,
        extras: {
          setup:          {},
          featureType:    '',
          sessionInfoVersion: '3',
        },
      }
    );
  }, [sdkReady, CONFIG_ID, processSignup, onError, onLoading]);

  // ── Render ─────────────────────────────────────────────────────────────

  const isDisabled = disabled || loading || !sdkReady;

  return (
    <button
      onClick={launchSignup}
      disabled={isDisabled}
      className={className}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Conectando...
        </span>
      ) : !sdkReady ? (
        'Carregando...'
      ) : (
        children || 'Conectar WhatsApp'
      )}
    </button>
  );
}
