'use client';
// app/auth/callback/facebook/page.tsx
//
// Com Embedded Signup v4, esta página NÃO é mais usada para o fluxo de WhatsApp.
// O EmbeddedSignupButton processa tudo via popup + SDK sem redirect.
//
// Esta página continua sendo necessária APENAS para:
//   1. Callback de login social simples via Supabase Auth (sem code Meta)
//   2. Fallback de erro caso o redirect aconteça inesperadamente

import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function FacebookCallbackPage() {
  const [status, setStatus] = useState<{
    message: string;
    type: 'loading' | 'success' | 'error';
  }>({ message: 'Processando autenticação...', type: 'loading' });

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
      addLog('🚀 Verificando tipo de callback...');

      const urlParams      = new URLSearchParams(window.location.search);
      const code           = urlParams.get('code');
      const error          = urlParams.get('error');
      const errorDesc      = urlParams.get('error_description');

      // Erro OAuth explícito
      if (error) {
        addLog(`❌ Erro OAuth: ${error}`);
        throw new Error(errorDesc || error);
      }

      // Sem code = login simples do Supabase Auth
      if (!code) {
        addLog('✅ Callback de login Supabase');
        if (window.opener && !window.opener.closed) {
          window.opener.location.reload();
          setStatus({ message: 'Login realizado com sucesso!', type: 'success' });
          setTimeout(() => window.close(), 1000);
        } else {
          window.location.href = '/dashboard';
        }
        return;
      }

      // Se chegou aqui com um code Meta, é um redirect inesperado.
      // Com Embedded Signup v4 isso não deveria acontecer — mas tratamos
      // para não deixar o usuário preso numa tela em branco.
      addLog('⚠️ Redirect com code Meta detectado (fluxo legado)');
      addLog('ℹ️ Com Embedded Signup v4, use o botão de conexão no dashboard.');
      setStatus({
        message: 'Use o botão "Conectar WhatsApp" no painel de atendimentos para conectar sua conta.',
        type: 'error',
      });

    } catch (err: any) {
      addLog(`❌ Erro: ${err.message}`);
      setStatus({ message: err.message, type: 'error' });
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
          {status.type === 'error'    && 'Atenção'}
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
