import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import MemoriasPublicas from '@/components/conviteria/memorias/MemoriasPublicas';
import { buscarEventoMemoriasPublicado } from '@/lib/conviteria/memorias-servidor';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const evento = await buscarEventoMemoriasPublicado(slug);
  return {
    title: evento ? `Memórias · ${evento.titulo}` : 'Memórias do Evento',
    description: evento ? `Compartilhe fotos e vídeos com ${evento.titulo}.` : 'Álbum colaborativo Convite IA.',
    robots: { index: false, follow: false },
    icons: { icon: '/brands/convite/favicon.png' },
  };
}

export default async function PaginaMemorias({ params }: Props) {
  const { slug } = await params;
  const evento = await buscarEventoMemoriasPublicado(slug);
  if (!evento) notFound();
  return <MemoriasPublicas slug={slug} />;
}
