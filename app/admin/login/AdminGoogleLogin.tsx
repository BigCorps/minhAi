'use client';

import { useMemo, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

import { createClient } from '@/lib/supabase-browser';

type Props = {
  errorCode?: string | null;
};

function errorMessage(errorCode?: string | null) {
  switch (errorCode) {
    case 'not_allowed':
      return 'Esta conta Google não possui permissão para acessar o painel administrativo.';
    case 'google_required':
      return 'O painel administrativo aceita somente autenticação com Google.';
    case 'configuration_error':
      return 'A estrutura administrativa ainda não está disponível. Confira o SQL final da implementação.';
    case 'auth_error':
      return 'Não foi possível concluir a autenticação com Google.';
    case 'callback_error':
      return 'O login foi iniciado, mas não foi possível concluir a validação administrativa.';
    default:
      return null;
  }
}

export default function AdminGoogleLogin({ errorCode }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const remoteError = errorMessage(errorCode);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setLocalError(null);

    try {
      const hostname = window.location.hostname.toLowerCase();
      const callbackPath =
        hostname === 'admin.minhai.app'
          ? '/auth/callback'
          : '/admin/auth/callback';

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${callbackPath}`,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error('[platform-admin] Falha ao iniciar Google OAuth:', error);
      setLocalError('Não foi possível iniciar o login com Google.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center justify-center">
        <section className="w-full rounded-3xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="mb-7 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-400 text-slate-950">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-lime-300">
                BigCorps
              </p>
              <h1 className="text-2xl font-bold">Admin minhAi</h1>
            </div>
          </div>

          <p className="mb-6 text-sm leading-6 text-slate-300">
            Área interna e restrita. O acesso é liberado somente para a conta
            administrativa cadastrada e a autenticação é exclusivamente pelo Google.
          </p>

          {(remoteError || localError) && (
            <div className="mb-5 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {localError || remoteError}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-4 py-3.5 font-bold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span
              aria-hidden="true"
              className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-sm font-black text-blue-600"
            >
              G
            </span>
            {loading ? 'Abrindo Google...' : 'Continuar com Google'}
          </button>

          <p className="mt-5 text-center text-xs text-slate-500">
            Nenhum login por senha, magic link ou outro provedor é oferecido nesta área.
          </p>
        </section>
      </div>
    </main>
  );
}
