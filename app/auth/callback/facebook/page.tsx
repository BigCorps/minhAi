'use client';
// app/auth/callback/facebook/page.tsx
//
// Suporta dois fluxos:
//   1. OAuth redirect clássico (Facebook + Instagram) — chega com ?code=
//      Processa via exchange-meta-code e envia postMessage para o popup pai
//   2. Embedded Signup v4 (WhatsApp) — NÃO usa redirect, processa via SDK
//      Se chegar um code de WA aqui por engano, orienta o usuário
//   3. Login social Supabase Auth — sem code, só reload do opener

import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function FacebookCallbackPage() {
  const [status, setStatus] = useState<{
    message: string;
    type: 'loading' | 'success' | 'error';
    canClose: boolean;
  }>({ message: 'Processando autenticação...', type: 'loading', canClose: false });

  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    console.log(msg);
    setLogs((prev) => [...prev, msg]);
  };

  useEffect(() => {
    processCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processCallback = async () => {
    try {
      addLog('🚀 Iniciando processamento...');

      const urlParams = new URLSearchParams(window.location.search);
      const code      = urlParams.get('code');
      const state     = urlParams.get('state');
      const error     = urlParams.get('error');
      const errorDesc = urlParams.get('error_description');

      if (error) {
        addLog(`❌ Erro OAuth: ${error}`);
        throw new Error(errorDesc || error);
      }

      // Sem code = login simples do Supabase Auth
      if (!code) {
        addLog('✅ Callback de login Supabase');
        if (window.opener && !window.opener.closed) {
          window.opener.location.reload();
          setStatus({ message: 'Login realizado com sucesso!', type: 'success', canClose: false });
          setTimeout(() => window.close(), 1000);
        } else {
          window.location.href = '/dashboard';
        }
        return;
      }

      // Code presente = OAuth redirect clássico (Facebook + Instagram)
      addLog('✅ Code OAuth recebido — processando Facebook/Instagram...');
      await processMetaCallback(code, state);

    } catch (err: any) {
      addLog(`❌ Erro: ${err.message}`);
      setStatus({ message: err.message, type: 'error', canClose: true });
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          { type: 'meta_connection_error', success: false, error: err.message },
          window.location.origin
        );
        setTimeout(() => window.close(), 3000);
      }
    }
  };

  const processMetaCallback = async (code: string, state: string | null) => {
    addLog('⚙️ Chamando exchange-meta-code...');

    const stateParts = state?.split(':') || [];
    const companyId  = stateParts[1] || null;

    const redirectUri       = `${window.location.origin}/auth/callback/facebook`;
    const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Configuração do Supabase não encontrada');
    }

    addLog(`📍 Redirect URI: ${redirectUri}`);

    const exchangeResponse = await fetch(`${SUPABASE_URL}/functions/v1/exchange-meta-code`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        code,
        state,
        redirect_uri: redirectUri,
        company_id:   companyId,
        // Sem waba_id/phone_number_id — fluxo FB+IG não inclui WhatsApp
      }),
    });

    if (!exchangeResponse.ok) {
      const errData = await exchangeResponse.json();
      throw new Error(errData.error || 'Erro ao processar no Supabase');
    }

    const metaData = await exchangeResponse.json();
    if (!metaData.success) throw new Error(metaData.error || 'Erro desconhecido');

    addLog('✅ Dados Meta recebidos');
    addLog(`📄 Páginas: ${metaData.pages?.length || 0}`);
    addLog(`📸 Instagram: ${metaData.summary?.withInstagram || 0}`);

    const connectionData = {
      userId:        metaData.userId,
      pages:         metaData.pages,
      grantedScopes: metaData.grantedScopes || [],
      companyId,
    };

    const isPopup = window.opener && !window.opener.closed;

    if (isPopup) {
      addLog('📨 Enviando via postMessage (popup)...');
      window.opener.postMessage(
        { type: 'meta_connection_success', success: true, data: connectionData, state },
        window.location.origin
      );
      setStatus({ message: 'Facebook / Instagram conectado com sucesso!', type: 'success', canClose: false });
      addLog('🎉 Sucesso! Fechando popup...');
      setTimeout(() => window.close(), 1000);
    } else {
      addLog('📨 Salvando resultado e redirecionando...');
      localStorage.setItem(
        'meta_connection_result',
        JSON.stringify({ success: true, data: connectionData, state, timestamp: Date.now() })
      );
      setStatus({ message: 'Conectado! Redirecionando...', type: 'success', canClose: false });
      addLog('🎉 Sucesso! Voltando para o dashboard...');
      setTimeout(() => { window.location.href = '/dashboard/atendimentos'; }, 1500);
    }
  };

  const handleBack = () => {
    window.location.href = '/dashboard/atendimentos';
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900 p-5 font-sans">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-8 max-w-md w-full shadow-lg border border-gray-200 dark:border-white/10">

        <div className="flex justify-center mb-6">
          {status.type === 'loading' && <Loader2 className="h-10 w-10 animate-spin text-blue-500" />}
          {status.type === 'success'  && <CheckCircle className="h-10 w-10 text-green-500" />}
          {status.type === 'error'    && <XCircle className="h-10 w-10 text-red-500" />}
        </div>

        <h2 className="text-lg font-semibold text-center mb-2 text-gray-900 dark:text-white">
          {status.type === 'loading' && 'Processando...'}
          {status.type === 'success'  && 'Sucesso!'}
          {status.type === 'error'    && 'Ocorreu um erro'}
        </h2>

        <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
          {status.message}
        </p>

        {logs.length > 0 && (
          <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 max-h-48 overflow-y-auto text-xs font-mono text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 mb-5">
            {logs.map((log, i) => (
              <div key={i} className="mb-1.5 pb-1.5 border-b border-gray-200 dark:border-white/5 last:border-0">
                {log}
              </div>
            ))}
          </div>
        )}

        {status.type !== 'loading' && (
          <button
            onClick={handleBack}
            className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white transition ${
              status.type === 'error'
                ? 'bg-blue-500 hover:bg-blue-600'
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            Voltar para Atendimentos
          </button>
        )}
      </div>
    </div>
  );
}
