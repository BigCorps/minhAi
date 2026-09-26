import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import MidiaAdvertiseFlow from '@/components/midia/MidiaAdvertiseFlow';
import { getPublicMidiaScreen } from '@/lib/midia/server';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string; code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, code } = await params;
  const context = await getPublicMidiaScreen(slug, code);
  if (!context) return { title: 'Tela indisponível · Midia.Pro', robots: { index: false, follow: false } };
  return {
    title: `Anuncie em ${context.screen.name} · Midia.Pro`,
    description: `Crie uma campanha para a tela ${context.screen.name} de ${context.publisher.display_name}.`,
    robots: { index: false, follow: false },
    icons: { icon: '/brands/midia/icon-192.png', apple: '/brands/midia/apple-touch-icon.png' },
  };
}

export default async function MidiaAdvertisePage({ params }: Props) {
  const { slug, code } = await params;
  const context = await getPublicMidiaScreen(slug, code);
  if (!context) notFound();
  return <MidiaAdvertiseFlow slug={context.publisher.slug} code={context.screen.public_code} />;
}
