import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ConvitePublico from '@/components/conviteria/ConvitePublico';
import HeaderDono from '@/components/conviteria/HeaderDono';
import { buscarEventoPublicado } from '@/lib/conviteria/servidor';
import { familiasDaPagina, urlGoogleFonts } from '@/lib/conviteria/tokens';
import { familiaLacre } from '@/components/conviteria/LacreArte';

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
    // Precisa repetir os icones: no App Router o metadata do filho SUBSTITUI o
    // do pai, nao mescla. Sem isto o subdominio do convite ficava sem favicon
    // nenhum, herdando o do app raiz (minhAi) ou nada.
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
    // Convite e privado por natureza: nao deve aparecer em busca.
    robots: { index: false, follow: false },
  };
}

export default async function PaginaConvite({ params }: Props) {
  const { slug } = await params;
  const evento = await buscarEventoPublicado(slug);
  if (!evento) notFound();

  // So as familias que esta pagina usa: o par tipografico e a do carimbo do
  // lacre. Carregar as 18 de uma vez custaria varios segundos no 4G, que e
  // como o convidado abre.
  //
  // A do lacre entrava de fora ate agora, e era o bug do carimbo mudando de
  // navegador para navegador: sem a fonte baixada, a pilha
  // `'Pinyon Script', cursive` caia no `cursive`, que cada sistema resolve
  // para uma fonte diferente. Na maioria dos convites nao custa download
  // extra, porque o lacre costuma repetir a fonte do par.
  //
  // urlGoogleFonts omite `wght` nas familias de peso unico (Pinyon Script,
  // Great Vibes, Parisienne, Italianno, Sacramento, Archivo Black). Pedir um
  // peso inexistente fazia a API css2 recusar o request INTEIRO com 400, e a
  // pagina caia para a fonte do sistema sem nenhum aviso.
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
      {/* Renderizado sempre, mas o componente nao desenha nada para quem nao
          e o dono. O convidado recebe HTML com um <script> que checa sessao e
          termina em nada — barato, e evita duas versoes da pagina. */}
      <HeaderDono eventoId={evento.id} />
      <ConvitePublico cfg={evento.cfg} eventoId={evento.id} />
    </>
  );
}
