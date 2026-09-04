import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AlbumMemorias from '@/components/conviteria/memorias/AlbumMemorias';
import { buscarEventoMemoriasPublicado } from '@/lib/conviteria/memorias-servidor';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const evento = await buscarEventoMemoriasPublicado(slug);
  return {
    title: evento ? `Álbum · ${evento.titulo}` : 'Álbum do Evento',
    description: evento ? `Slideshow de ${evento.titulo}.` : 'Slideshow de Memórias do Convite IA.',
    robots: { index: false, follow: false },
    icons: { icon: '/brands/convite/favicon.png' },
  };
}

export default async function PaginaAlbum({ params }: Props) {
  const { slug } = await params;
  const evento = await buscarEventoMemoriasPublicado(slug);
  if (!evento) notFound();
  return <AlbumMemorias slug={slug} />;
}
