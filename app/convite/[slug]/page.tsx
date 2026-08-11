import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ConvitePublico from '@/components/conviteria/ConvitePublico';
import { buscarEventoPublicado } from '@/lib/conviteria/servidor';
import { familiasGoogle } from '@/lib/conviteria/tokens';

// Revalida a cada 5 min: convite muda pouco depois de publicado, e cache
// longo evita que uma noite de divulgacao vire custo de banco.
export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const evento = await buscarEventoPublicado(slug);
  if (!evento) return { title: 'Convite não encontrado' };

  const { cfg } = evento;
  const titulo = cfg.anfitrioes?.exibicao ?? 'Nosso convite';
  const descricao = [cfg.evento?.dataExtenso, cfg.local?.nome]
    .filter(Boolean).join(' · ');

  return {
    title: titulo,
    description: descricao,
    openGraph: {
      title: titulo,
      description: descricao,
      images: cfg.midia?.fotoPrincipal ? [cfg.midia.fotoPrincipal] : undefined,
      type: 'website',
    },
    // Convite e privado por natureza: nao deve aparecer em busca.
    robots: { index: false, follow: false },
  };
}

export default async function PaginaConvite({ params }: Props) {
  const { slug } = await params;
  const evento = await buscarEventoPublicado(slug);
  if (!evento) notFound();

  // So as familias do par escolhido. Carregar as 18 de uma vez custaria
  // varios segundos no 4G, que e como o convidado abre.
  const familias = familiasGoogle(evento.cfg.fonteId)
    .map((f) => `family=${f.replace(/ /g, '+')}:wght@300;400;500;600;700`)
    .join('&');

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href={`https://fonts.googleapis.com/css2?${familias}&display=swap`}
      />
      <ConvitePublico cfg={evento.cfg} />
    </>
  );
}
