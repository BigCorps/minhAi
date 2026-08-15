'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, ExternalLink, Loader2, LogOut, Pencil, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import RendaBackground from '@/components/conviteria/RendaBackground';
import AcoesConvite from '@/components/conviteria/AcoesConvite';
import SuporteWhatsapp from '@/components/conviteria/SuporteWhatsapp';
import RodapeMarca from '@/components/conviteria/RodapeMarca';
import SaldoSaque from '@/components/conviteria/SaldoSaque';
import PlanoMensalCard from '@/components/conviteria/PlanoMensalCard';
import PlanoStatusHeader from '@/components/conviteria/PlanoStatusHeader';
import RecadosPainel from '@/components/conviteria/RecadosPainel';
import PresencasPainel from '@/components/conviteria/PresencasPainel';
import CompartilharWhatsappPainel from '@/components/conviteria/CompartilharWhatsappPainel';

const cor = {
  fora: '#ffffff',
  acento: '#c06078',
  acentoTexto: '#a04a63',
  tinta: '#40232c',
  tintaSuave: '#7c5560',
  blocoTexto: '#fff5f8',
};

interface Convite {
  id: string;
  slug: string;
  titulo: string;
  dataExtenso: string | null;
  publicado: boolean;
  url: string;
}

export default function PainelPage() {
  const [carregando, setCarregando] = useState(true);
  const [convites, setConvites] = useState<Convite[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [nome, setNome] = useState('');

  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const carregar = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const acesso = data.session?.access_token;

    if (!acesso) {
      router.replace('/convite/entrar');
      return;
    }

    setNome(
      (data.session?.user.user_metadata?.name as string) ||
      data.session?.user.email ||
      ''
    );

    try {
      const r = await fetch('/api/conviteria/meus-convites', {
        headers: { Authorization: `Bearer ${acesso}` },
      });
      const d = await r.json();

      if (!r.ok) throw new Error(d?.erro ?? 'Falha ao carregar.');
      setConvites(d.convites ?? []);
    } catch (e: any) {
      setErro(e?.message ?? 'Não foi possível carregar seus convites.');
    } finally {
      setCarregando(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function sair() {
    await supabase.auth.signOut();
    router.replace('/convite');
  }

  return (
    <main className="min-h-screen flex flex-col px-4 py-8">
      <RendaBackground />

      <div className="mx-auto w-full max-w-2xl flex-1">
        <header className="flex items-center justify-between gap-3 mb-8">
          <Link href="/convite" className="flex min-w-0 items-center gap-2">
            <Image
              src="/brands/convite/icone-512.png"
              alt="Convite IA"
              width={36}
              height={36}
              className="rounded-full"
            />
            <span className="hidden font-bold sm:inline" style={{ color: cor.acentoTexto }}>
              Convite IA
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <PlanoStatusHeader />
            <SuporteWhatsapp assunto="Preciso de suporte na ConviteIA" />

            <button
              type="button"
              onClick={sair}
              className="flex items-center gap-2 rounded-full border px-3 py-2 text-sm"
              style={{ borderColor: cor.acento + '44', color: cor.tintaSuave }}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </header>

        {nome && (
          <p className="mb-6 text-sm" style={{ color: cor.tintaSuave }}>
            Olá, <strong style={{ color: cor.tinta }}>{nome}</strong>
          </p>
        )}

        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold" style={{ color: cor.tinta }}>
            Meus convites
          </h1>

          <Link
            href="/convite/criar"
            className="flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold"
            style={{ backgroundColor: cor.acento, color: cor.blocoTexto }}
          >
            <Plus className="h-4 w-4" />
            Novo
          </Link>
        </div>

        {carregando && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: cor.acento }} />
          </div>
        )}

        {erro && (
          <p className="py-8 text-center text-sm" style={{ color: cor.acentoTexto }}>
            {erro}
          </p>
        )}

        {!carregando && !erro && convites.length === 0 && (
          <div
            className="rounded-2xl border px-6 py-12 text-center"
            style={{ backgroundColor: cor.fora, borderColor: cor.acento + '33' }}
          >
            <p className="mb-2 font-medium" style={{ color: cor.tinta }}>
              Você ainda não criou nenhum convite.
            </p>

            <p className="mb-6 text-sm" style={{ color: cor.tintaSuave }}>
              Leva alguns minutos, e você só paga quando publicar.
            </p>

            <Link
              href="/convite/criar"
              className="inline-flex rounded-full px-6 py-3 font-semibold"
              style={{ backgroundColor: cor.acento, color: cor.blocoTexto }}
            >
              Criar meu convite
            </Link>
          </div>
        )}

        <ul className="space-y-3">
          {convites.map((c) => (
            <li
              key={c.id}
              className="rounded-2xl border px-5 py-4"
              style={{ backgroundColor: cor.fora, borderColor: cor.acento + '33' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold" style={{ color: cor.tinta }}>
                    {c.titulo}
                  </p>

                  {c.dataExtenso && (
                    <p className="text-sm" style={{ color: cor.tintaSuave }}>
                      {c.dataExtenso}
                    </p>
                  )}

                  <p className="mt-1 truncate text-xs" style={{ color: cor.tintaSuave }}>
                    {c.slug}.conviteia.com
                  </p>
                </div>

                <div className="flex flex-shrink-0 items-center gap-4">
                  <Link
                    href={`/convite/editar/${c.id}`}
                    className="flex items-center gap-1.5 text-sm font-medium"
                    style={{ color: cor.tintaSuave }}
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Link>

                  {c.publicado ? (
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm font-medium"
                      style={{ color: cor.acentoTexto }}
                    >
                      Ver
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : (
                    <Link
                      href={`/convite/pagar?evento=${c.id}`}
                      className="flex items-center gap-1.5 text-sm font-medium"
                      style={{ color: cor.acentoTexto }}
                    >
                      <Clock className="h-4 w-4" />
                      Publicar
                    </Link>
                  )}
                </div>
              </div>

              {c.publicado && (
                <>
                  <div className="mt-3 border-t pt-3" style={{ borderColor: cor.acento + '22' }}>
                    <AcoesConvite url={c.url} slug={c.slug} />
                  </div>

                  <CompartilharWhatsappPainel
                    eventoId={c.id}
                    titulo={c.titulo}
                    url={c.url}
                  />

                  <PresencasPainel eventoId={c.id} />
                  <SaldoSaque eventoId={c.id} />
                  <RecadosPainel eventoId={c.id} />
                </>
              )}
            </li>
          ))}
        </ul>

        <div id="plano-mensal" className="mt-8 scroll-mt-6">
          <PlanoMensalCard />
        </div>
      </div>

      <RodapeMarca />
    </main>
  );
}
