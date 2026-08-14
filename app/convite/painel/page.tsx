'use client';

// app/convite/painel/page.tsx
//
// Destino do login. Existia um buraco aqui: depois de entrar, o usuario caia
// em /convite — visualmente identica a deslogada — e concluia que o login
// tinha falhado. Mesmo papel do /consultatec/dashboard.

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-browser';
import { Loader2, Plus, ExternalLink, Clock, LogOut, Pencil } from 'lucide-react';
import RendaBackground from '@/components/conviteria/RendaBackground';
import AcoesConvite from '@/components/conviteria/AcoesConvite';
import SuporteWhatsapp from '@/components/conviteria/SuporteWhatsapp';
import RodapeMarca from '@/components/conviteria/RodapeMarca';
import SaldoSaque from '@/components/conviteria/SaldoSaque';
import PlanoMensalCard from '@/components/conviteria/PlanoMensalCard';
import RecadosPainel from '@/components/conviteria/RecadosPainel';

const cor = {
  fora: '#ffffff',
  papel: '#fdf0f3',
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
  const [nome, setNome] = useState<string>('');

  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const carregar = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const acesso = data.session?.access_token;

    // Sem sessao nao adianta mostrar tela vazia: manda entrar.
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

  useEffect(() => { void carregar(); }, [carregar]);

  async function sair() {
    await supabase.auth.signOut();
    router.replace('/convite');
  }

  return (
    <main className="min-h-screen flex flex-col px-4 py-8">
      {/* Sem backgroundColor no <main>: o RendaBackground e `-z-10` e ficaria
          ATRAS do fundo do proprio elemento. Era isso que escondia a textura —
          quem pinta o papel e o SVG. */}
      <RendaBackground />

      {/* `flex-1` empurra o rodape para o fim da viewport quando ha poucos
          convites. Sem isso ele encosta no ultimo cartao e parece parte da
          lista. */}
      <div className="mx-auto w-full max-w-2xl flex-1">
        <header className="flex items-center justify-between mb-8">
          <Link href="/convite" className="flex items-center gap-2">
            <Image
              src="/brands/convite/icone-512.png"
              alt="Convite IA"
              width={36}
              height={36}
              className="rounded-full"
            />
            <span className="font-bold" style={{ color: cor.acentoTexto }}>
              Convite IA
            </span>
          </Link>

          <div className="flex items-center gap-2">
          <SuporteWhatsapp assunto="Preciso de suporte na ConviteIA" />
          <button
            type="button"
            onClick={sair}
            className="flex items-center gap-2 text-sm px-3 py-2 rounded-full border"
            style={{ borderColor: cor.acento + '44', color: cor.tintaSuave }}
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
          </div>
        </header>

        {nome && (
          <p className="mb-6 text-sm" style={{ color: cor.tintaSuave }}>
            Olá, <strong style={{ color: cor.tinta }}>{nome}</strong>
          </p>
        )}

        <PlanoMensalCard />

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold" style={{ color: cor.tinta }}>
            Meus convites
          </h1>
          <Link
            href="/convite/criar"
            className="flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-sm"
            style={{ backgroundColor: cor.acento, color: cor.blocoTexto }}
          >
            <Plus className="w-4 h-4" />
            Novo
          </Link>
        </div>

        {carregando && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: cor.acento }} />
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
            <p className="text-sm mb-6" style={{ color: cor.tintaSuave }}>
              Leva alguns minutos, e você só paga quando publicar.
            </p>
            <Link
              href="/convite/criar"
              className="inline-flex px-6 py-3 rounded-full font-semibold"
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
                  <p className="font-semibold truncate" style={{ color: cor.tinta }}>
                    {c.titulo}
                  </p>
                  {c.dataExtenso && (
                    <p className="text-sm" style={{ color: cor.tintaSuave }}>
                      {c.dataExtenso}
                    </p>
                  )}
                  <p className="text-xs mt-1 truncate" style={{ color: cor.tintaSuave }}>
                    {c.slug}.conviteia.com
                  </p>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  {/* Editar aparece nos dois estados: nao ha motivo para
                      impedir ajuste antes de pagar. */}
                  <Link
                    href={`/convite/editar/${c.id}`}
                    className="flex items-center gap-1.5 text-sm font-medium"
                    style={{ color: cor.tintaSuave }}
                  >
                    <Pencil className="w-4 h-4" /> Editar
                  </Link>

                  {c.publicado ? (
                    <a
                      href={c.url}
                      className="flex items-center gap-1.5 text-sm font-medium"
                      style={{ color: cor.acentoTexto }}
                    >
                      Ver <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : (
                    <Link
                      href={`/convite/pagar?evento=${c.id}`}
                      className="flex items-center gap-1.5 text-sm font-medium"
                      style={{ color: cor.acentoTexto }}
                    >
                      <Clock className="w-4 h-4" /> Publicar
                    </Link>
                  )}
                </div>
              </div>

              {/* Compartilhar so faz sentido depois de publicado: antes disso o
                  link responde 404 e o QR levaria o convidado a lugar nenhum. */}
              {c.publicado && (
                <>
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: cor.acento + '22' }}>
                    <AcoesConvite url={c.url} slug={c.slug} />
                  </div>
                  <SaldoSaque eventoId={c.id} />
                  <RecadosPainel eventoId={c.id} />
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

      <RodapeMarca />
    </main>
  );
}
