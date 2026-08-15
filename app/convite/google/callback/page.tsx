'use client';

import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function GoogleCallbackPage() {
  const [status, setStatus] = useState<
    'loading' | 'success' | 'cancelled' | 'error'
  >('loading');

  const [mensagem, setMensagem] = useState(
    'Concluindo conexão com o Google…'
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const recebido = params.get('status');
    const detalhe = params.get('message')?.trim() ?? '';

    const finalStatus =
      recebido === 'success' ||
      recebido === 'cancelled' ||
      recebido === 'error'
        ? recebido
        : 'error';

    setStatus(finalStatus);

    if (finalStatus === 'success') {
      setMensagem('Google conectado com sucesso.');
    } else if (finalStatus === 'cancelled') {
      setMensagem(
        detalhe || 'A conexão com o Google foi cancelada.'
      );
    } else {
      setMensagem(
        detalhe || 'Não foi possível concluir a conexão Google.'
      );
    }

    const type =
      finalStatus === 'success'
        ? 'conviteia-google-auth-success'
        : finalStatus === 'cancelled'
          ? 'conviteia-google-auth-cancelled'
          : 'conviteia-google-auth-error';

    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          {
            type,
            message: detalhe || null,
          },
          window.location.origin
        );
      }
    } catch {
      // O painel também detecta o fechamento do popup e atualiza sozinho.
    }

    const fechar = window.setTimeout(() => {
      window.close();
    }, finalStatus === 'success' ? 350 : 900);

    return () => window.clearTimeout(fechar);
  }, []);

  const sucesso = status === 'success';
  const carregando = status === 'loading';

  return (
    <main
      className="grid min-h-screen place-items-center px-5 py-8"
      style={{ backgroundColor: '#fff5f8' }}
    >
      <section
        className="w-full max-w-sm rounded-3xl border bg-white px-6 py-8 text-center shadow-sm"
        style={{ borderColor: '#c0607833' }}
      >
        <div
          className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full"
          style={{ backgroundColor: sucesso ? '#eef8f2' : '#fdf0f3' }}
        >
          {carregando ? (
            <Loader2
              className="h-7 w-7 animate-spin"
              style={{ color: '#d86090' }}
            />
          ) : sucesso ? (
            <CheckCircle2
              className="h-7 w-7"
              style={{ color: '#2e7d55' }}
            />
          ) : (
            <XCircle
              className="h-7 w-7"
              style={{ color: '#a04a63' }}
            />
          )}
        </div>

        <h1
          className="text-xl font-semibold"
          style={{ color: '#40232c' }}
        >
          {carregando
            ? 'Conectando Google'
            : sucesso
              ? 'Google conectado'
              : 'Conexão Google'}
        </h1>

        <p
          className="mx-auto mt-2 max-w-xs text-sm leading-6"
          style={{ color: '#7c5560' }}
        >
          {mensagem}
        </p>

        <p
          className="mt-4 text-[11px]"
          style={{ color: '#9b7b84' }}
        >
          Esta janela deve fechar automaticamente.
        </p>

        <button
          type="button"
          onClick={() => window.close()}
          className="mt-5 rounded-full px-5 py-2.5 text-xs font-semibold text-white"
          style={{ backgroundColor: '#d86090' }}
        >
          Fechar janela
        </button>
      </section>
    </main>
  );
}
