'use client';

import { useEffect, useState } from 'react';
import { LogOut, Loader2, QrCode, ShieldCheck } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import CheckinPainel from '@/components/conviteria/gestao/CheckinPainel';
import estilos from '@/components/conviteria/gestao/gestao-light.module.css';

export default function CheckinAcessoCliente({ eventoId }: { eventoId: string }) {
  const [supabase] = useState(() => createClient());
  const [token, setToken] = useState('');
  const [carregando, setCarregando] = useState(true);
  const params = useSearchParams();
  const linkInvalido = params.get('erro') === 'link';

  useEffect(() => {
    let ativo = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return;
      setToken(data.session?.access_token ?? '');
      setCarregando(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      if (!ativo) return;
      setToken(sessao?.access_token ?? '');
      setCarregando(false);
    });

    return () => {
      ativo = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  async function sair() {
    await supabase.auth.signOut();
    setToken('');
  }

  if (carregando) {
    return (
      <main className={`${estilos.root} grid min-h-screen place-items-center bg-[#fff9fb] text-[#40232c]`}>
        <Loader2 className="h-8 w-8 animate-spin text-[#c06078]" />
      </main>
    );
  }

  if (linkInvalido || !token) {
    return (
      <main className={`${estilos.root} min-h-screen bg-[#fff9fb] px-4 py-10 text-[#40232c]`}>
        <div className="mx-auto max-w-lg rounded-3xl border border-[#c0607833] bg-white p-7 text-center shadow-sm">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#fff5f8] text-[#a04a63]">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-xl font-semibold">Acesso ao check-in</h1>
          <p className="mt-2 text-sm leading-6 text-[#7c5560]">
            {linkInvalido
              ? 'Este link de acesso expirou, já foi usado ou não é mais válido.'
              : 'Não há uma sessão de check-in ativa neste aparelho.'}
          </p>
          <p className="mt-3 text-sm leading-6 text-[#7c5560]">
            Peça ao anfitrião para reenviar o acesso pela Gestão do Evento.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className={`${estilos.root} min-h-screen bg-[#fff9fb] px-4 py-6 text-[#40232c]`}>
      <div className="mx-auto max-w-5xl">
        <header className="mb-5 flex items-start justify-between gap-3 rounded-2xl border border-[#c0607833] bg-white p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#fff5f8] text-[#a04a63]">
              <QrCode className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-semibold">Check-in do evento</h1>
              <p className="mt-1 text-sm text-[#7c5560]">
                Acesso restrito à recepção. Nenhuma outra área da gestão é exibida aqui.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void sair()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#c0607833] bg-white px-3 py-2 text-sm font-semibold text-[#7c5560]"
          >
            <LogOut className="h-4 w-4" />Sair
          </button>
        </header>

        <CheckinPainel eventoId={eventoId} token={token} somenteOperacao />
      </div>
    </main>
  );
}
