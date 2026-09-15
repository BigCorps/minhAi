import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Clock3 } from 'lucide-react';
import ConvitePublico from '@/components/conviteria/ConvitePublico';
import HeaderDono from '@/components/conviteria/HeaderDono';
import TesteConviteBanner from '@/components/conviteria/TesteConviteBanner';
import {
  buscarEventoPublicado,
  buscarSituacaoEventoPorSlug,
} from '@/lib/conviteria/servidor';
import { familiasDaPagina, urlGoogleFonts } from '@/lib/conviteria/tokens';
import { familiaLacre } from '@/lib/conviteria/fontesLacre';

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const evento = await buscarEventoPublicado(slug);
  if (!evento) return { title: 'Convite não encontrado', robots: { index: false, follow: false } };

  const { cfg } = evento;
  const titulo = cfg.anfitrioes?.exibicao ?? 'Nosso convite';
  const descricao = [cfg.evento?.dataExtenso, cfg.local?.nome]
    .filter(Boolean).join(' · ');

  return {
    title: titulo,
    description: descricao,
    icons: {
      icon: '/brands/convite/favicon.png',
      shortcut: '/brands/convite/favicon.png',
      apple: '/brands/convite/favicon.png',
    },
    openGraph: {
      title: titulo,
      description: descricao,
      images: cfg.midia?.fotoPrincipal ? [cfg.midia.fotoPrincipal] : undefined,
      type: 'website',
    },
    robots: { index: false, follow: false },
  };
}

function TesteExpirado({ eventoId }: { eventoId: string }) {
  return (
    <main className="min-h-screen grid place-items-center bg-[#fff9fb] px-5 text-center text-[#40232c]">
      <div className="w-full max-w-md rounded-3xl border border-[#c0607833] bg-white p-7 shadow-xl">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#fff0f4] text-[#a04a63]">
          <Clock3 className="h-6 w-6" />
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-[.16em] text-[#a04a63]">ConviteIA · teste encerrado</p>
        <h1 className="mt-2 text-2xl font-semibold">Este período de teste terminou</h1>
        <p className="mt-3 text-sm leading-6 text-[#7c5560]">O convite continua salvo para o responsável e volta a este mesmo endereço após a publicação definitiva.</p>
        <a
          href={`https://conviteia.com/convite/pagar?evento=${encodeURIComponent(eventoId)}`}
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#c06078] px-5 py-3 font-semibold text-white"
        >
          Publicar convite
        </a>
      </div>
    </main>
  );
}

export default async function PaginaConvite({ params }: Props) {
  const { slug } = await params;
  const evento = await buscarEventoPublicado(slug);

  if (!evento) {
    const situacao = await buscarSituacaoEventoPorSlug(slug);
    if (situacao?.estado === 'teste_expirado') {
      return <TesteExpirado eventoId={situacao.eventoId} />;
    }
    notFound();
  }

  const hrefFontes = urlGoogleFonts(
    familiasDaPagina(
      evento.cfg.fonteId,
      familiaLacre(evento.cfg.lacreAjuste?.fonte)
    )
  );

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href={hrefFontes} />
      {evento.modoTeste && evento.testeExpiraEm && (
        <TesteConviteBanner eventoId={evento.id} expiraEm={evento.testeExpiraEm} />
      )}
      <HeaderDono eventoId={evento.id} />
      <ConvitePublico cfg={evento.cfg} eventoId={evento.id} modoTeste={evento.modoTeste} />
    </>
  );
}
